/*
  # Change Session IDs to Short Text Format

  This migration changes the consent_sessions table ID from UUID to short text (6 characters).

  ## Changes
  
  1. Changes
    - Drop and recreate the `consent_sessions` table with text ID
    - Drop and recreate the `pending_session_joins` table with new foreign key
    - Update all related functions to use text instead of uuid
  
  2. Important Notes
    - This will remove all existing session data (development only)
    - Session IDs will be manually generated in application code
    - Foreign keys are updated to reference text IDs

  3. Security
    - RLS policies are maintained
    - All permissions remain the same
*/

-- Drop existing tables and functions that depend on consent_sessions
DROP FUNCTION IF EXISTS check_and_expire_session(uuid);
DROP FUNCTION IF EXISTS refresh_session_status(uuid);
DROP TABLE IF EXISTS pending_session_joins;
DROP TABLE IF EXISTS consent_sessions;

-- Recreate consent_sessions with text ID
CREATE TABLE consent_sessions (
  id text PRIMARY KEY,
  version text NOT NULL DEFAULT '1.0',
  a_pubky text NOT NULL,
  b_pubky text,
  statement_hash text NOT NULL,
  consent_statement text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  window_duration_minutes integer NOT NULL,
  a_signature text,
  b_signature text,
  canonical_hash text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT consent_sessions_status_check CHECK (status IN ('pending', 'active', 'expired'))
);

-- Enable RLS
ALTER TABLE consent_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consent_sessions
CREATE POLICY "Anyone can create sessions"
  ON consent_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view sessions they participate in"
  ON consent_sessions FOR SELECT
  TO authenticated
  USING (
    a_pubky = current_setting('request.headers', true)::json->>'x-pubky'
    OR b_pubky = current_setting('request.headers', true)::json->>'x-pubky'
  );

CREATE POLICY "Participants can update their sessions"
  ON consent_sessions FOR UPDATE
  TO authenticated
  USING (
    a_pubky = current_setting('request.headers', true)::json->>'x-pubky'
    OR b_pubky = current_setting('request.headers', true)::json->>'x-pubky'
  )
  WITH CHECK (
    a_pubky = current_setting('request.headers', true)::json->>'x-pubky'
    OR b_pubky = current_setting('request.headers', true)::json->>'x-pubky'
  );

-- Create indexes
CREATE INDEX idx_consent_sessions_a_pubky ON consent_sessions(a_pubky);
CREATE INDEX idx_consent_sessions_b_pubky ON consent_sessions(b_pubky);
CREATE INDEX idx_consent_sessions_status ON consent_sessions(status);
CREATE INDEX idx_consent_sessions_window_end ON consent_sessions(window_end);

-- Updated trigger for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_consent_sessions_updated_at
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recreate pending_session_joins with text foreign key
CREATE TABLE IF NOT EXISTS pending_session_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES consent_sessions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE pending_session_joins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can create pending joins"
  ON pending_session_joins FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view pending joins"
  ON pending_session_joins FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_pending_joins_session_id ON pending_session_joins(session_id);
CREATE INDEX idx_pending_joins_expires_at ON pending_session_joins(expires_at);

-- Recreate cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_pending_joins()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_session_joins
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate unsigned session cleanup with 10 minute window
CREATE OR REPLACE FUNCTION cleanup_unsigned_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM consent_sessions
  WHERE status = 'pending'
    AND a_signature IS NULL
    AND b_signature IS NULL
    AND created_at < now() - interval '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate session expiration functions with text parameter
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

GRANT EXECUTE ON FUNCTION check_and_expire_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_expire_session(text) TO anon;

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
    WHEN a_signature IS NOT NULL AND b_signature IS NOT NULL THEN 'active'
    ELSE 'pending'
  END
  WHERE id = session_id;

  SELECT row_to_json(cs.*) INTO result
  FROM consent_sessions cs
  WHERE cs.id = session_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_session_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_session_status(text) TO anon;
