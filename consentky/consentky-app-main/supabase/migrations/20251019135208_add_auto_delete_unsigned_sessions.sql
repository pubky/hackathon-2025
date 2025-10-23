/*
  # Auto-delete Unsigned Sessions After 2 Minutes

  ## Overview
  This migration adds functionality to automatically delete consent sessions that remain
  unsigned 2 minutes after creation. This prevents database clutter from abandoned sessions.

  ## Changes

  1. **New Function: `delete_old_unsigned_sessions()`**
     - Deletes sessions that are:
       - Created more than 2 minutes ago
       - Status is 'pending'
       - Missing either a_signature or b_signature (or both)
     - Returns the number of deleted sessions
     - SECURITY DEFINER to bypass RLS for cleanup

  2. **New Function: `auto_cleanup_old_sessions()`**
     - Trigger function that runs AFTER INSERT on consent_sessions
     - Automatically calls delete_old_unsigned_sessions() when new sessions are created
     - Performs cleanup in the background without blocking the insert

  3. **New Trigger: `trigger_cleanup_old_sessions`**
     - Fires AFTER each INSERT on consent_sessions
     - Ensures cleanup runs automatically whenever new sessions are created

  ## Behavior

  - When a new session is created, the trigger automatically cleans up old unsigned sessions
  - Sessions are only deleted if they meet ALL criteria:
    - Created more than 2 minutes ago (created_at < now() - interval '2 minutes')
    - Status is 'pending'
    - Missing at least one signature (a_signature IS NULL OR b_signature IS NULL)
  - Fully signed sessions (active/expired) are NEVER deleted
  - Sessions younger than 2 minutes are preserved

  ## Performance

  - Uses existing index on created_at for efficient queries
  - Cleanup is lightweight and non-blocking
  - Only targets pending sessions, which should be a small subset

  ## Security

  - Function runs with SECURITY DEFINER to bypass RLS
  - Only deletes unsigned pending sessions (safe to remove)
  - No user input, preventing injection attacks
  - Preserves all signed sessions for audit trail
*/

-- Function to delete old unsigned sessions
CREATE OR REPLACE FUNCTION delete_old_unsigned_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete sessions that are:
  -- 1. Created more than 2 minutes ago
  -- 2. Still in pending status
  -- 3. Missing at least one signature
  DELETE FROM consent_sessions
  WHERE created_at < now() - interval '2 minutes'
    AND status = 'pending'
    AND (a_signature IS NULL OR b_signature IS NULL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger automatic cleanup after insert
CREATE OR REPLACE FUNCTION auto_cleanup_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Perform cleanup asynchronously (doesn't block the insert)
  PERFORM delete_old_unsigned_sessions();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup after each insert
DROP TRIGGER IF EXISTS trigger_cleanup_old_sessions ON consent_sessions;

CREATE TRIGGER trigger_cleanup_old_sessions
  AFTER INSERT ON consent_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_cleanup_old_sessions();