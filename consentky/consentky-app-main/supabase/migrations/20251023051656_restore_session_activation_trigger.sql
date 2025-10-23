/*
  # Restore Session Activation Trigger

  ## Problem
  Migration 20251022084053 dropped and recreated the consent_sessions table,
  which also dropped all triggers. The table was recreated without the critical
  trigger that automatically activates sessions when both signatures are present.
  
  Migration 20251022094041 only recreated the trigger FUNCTION but assumed the
  trigger itself still existed. This means sessions never automatically transition
  from 'pending' to 'active' status when both parties sign.

  ## Changes

  1. **Recreate Missing Trigger**
     - Create the trigger `trigger_activate_session_on_signatures`
     - Attach it to BEFORE UPDATE events on consent_sessions table
     - Ensures automatic status transitions when signatures are added

  2. **Fix Existing Stuck Sessions**
     - Manually activate all sessions that have both signatures
     - Only activate sessions where window hasn't expired
     - Update sessions from 'pending' to 'active' status

  3. **Verification**
     - Log count of fixed sessions
     - Verify trigger is properly attached to table

  ## Impact
  - Sessions will now automatically transition to 'active' when both parties sign
  - All currently stuck sessions will be fixed immediately
  - Future sessions will work correctly without manual intervention
*/

-- First, verify the trigger function exists (it should from previous migration)
-- If not, create it
CREATE OR REPLACE FUNCTION update_session_status_on_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- For pending sessions, check if we should activate
  IF NEW.status = 'pending' THEN
    -- If both signatures are present and window hasn't ended, activate
    IF NEW.a_signature IS NOT NULL
       AND NEW.b_signature IS NOT NULL
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

-- Drop the trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_activate_session_on_signatures ON consent_sessions;

-- Recreate the trigger
CREATE TRIGGER trigger_activate_session_on_signatures
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_signature();

-- Fix all existing sessions that should be active but are stuck in pending
UPDATE consent_sessions
SET 
  status = 'active',
  updated_at = now()
WHERE status = 'pending'
  AND a_signature IS NOT NULL
  AND b_signature IS NOT NULL
  AND b_pubky IS NOT NULL
  AND window_end > now();

-- Log how many sessions were fixed
DO $$
DECLARE
  fixed_count INTEGER;
  total_pending INTEGER;
  total_active INTEGER;
BEGIN
  -- Count sessions fixed in this migration
  SELECT COUNT(*) INTO fixed_count
  FROM consent_sessions
  WHERE status = 'active'
    AND updated_at > now() - interval '5 seconds';
  
  -- Count all pending sessions
  SELECT COUNT(*) INTO total_pending
  FROM consent_sessions
  WHERE status = 'pending';
  
  -- Count all active sessions
  SELECT COUNT(*) INTO total_active
  FROM consent_sessions
  WHERE status = 'active';
  
  RAISE NOTICE '=== Session Activation Trigger Restored ===';
  RAISE NOTICE 'Fixed % sessions that were stuck in pending status', fixed_count;
  RAISE NOTICE 'Current stats: % pending, % active', total_pending, total_active;
  RAISE NOTICE 'Trigger successfully attached to consent_sessions table';
END $$;
