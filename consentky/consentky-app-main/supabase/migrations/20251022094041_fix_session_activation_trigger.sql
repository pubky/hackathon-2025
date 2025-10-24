/*
  # Fix Session Activation Trigger

  ## Problem
  Sessions with both signatures are not automatically transitioning from "pending" 
  to "active" status. Investigation revealed that the trigger has overly strict 
  conditions, particularly the `window_start <= now()` check which prevents 
  activation if both parties sign before the window officially starts.

  ## Changes

  1. **Simplified Activation Logic**
     - Remove the `window_start <= now()` requirement
     - Sessions should activate as soon as both signatures are present
     - Sessions can be signed and activated before the window starts
     - This matches user expectations and real-world usage

  2. **Improved Trigger Function**
     - Clearer logic flow and conditions
     - Better handling of status transitions
     - Proper ordering: check activation before expiration for pending sessions

  3. **Fix Existing Stuck Sessions**
     - Update all sessions that should be active but are stuck in pending
     - Sessions qualify if they have both signatures and haven't expired

  ## Status Transition Rules

  ### Pending → Active
  - Both signatures present (a_signature AND b_signature not null)
  - Status is currently 'pending'
  - Window has not ended (window_end > now())
  - No window start time check needed

  ### Active → Expired
  - Window has ended (window_end <= now())
  - Regardless of signature status

  ### Pending → Expired
  - Window has ended (window_end <= now())
  - Even if unsigned

  ## Benefits

  - Sessions activate immediately when both parties sign
  - No timing issues with window start
  - Matches user expectations
  - Fixes existing stuck sessions
  - Simpler, more maintainable logic
*/

-- Replace the trigger function with fixed version
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

-- The trigger already exists and will use the updated function

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
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM consent_sessions
  WHERE status = 'active'
    AND updated_at > now() - interval '5 seconds';
  
  RAISE NOTICE 'Fixed % sessions that were stuck in pending status', fixed_count;
END $$;
