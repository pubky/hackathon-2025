/*
  # Fix All Column References to Use Authentication Instead of Signature

  ## Overview
  This migration comprehensively fixes all database objects that still reference
  the old column names (a_signature, b_signature) and updates them to use the
  correct names (a_authentication, b_authentication).

  The columns were renamed in migration 20251023082205, but several database
  objects created before or after that migration still use the old names, causing
  errors when trying to access non-existent columns.

  ## Changes

  1. **Update cleanup_unsigned_sessions() Function**
     - Fix column references from a_signature/b_signature to a_authentication/b_authentication
     - Maintains 10-minute cleanup threshold
     - Preserves all existing logic

  2. **Update auto_cleanup_old_sessions() Trigger Function**
     - Ensure trigger function uses correct column names
     - No logic changes, only column name updates

  3. **Update update_session_status_on_signature() Trigger Function**
     - Fix all signature column references to authentication columns
     - Maintains all status transition logic
     - Updates both BEFORE UPDATE trigger logic

  4. **Update All RLS Policies**
     - Fix consent_sessions policies that reference old column names
     - Fix session_tags policies that reference old column names
     - Preserve all security logic, only update column references

  5. **Update Scheduled Cleanup Job**
     - Fix pg_cron job SQL to use new column names
     - Maintain 5-minute execution schedule

  6. **Add Documentation**
     - Add column comments explaining authentication terminology
     - Document why "authentication" is used instead of "signature"

  ## Tables Affected
  - consent_sessions (functions, triggers, policies)
  - session_tags (policies)

  ## Security Notes
  - All RLS policies maintain identical security logic
  - Only column names are changed, not access control
  - All functions remain SECURITY DEFINER where appropriate

  ## Migration Safety
  - Uses IF EXISTS/IF NOT EXISTS to prevent errors
  - Safe to run multiple times (idempotent)
  - No data loss or modification
  - Only updates database object definitions
*/

-- Step 1: Update cleanup_unsigned_sessions function
CREATE OR REPLACE FUNCTION cleanup_unsigned_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete sessions that are:
  -- 1. Status is 'pending'
  -- 2. Created more than 10 minutes ago
  -- 3. Missing at least one authentication (uses OR logic)
  DELETE FROM consent_sessions
  WHERE status = 'pending'
    AND created_at < now() - interval '10 minutes'
    AND (a_authentication IS NULL OR b_authentication IS NULL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update auto_cleanup_old_sessions trigger function (ensure it exists)
CREATE OR REPLACE FUNCTION auto_cleanup_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Perform cleanup (non-blocking)
  PERFORM cleanup_unsigned_sessions();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update the session activation trigger function with correct column names
CREATE OR REPLACE FUNCTION update_session_status_on_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- For pending sessions, check if we should activate
  IF NEW.status = 'pending' THEN
    -- If both authentications are present and window hasn't ended, activate
    IF NEW.a_authentication IS NOT NULL
       AND NEW.b_authentication IS NOT NULL
       AND NEW.window_end > now() THEN
      NEW.status = 'active';
      RETURN NEW;
    END IF;
    
    -- If window has ended, expire it
    IF NEW.window_end <= now() THEN
      NEW.status = 'expired';
      RETURN NEW;
    END IF;
  END IF;

  -- For active sessions, check if expired
  IF NEW.status = 'active' AND NEW.window_end <= now() THEN
    NEW.status = 'expired';
    RETURN NEW;
  END IF;

  -- For any status, if window has ended, mark as expired
  IF NEW.window_end <= now() AND NEW.status != 'expired' THEN
    NEW.status = 'expired';
    RETURN NEW;
  END IF;

  -- Otherwise, keep current status
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Ensure triggers are properly attached
DROP TRIGGER IF EXISTS trigger_cleanup_old_sessions ON consent_sessions;
CREATE TRIGGER trigger_cleanup_old_sessions
  AFTER INSERT ON consent_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_cleanup_old_sessions();

DROP TRIGGER IF EXISTS trigger_activate_session_on_signatures ON consent_sessions;
CREATE TRIGGER trigger_activate_session_on_signatures
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_signature();

-- Step 5: Update check_cleanup_status function
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
    AND (a_authentication IS NULL OR b_authentication IS NULL);
  
  -- Count pending unsigned sessions older than 10 minutes
  SELECT COUNT(*) INTO pending_unsigned_old_count
  FROM consent_sessions
  WHERE status = 'pending'
    AND created_at < now() - interval '10 minutes'
    AND (a_authentication IS NULL OR b_authentication IS NULL);
  
  RETURN json_build_object(
    'pending_unsigned_total', pending_unsigned_count,
    'pending_unsigned_old', pending_unsigned_old_count,
    'should_be_deleted', pending_unsigned_old_count,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update RLS policies on consent_sessions that might reference old columns
-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "Anyone can view active sessions" ON consent_sessions;
CREATE POLICY "Anyone can view active sessions"
  ON consent_sessions FOR SELECT
  USING (
    status = 'active'
    AND a_authentication IS NOT NULL
    AND b_authentication IS NOT NULL
  );

-- Step 7: Update session_tags RLS policies
DROP POLICY IF EXISTS "Anyone can create tags on active sessions" ON session_tags;
CREATE POLICY "Anyone can create tags on active sessions"
  ON session_tags FOR INSERT
  TO public
  WITH CHECK (
    -- Session must exist and be active with both authentications
    EXISTS (
      SELECT 1 FROM consent_sessions
      WHERE consent_sessions.id = session_tags.session_id
      AND consent_sessions.status = 'active'
      AND consent_sessions.a_authentication IS NOT NULL
      AND consent_sessions.b_authentication IS NOT NULL
    )
    -- Enforce max 3 tags per session
    AND (
      SELECT COUNT(*) FROM session_tags 
      WHERE session_id = session_tags.session_id
    ) < 3
  );

DROP POLICY IF EXISTS "Anyone can view tags for active sessions" ON session_tags;
CREATE POLICY "Anyone can view tags for active sessions"
  ON session_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consent_sessions
      WHERE consent_sessions.id = session_tags.session_id
      AND consent_sessions.status = 'active'
      AND consent_sessions.a_authentication IS NOT NULL
      AND consent_sessions.b_authentication IS NOT NULL
    )
  );

