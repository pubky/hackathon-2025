/*
  # Add canonical_hash field to consent_sessions

  1. Changes
    - Add `canonical_hash` column to `consent_sessions` table
      - Stores the deterministic hash of the canonical consent object
      - This ensures both parties sign and verify against the same hash
      - TEXT type to store hex-encoded hash
      - Nullable initially to support existing sessions

  2. Notes
    - This field will be populated when Person B joins the session
    - Both signatures will be verified against this stored hash
    - Ensures consistency between signing and verification operations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'canonical_hash'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN canonical_hash TEXT;
  END IF;
END $$;
