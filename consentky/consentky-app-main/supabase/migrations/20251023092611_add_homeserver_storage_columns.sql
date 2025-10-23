/*
  # Add Homeserver Storage Tracking Columns

  1. New Columns
    - `a_homeserver_stored` (boolean) - Whether agreement is stored on Person A's homeserver
    - `b_homeserver_stored` (boolean) - Whether agreement is stored on Person B's homeserver
    - `a_homeserver_url` (text) - URL where agreement is stored on Person A's homeserver
    - `b_homeserver_url` (text) - URL where agreement is stored on Person B's homeserver
    - `homeserver_stored_at` (timestamptz) - When both homeservers successfully stored the agreement

  2. Changes
    - Add columns with default values to prevent undefined states
    - Set defaults: homeserver_stored flags default to false
    - URLs default to null until storage succeeds
    - homeserver_stored_at defaults to null until both succeed

  3. Important Notes
    - These columns track decentralized backup of consent agreements
    - Storage happens automatically when session becomes active
    - Both homeservers must successfully store for complete backup
*/

DO $$
BEGIN
  -- Add a_homeserver_stored column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'a_homeserver_stored'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN a_homeserver_stored boolean DEFAULT false;
  END IF;

  -- Add b_homeserver_stored column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'b_homeserver_stored'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN b_homeserver_stored boolean DEFAULT false;
  END IF;

  -- Add a_homeserver_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'a_homeserver_url'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN a_homeserver_url text DEFAULT null;
  END IF;

  -- Add b_homeserver_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'b_homeserver_url'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN b_homeserver_url text DEFAULT null;
  END IF;

  -- Add homeserver_stored_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'homeserver_stored_at'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN homeserver_stored_at timestamptz DEFAULT null;
  END IF;
END $$;
