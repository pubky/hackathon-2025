/*
  # Fix Authentication Column References in Database Objects

  ## Overview
  This migration fixes database objects that still reference the old column names
  (a_signature, b_signature) instead of the new names (a_authentication, b_authentication).
  The column rename was done in migration 20251023082205, but some database objects
  created before or after that migration still use the old names.

  ## Changes

  1. **Update session_tags RLS Policies**
     - Fix "Anyone can create tags on active sessions" policy
     - Update references from a_signature/b_signature to a_authentication/b_authentication

  2. **Update Session Activation Trigger Function**
     - Fix update_session_status_on_signature() function
     - Update all signature column references to authentication columns

  3. **Recreate Trigger**
     - Drop and recreate trigger to use updated function
     - Ensure automatic session activation works correctly

  ## Tables Affected
  - consent_sessions (trigger function updated)
  - session_tags (RLS policy updated)

  ## Security Notes
  - Maintains existing security model
  - Only changes column references, not access control logic
  - All policies remain functionally identical
*/

-- Step 1: Update session_tags RLS policy for INSERT
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

-- Step 2: Update the session activation trigger function
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

-- Step 3: Recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS trigger_activate_session_on_signatures ON consent_sessions;

CREATE TRIGGER trigger_activate_session_on_signatures
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_signature();

-- Step 4: Fix any sessions that should be active but are pending
UPDATE consent_sessions
SET 
  status = 'active',
  updated_at = now()
WHERE status = 'pending'
  AND a_authentication IS NOT NULL
  AND b_authentication IS NOT NULL
  AND b_pubky IS NOT NULL
  AND window_end > now();
