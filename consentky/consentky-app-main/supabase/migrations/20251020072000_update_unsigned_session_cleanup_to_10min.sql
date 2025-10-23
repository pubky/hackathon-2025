/*
  # Update Unsigned Session Cleanup to 10 Minutes

  ## Overview
  This migration updates the automatic cleanup of unsigned pending sessions from
  2 minutes to 10 minutes, giving users more time to complete the signing process.

  ## Changes

  1. **Update delete_old_unsigned_sessions() Function**
     - Change cleanup threshold from 2 minutes to 10 minutes
     - Sessions must remain unsigned for 10 minutes before deletion
     - Only affects pending sessions missing signatures
     - Fully signed sessions are never deleted

  2. **Rationale**
     - Original 2-minute window was too short for users
     - 10 minutes provides adequate time to:
       - Share session link/QR code
       - Partner receives and scans QR code
       - Partner authenticates if needed
       - Both parties review and sign
     - Reduces accidental deletion of active signing flows

  ## Behavior

  Sessions are deleted ONLY if ALL conditions are met:
  - Created more than 10 minutes ago (created_at < now() - interval '10 minutes')
  - Status is 'pending'
  - Missing at least one signature (a_signature IS NULL OR b_signature IS NULL)

  Protected sessions (NEVER deleted):
  - Fully signed sessions (both a_signature AND b_signature present)
  - Active sessions (status = 'active')
  - Expired sessions (status = 'expired')
  - Sessions younger than 10 minutes

  ## Performance

  - Uses existing index on created_at for efficient queries
  - Cleanup is lightweight and non-blocking
  - Only targets small subset of pending sessions
  - Runs automatically on each new session insert

  ## Security

  - Function runs with SECURITY DEFINER to bypass RLS
  - Only deletes unsigned pending sessions (safe to remove)
  - No user input, preventing injection attacks
  - Preserves all signed sessions for audit trail
*/

-- Update the function to use 10-minute interval instead of 2-minute
CREATE OR REPLACE FUNCTION delete_old_unsigned_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete sessions that are:
  -- 1. Created more than 10 minutes ago (updated from 2 minutes)
  -- 2. Still in pending status
  -- 3. Missing at least one signature
  DELETE FROM consent_sessions
  WHERE created_at < now() - interval '10 minutes'
    AND status = 'pending'
    AND (a_signature IS NULL OR b_signature IS NULL);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger auto_cleanup_old_sessions already exists and will use the updated function
-- No need to recreate the trigger, it will automatically call the new function version
