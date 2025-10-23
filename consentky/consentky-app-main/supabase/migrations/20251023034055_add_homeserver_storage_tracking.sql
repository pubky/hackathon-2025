/*
  # Add Homeserver Storage Tracking

  1. Changes to consent_sessions table
    - Add `a_homeserver_stored` (boolean) - Tracks if Person A's homeserver has the agreement
    - Add `b_homeserver_stored` (boolean) - Tracks if Person B's homeserver has the agreement
    - Add `a_homeserver_url` (text) - URL where agreement is stored on Person A's homeserver
    - Add `b_homeserver_url` (text) - URL where agreement is stored on Person B's homeserver
    - Add `homeserver_stored_at` (timestamptz) - When both homeservers successfully stored the agreement

  2. Purpose
    - Enable hybrid storage: Supabase for coordination, Pubky homeservers for permanent proof
    - Track which homeservers have successfully stored the signed agreement
    - Provide URLs for verification and retrieval from homeservers
    - Allow graceful degradation if homeserver writes fail

  3. Important Notes
    - These fields are nullable - existing sessions work without homeserver storage
    - Non-blocking feature - app continues to work even if Pubky writes fail
    - Both parties get a copy of the signed agreement on their homeserver
    - Homeserver storage happens automatically after both signatures complete
*/

-- Add homeserver storage tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'a_homeserver_stored'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN a_homeserver_stored boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'b_homeserver_stored'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN b_homeserver_stored boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'a_homeserver_url'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN a_homeserver_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'b_homeserver_url'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN b_homeserver_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'homeserver_stored_at'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN homeserver_stored_at timestamptz;
  END IF;
END $$;

-- Create index for querying homeserver storage status
CREATE INDEX IF NOT EXISTS idx_consent_sessions_homeserver_stored
  ON consent_sessions(a_homeserver_stored, b_homeserver_stored)
  WHERE status = 'active';

-- Add comment explaining the hybrid storage model
COMMENT ON COLUMN consent_sessions.a_homeserver_stored IS
  'Indicates if the signed agreement was successfully stored on Person A''s Pubky homeserver';

COMMENT ON COLUMN consent_sessions.b_homeserver_stored IS
  'Indicates if the signed agreement was successfully stored on Person B''s Pubky homeserver';

COMMENT ON COLUMN consent_sessions.a_homeserver_url IS
  'Pubky URL where the agreement is stored on Person A''s homeserver (e.g., pubky://xyz.../pub/consentky.app/agreements/SESSION_ID)';

COMMENT ON COLUMN consent_sessions.b_homeserver_url IS
  'Pubky URL where the agreement is stored on Person B''s homeserver (e.g., pubky://xyz.../pub/consentky.app/agreements/SESSION_ID)';

COMMENT ON COLUMN consent_sessions.homeserver_stored_at IS
  'Timestamp when both homeservers successfully stored the agreement (NULL if incomplete)';