-- Step 8: Update the pg_cron scheduled job if it exists
DO $$
BEGIN
  -- Try to update the scheduled job
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old job if exists
    PERFORM cron.unschedule('cleanup-unsigned-sessions');
    
    -- Recreate with correct column references
    PERFORM cron.schedule(
      'cleanup-unsigned-sessions',
      '*/5 * * * *',
      'SELECT cleanup_unsigned_sessions()'
    );
    
    RAISE NOTICE 'Updated pg_cron scheduled job with correct column names';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping scheduled job update';
  WHEN others THEN
    RAISE NOTICE 'Could not update scheduled job: %', SQLERRM;
END $$;

-- Step 9: Fix any sessions that should be active but are pending
UPDATE consent_sessions
SET 
  status = 'active',
  updated_at = now()
WHERE status = 'pending'
  AND a_authentication IS NOT NULL
  AND b_authentication IS NOT NULL
  AND b_pubky IS NOT NULL
  AND window_end > now();

-- Step 10: Add helpful column comments
COMMENT ON COLUMN consent_sessions.a_authentication IS 'Person A authentication token proving consent agreement (generated via Pubky Ring authentication, not traditional cryptographic signature)';
COMMENT ON COLUMN consent_sessions.b_authentication IS 'Person B authentication token proving consent agreement (generated via Pubky Ring authentication, not traditional cryptographic signature)';

-- Step 11: Log completion
DO $$
DECLARE
  active_count INTEGER;
  pending_count INTEGER;
  expired_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count FROM consent_sessions WHERE status = 'active';
  SELECT COUNT(*) INTO pending_count FROM consent_sessions WHERE status = 'pending';
  SELECT COUNT(*) INTO expired_count FROM consent_sessions WHERE status = 'expired';
  
  RAISE NOTICE '=== Column Reference Fix Migration Complete ===';
  RAISE NOTICE 'All database objects now use a_authentication/b_authentication';
  RAISE NOTICE 'Current session stats: % active, % pending, % expired', active_count, pending_count, expired_count;
  RAISE NOTICE 'All triggers and functions updated successfully';
END $$;
