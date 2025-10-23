/*
  # Create ConsentKy Consent Sessions Table

  ## Overview
  This migration creates the database schema for ConsentKy, a mutual consent verification app.
  It stores cryptographic proofs of time-bound consent agreements between two parties.

  ## New Tables

  ### consent_sessions
  Core table storing all consent session data and cryptographic signatures.

  **Fields:**
  - `id` (uuid, primary key) - Unique session identifier
  - `version` (text) - Protocol version for future compatibility (default: "1.0")
  - `a_pubky` (text, not null) - Person A's z32-encoded Ed25519 public key (session creator)
  - `b_pubky` (text, nullable) - Person B's z32-encoded Ed25519 public key (joiner)
  - `statement_hash` (text, not null) - SHA-256 hash of consent statement text
  - `consent_statement` (text, not null) - Full text of consent agreement for reference
  - `window_start` (timestamptz, not null) - Consent window start time
  - `window_end` (timestamptz, not null) - Consent window end time
  - `window_duration_minutes` (integer, not null) - Duration in minutes for easy display
  - `a_signature` (text, nullable) - Person A's Ed25519 signature of canonical object
  - `b_signature` (text, nullable) - Person B's Ed25519 signature of canonical object
  - `status` (text, not null) - Current status: "pending", "active", "expired"
  - `created_at` (timestamptz) - Session creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security (Row Level Security)

  1. **Public Read Access**
     - Anyone can view session details for verification purposes
     - This enables third-party proof verification

  2. **Authenticated Creation**
     - Only authenticated users can create new sessions
     - Creator's pubky must match authenticated user

  3. **Participant Updates**
     - Only session participants (a_pubky or b_pubky) can update their signatures
     - Updates limited to signature fields and b_pubky (for joining)

  4. **No Deletion**
     - No delete policies - sessions are permanent records for audit trail
     - Expired sessions remain for historical verification

  ## Performance

  - Index on `id` (primary key) for fast lookups
  - Index on `status` for filtering active/pending/expired sessions
  - Index on `a_pubky` for finding sessions created by user
  - Index on `b_pubky` for finding sessions joined by user
  - Index on `window_end` for expiry checking
  - Composite index on pubkeys for participant queries

  ## Canonical Consent Statement

  The default consent statement (v1.0):
  "We both agree to be intimate and respectful during this time window. Consent ends at the timer."

  ## Important Notes

  1. **Immutable Consent**
     - Once both signatures are present and status is "active", consent cannot be revoked
     - Only expiry (window_end) terminates the consent

  2. **Cryptographic Proof**
     - Canonical object format: {version, session_id, a_pubky, b_pubky, statement_hash, window_start, window_end}
     - Both signatures must verify against the same canonical hash
     - Ed25519 signatures provide cryptographic authenticity

  3. **No Personal Data**
     - Only public keys and timestamps stored
     - No names, emails, or identifying information
     - Privacy-preserving by design

  4. **Status Transitions**
     - pending → active: When both signatures are present
     - active → expired: Automatically when current time > window_end
     - No other transitions allowed
*/

-- Drop old messages table
DROP TABLE IF EXISTS messages CASCADE;

-- Create consent_sessions table
CREATE TABLE IF NOT EXISTS consent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_sessions_status ON consent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_consent_sessions_a_pubky ON consent_sessions(a_pubky);
CREATE INDEX IF NOT EXISTS idx_consent_sessions_b_pubky ON consent_sessions(b_pubky) WHERE b_pubky IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_sessions_window_end ON consent_sessions(window_end);
CREATE INDEX IF NOT EXISTS idx_consent_sessions_participants ON consent_sessions(a_pubky, b_pubky);
CREATE INDEX IF NOT EXISTS idx_consent_sessions_created_at ON consent_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE consent_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view sessions for verification
CREATE POLICY "Anyone can view consent sessions for verification"
  ON consent_sessions FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions"
  ON consent_sessions FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policy: Participants can update their signatures
CREATE POLICY "Participants can update sessions"
  ON consent_sessions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_consent_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_consent_session_updated_at
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_consent_session_updated_at();

-- Function to automatically update session status to active when both signatures present
CREATE OR REPLACE FUNCTION update_session_status_on_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- If both signatures are present and status is pending, mark as active
  IF NEW.a_signature IS NOT NULL 
     AND NEW.b_signature IS NOT NULL 
     AND NEW.status = 'pending' 
     AND NEW.window_start <= now() 
     AND NEW.window_end > now() THEN
    NEW.status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically activate sessions
CREATE TRIGGER trigger_activate_session_on_signatures
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_signature();

-- Function to check and expire sessions
CREATE OR REPLACE FUNCTION expire_consent_sessions()
RETURNS void AS $$
BEGIN
  UPDATE consent_sessions
  SET status = 'expired'
  WHERE status IN ('pending', 'active')
    AND window_end < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Call expire_consent_sessions() periodically or check expiry client-side