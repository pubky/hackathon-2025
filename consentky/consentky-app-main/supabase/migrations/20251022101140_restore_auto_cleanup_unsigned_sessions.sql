/*
  # Restore Auto-Cleanup of Unsigned Pending Sessions

  ## Overview
  This migration restores the automatic cleanup mechanism for unsigned pending sessions
  that was lost when the consent_sessions table was recreated with text IDs.
  It ensures sessions missing signatures are automatically deleted after 10 minutes.

  ## Changes

  1. **Fix cleanup_unsigned_sessions() Function**
     - Correct logic to delete sessions with AT LEAST ONE missing signature
     - Changed from: a_signature IS NULL AND b_signature IS NULL
     - Changed to: a_signature IS NULL OR b_signature IS NULL
     - Maintains 10-minute threshold
     - Returns count of deleted sessions for monitoring

  2. **Restore auto_cleanup_old_sessions() Trigger Function**
     - Recreates the trigger function that was lost during table recreation
     - Calls cleanup_unsigned_sessions() after each insert
     - Non-blocking operation that doesn't affect insert performance

  3. **Recreate trigger_cleanup_old_sessions Trigger**
     - Fires AFTER INSERT on consent_sessions
     - Executes cleanup automatically whenever new sessions are created
     - FOR EACH STATEMENT (once per insert, not per row)

  4. **Add Scheduled Cleanup Job (pg_cron)**
     - Backup mechanism that runs every 5 minutes
     - Ensures cleanup happens even if no new sessions are created
     - Handles edge cases where trigger-based cleanup might be delayed
     - Gracefully handles missing pg_cron extension

  5. **Create Manual Cleanup Function**
     - Allows explicit cleanup invocation from application code
     - Useful for testing and debugging
     - Can be called via Supabase client
     - Returns number of sessions deleted

  ## Behavior

  Sessions are automatically deleted if ALL conditions are met:
  - Status is 'pending'
  - Created more than 10 minutes ago
  - Missing at least one signature (a_signature IS NULL OR b_signature IS NULL)

  Protected sessions (NEVER deleted):
  - Fully signed sessions (both signatures present)
  - Active sessions
  - Expired sessions
  - Sessions younger than 10 minutes

  ## Cleanup Mechanisms (Redundancy)

  1. **Trigger-based** (primary): Runs after each new session insert
  2. **Scheduled** (backup): Runs every 5 minutes via pg_cron
  3. **Manual** (on-demand): Can be invoked from application code

  ## Security

  - All functions run with SECURITY DEFINER to bypass RLS
  - Only deletes unsigned pending sessions (safe to remove)
  - No user input, preventing injection attacks
  - Preserves all signed sessions for audit trail

  ## Performance

  - Uses existing index on created_at and status
  - Cleanup is lightweight and non-blocking
  - Only targets small subset of pending sessions
  - Minimal impact on database operations
*/

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS cleanup_unsigned_sessions();

-- 1. Fix the cleanup function to delete sessions with AT LEAST ONE missing signature
CREATE OR REPLACE FUNCTION cleanup_unsigned_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete sessions that are:
  -- 1. Status is 'pending'
  -- 2. Created more than 10 minutes ago
  -- 3. Missing at least one signature (changed from AND to OR)
  DELETE FROM consent_sessions
  WHERE status = 'pending'
    AND created_at < now() - interval '10 minutes'
    AND (a_signature IS NULL OR b_signature IS NULL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger function that calls the cleanup
CREATE OR REPLACE FUNCTION auto_cleanup_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Perform cleanup (non-blocking)
  PERFORM cleanup_unsigned_sessions();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop and recreate the cleanup trigger
DROP TRIGGER IF EXISTS trigger_cleanup_old_sessions ON consent_sessions;

CREATE TRIGGER trigger_cleanup_old_sessions
  AFTER INSERT ON consent_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_cleanup_old_sessions();

-- 4. Setup pg_cron scheduled job as backup (runs every 5 minutes)
DO $$
BEGIN
  -- Try to enable pg_cron extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron extension requires superuser privileges, skipping';
  WHEN undefined_file THEN
    RAISE NOTICE 'pg_cron extension not available in this database';
  WHEN others THEN
    RAISE NOTICE 'Could not enable pg_cron: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Remove any existing job first
  PERFORM cron.unschedule('cleanup-unsigned-sessions');
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping scheduled cleanup';
  WHEN others THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- Schedule the cleanup job to run every 5 minutes
DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-unsigned-sessions',
    '*/5 * * * *',
    'SELECT cleanup_unsigned_sessions()'
  );
  RAISE NOTICE 'Scheduled cleanup job created successfully';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, relying on trigger-based cleanup only';
  WHEN others THEN
    RAISE NOTICE 'Failed to schedule cleanup job: %. Trigger-based cleanup will still work.', SQLERRM;
END $$;

-- 5. Create a manual cleanup function that can be called from application
CREATE OR REPLACE FUNCTION run_manual_cleanup()
RETURNS json AS $$
DECLARE
  deleted_count integer;
BEGIN
  SELECT cleanup_unsigned_sessions() INTO deleted_count;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for manual cleanup
GRANT EXECUTE ON FUNCTION run_manual_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION run_manual_cleanup() TO anon;

-- Create a function to check cleanup status (diagnostic tool)
CREATE OR REPLACE FUNCTION check_cleanup_status()
RETURNS json AS $$
DECLARE
  pending_unsigned_count integer;
  pending_unsigned_old_count integer;
BEGIN
  -- Count all pending unsigned sessions
  SELECT COUNT(*) INTO pending_unsigned_count
  FROM consent_sessions
  WHERE status = 'pending'
    AND (a_signature IS NULL OR b_signature IS NULL);
  
  -- Count pending unsigned sessions older than 10 minutes
  SELECT COUNT(*) INTO pending_unsigned_old_count
  FROM consent_sessions
  WHERE status = 'pending'
    AND created_at < now() - interval '10 minutes'
    AND (a_signature IS NULL OR b_signature IS NULL);
  
  RETURN json_build_object(
    'pending_unsigned_total', pending_unsigned_count,
    'pending_unsigned_old', pending_unsigned_old_count,
    'should_be_deleted', pending_unsigned_old_count,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for status check
GRANT EXECUTE ON FUNCTION check_cleanup_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_cleanup_status() TO anon;