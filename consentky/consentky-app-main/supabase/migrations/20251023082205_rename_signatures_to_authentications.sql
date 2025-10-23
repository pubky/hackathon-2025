/*
  # Rename Signature Columns to Authentication Columns

  1. Changes
    - Rename `a_signature` to `a_authentication` in consent_sessions table
    - Rename `b_signature` to `b_authentication` in consent_sessions table
    - Update all triggers that reference the old column names
    - Update all functions that reference the old column names
    - Update all comments and documentation to reflect authentication terminology

  2. Rationale
    - Pubky Ring provides authentication, not traditional cryptographic signatures
    - The terminology "authentication" more accurately represents the consent mechanism
    - Users authenticate their agreement rather than sign it in the traditional sense

  3. Migration Strategy
    - Rename columns directly (safe operation in PostgreSQL)
    - Update all dependent database objects (triggers, functions)
    - Maintain all existing functionality with corrected terminology
*/

-- Step 1: Rename columns in consent_sessions table
ALTER TABLE consent_sessions
  RENAME COLUMN a_signature TO a_authentication;

ALTER TABLE consent_sessions
  RENAME COLUMN b_signature TO b_authentication;

-- Step 2: Update the session activation trigger function
-- This trigger activates a session when both parties have authenticated
CREATE OR REPLACE FUNCTION activate_session_on_both_authentications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.a_authentication IS NOT NULL
     AND NEW.b_authentication IS NOT NULL
     AND NEW.status = 'pending'
     AND NOW() <= NEW.window_end THEN

    NEW.status := 'active';
    NEW.updated_at := NOW();

    RAISE NOTICE 'Session % activated - both authentications present', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger with updated function
DROP TRIGGER IF EXISTS trigger_activate_on_both_authentications ON consent_sessions;

CREATE TRIGGER trigger_activate_on_both_authentications
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  WHEN (NEW.a_authentication IS NOT NULL
        AND NEW.b_authentication IS NOT NULL
        AND OLD.status = 'pending')
  EXECUTE FUNCTION activate_session_on_both_authentications();

-- Step 3: Update the refresh_session_status function
DROP FUNCTION IF EXISTS refresh_session_status(text);

CREATE OR REPLACE FUNCTION refresh_session_status(session_id text)
RETURNS consent_sessions AS $$
DECLARE
  result consent_sessions;
BEGIN
  UPDATE consent_sessions
  SET
    status = CASE
      WHEN NOW() > window_end THEN 'expired'
      WHEN a_authentication IS NOT NULL AND b_authentication IS NOT NULL THEN 'active'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = session_id
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update the cleanup function for unauthenticated sessions
CREATE OR REPLACE FUNCTION cleanup_unauthenticated_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM consent_sessions
  WHERE created_at < NOW() - INTERVAL '10 minutes'
    AND status = 'pending'
    AND (a_authentication IS NULL OR b_authentication IS NULL);

  RAISE NOTICE 'Cleaned up unauthenticated sessions older than 10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update all RLS policies that reference the old column names
-- Note: These are recreated to ensure they reference the correct column names

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active sessions" ON consent_sessions;
DROP POLICY IF EXISTS "Anyone can view pending/expired sessions" ON consent_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON consent_sessions;
DROP POLICY IF EXISTS "Anyone can update their own session as participant" ON consent_sessions;

-- Recreate policies with updated logic
CREATE POLICY "Anyone can view active sessions"
  ON consent_sessions FOR SELECT
  USING (
    status = 'active'
    AND a_authentication IS NOT NULL
    AND b_authentication IS NOT NULL
  );

CREATE POLICY "Anyone can view pending/expired sessions"
  ON consent_sessions FOR SELECT
  USING (status IN ('pending', 'expired'));

CREATE POLICY "Anyone can create sessions"
  ON consent_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own session as participant"
  ON consent_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 6: Update session tags RLS policies
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

-- Step 7: Add helpful comments to the table
COMMENT ON COLUMN consent_sessions.a_authentication IS 'Person A authentication token proving they agreed to consent (generated via Pubky Ring authentication)';
COMMENT ON COLUMN consent_sessions.b_authentication IS 'Person B authentication token proving they agreed to consent (generated via Pubky Ring authentication)';
