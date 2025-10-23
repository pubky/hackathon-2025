/*
  # Change Session ID from UUID to Text

  This migration changes the consent_sessions.id column from UUID to TEXT
  to support short, human-readable session IDs (e.g., "9SGLXB").
  
  Changes:
  - Alter id column from uuid to text
  - Update foreign keys in pending_session_joins
  - Update any functions that reference the id column
*/

-- Step 1: Drop foreign key constraint on pending_session_joins
ALTER TABLE pending_session_joins 
  DROP CONSTRAINT IF EXISTS pending_session_joins_session_id_fkey;

-- Step 2: Change the id column type in consent_sessions
ALTER TABLE consent_sessions 
  ALTER COLUMN id TYPE text USING id::text;

-- Step 3: Change session_id in pending_session_joins to text
ALTER TABLE pending_session_joins 
  ALTER COLUMN session_id TYPE text USING session_id::text;

-- Step 4: Re-add the foreign key constraint
ALTER TABLE pending_session_joins 
  ADD CONSTRAINT pending_session_joins_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES consent_sessions(id) ON DELETE CASCADE;

-- Step 5: Update check_and_expire_session function if it exists
DROP FUNCTION IF EXISTS check_and_expire_session(uuid);
CREATE OR REPLACE FUNCTION check_and_expire_session(session_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record consent_sessions;
  result json;
BEGIN
  SELECT * INTO session_record
  FROM consent_sessions
  WHERE id = session_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;

  IF session_record.window_end < now() AND session_record.status != 'expired' THEN
    UPDATE consent_sessions
    SET status = 'expired'
    WHERE id = session_id;

    SELECT row_to_json(cs.*) INTO result
    FROM consent_sessions cs
    WHERE cs.id = session_id;

    RETURN result;
  END IF;

  RETURN row_to_json(session_record);
END;
$$;

-- Step 6: Update refresh_session_status function if it exists
DROP FUNCTION IF EXISTS refresh_session_status(uuid);
CREATE OR REPLACE FUNCTION refresh_session_status(session_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  UPDATE consent_sessions
  SET status = CASE
    WHEN window_end < now() THEN 'expired'
    WHEN a_authentication IS NOT NULL AND b_authentication IS NOT NULL THEN 'active'
    ELSE 'pending'
  END
  WHERE id = session_id;

  SELECT row_to_json(cs.*) INTO result
  FROM consent_sessions cs
  WHERE cs.id = session_id;

  RETURN result;
END;
$$;