/*
  # Add Real-Time Expiration Check on Updates

  ## Overview
  This migration adds a trigger that checks session expiration whenever a session
  is updated or queried, providing real-time status accuracy without waiting for
  the scheduled cron job.

  ## Changes

  1. **Enhanced Status Update Trigger**
     - Extends the existing update_session_status_on_signature trigger
     - Now also checks if session window has expired
     - Automatically sets status to 'expired' if window_end < now()
     - Works in combination with signature activation logic

  2. **Session Expiration Check Function**
     - Checks both signature status and time window
     - Transitions to 'expired' if window has ended
     - Prevents activation of expired sessions
     - Ensures status is always current on updates

  ## Status Transition Logic

  The trigger handles all status transitions:

  1. **Pending → Active**:
     - Both signatures present
     - Window has started (window_start <= now())
     - Window has not ended (window_end > now())

  2. **Pending → Expired**:
     - Window has ended (window_end <= now())
     - Regardless of signature status

  3. **Active → Expired**:
     - Window has ended (window_end <= now())
     - Even if both signatures present

  ## Benefits

  - Immediate status updates on any session modification
  - Prevents stale status information
  - Works alongside scheduled job for redundancy
  - No client-side expiration logic needed
  - Handles edge cases like signing after expiration

  ## Performance

  - Minimal overhead (single timestamp comparison)
  - Only runs on UPDATE operations
  - Uses existing indexed columns
  - No additional database queries needed
*/

-- Replace the existing trigger function with enhanced version
CREATE OR REPLACE FUNCTION update_session_status_on_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- First, check if the session window has expired
  IF NEW.window_end <= now() THEN
    -- Session has expired, set status to expired regardless of signatures
    NEW.status = 'expired';
    RETURN NEW;
  END IF;

  -- If both signatures are present and status is pending, check if we should activate
  IF NEW.a_signature IS NOT NULL
     AND NEW.b_signature IS NOT NULL
     AND NEW.status = 'pending'
     AND NEW.window_start <= now()
     AND NEW.window_end > now() THEN
    -- All conditions met, activate the session
    NEW.status = 'active';
    RETURN NEW;
  END IF;

  -- If we're in active status but window has ended, expire it
  IF NEW.status = 'active' AND NEW.window_end <= now() THEN
    NEW.status = 'expired';
    RETURN NEW;
  END IF;

  -- Otherwise, keep current status
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger trigger_activate_session_on_signatures already exists
-- It will automatically use the updated function

-- Create a helper function to manually check and update a session's expiration status
-- This can be called from client code if needed
CREATE OR REPLACE FUNCTION check_and_expire_session(session_id uuid)
RETURNS consent_sessions AS $$
DECLARE
  session_record consent_sessions;
BEGIN
  -- Update the session if it should be expired
  UPDATE consent_sessions
  SET status = 'expired',
      updated_at = now()
  WHERE id = session_id
    AND status IN ('pending', 'active')
    AND window_end <= now();

  -- Return the updated session
  SELECT * INTO session_record
  FROM consent_sessions
  WHERE id = session_id;

  RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_and_expire_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_expire_session(uuid) TO anon;
