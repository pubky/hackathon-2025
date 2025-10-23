/*
  # Create pending session joins table

  1. New Tables
    - `pending_session_joins`
      - `id` (uuid, primary key) - Unique identifier for the pending join
      - `session_id` (uuid) - The consent session to join after authentication
      - `created_at` (timestamptz) - When this pending join was created
      - `expires_at` (timestamptz) - When this pending join expires (30 minutes from creation)

  2. Purpose
    - Store temporary records when generating QR codes for session joins
    - Link the authentication flow back to the intended session
    - Automatically clean up expired pending joins

  3. Security
    - Enable RLS on `pending_session_joins` table
    - Allow anyone to read pending joins (needed for post-auth redirect)
    - Allow anyone to create pending joins (needed when generating QR codes)
    - Auto-delete expired records after 30 minutes

  4. Notes
    - This table enables Pubky auth URLs in QR codes to preserve session context
    - The ID in this table becomes part of the callback URL after authentication
    - Expired joins are cleaned up automatically via trigger
*/

-- Create pending session joins table
CREATE TABLE IF NOT EXISTS pending_session_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES consent_sessions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes')
);

-- Enable RLS
ALTER TABLE pending_session_joins ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pending joins (needed for auth callback)
CREATE POLICY "Anyone can read pending joins"
  ON pending_session_joins
  FOR SELECT
  USING (expires_at > now());

-- Allow anyone to create pending joins (needed when generating QR)
CREATE POLICY "Anyone can create pending joins"
  ON pending_session_joins
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_pending_joins_expires_at 
  ON pending_session_joins(expires_at);

CREATE INDEX IF NOT EXISTS idx_pending_joins_session_id 
  ON pending_session_joins(session_id);

-- Function to clean up expired pending joins
CREATE OR REPLACE FUNCTION cleanup_expired_pending_joins()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_session_joins
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically clean up expired joins when queried
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_pending_joins()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM cleanup_expired_pending_joins();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_cleanup_pending_joins ON pending_session_joins;
CREATE TRIGGER auto_cleanup_pending_joins
  AFTER INSERT ON pending_session_joins
  EXECUTE FUNCTION trigger_cleanup_expired_pending_joins();
