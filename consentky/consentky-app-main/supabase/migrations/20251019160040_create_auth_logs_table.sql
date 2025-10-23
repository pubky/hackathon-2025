/*
  # Create auth_logs table

  1. New Tables
    - `auth_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `user_pubky` (text, nullable) - User's Pubky identifier (null for failed auth)
      - `event_type` (text) - Type of authentication event (auth_initiated, auth_completed, auth_failed, session_restored, etc.)
      - `event_data` (jsonb, nullable) - Additional event metadata
      - `timestamp` (timestamptz) - When the event occurred
      - `created_at` (timestamptz) - Record creation time

  2. Security
    - Enable RLS on `auth_logs` table
    - Add policy for authenticated users to read their own logs
    - Add policy for system to insert logs (permissive for logging)

  3. Indexes
    - Index on user_pubky for efficient querying
    - Index on timestamp for time-based queries
*/

CREATE TABLE IF NOT EXISTS auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pubky text,
  event_type text NOT NULL,
  event_data jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_pubky ON auth_logs(user_pubky);
CREATE INDEX IF NOT EXISTS idx_auth_logs_timestamp ON auth_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);

-- Enable RLS
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own auth logs
CREATE POLICY "Users can read own auth logs"
  ON auth_logs FOR SELECT
  TO authenticated
  USING (user_pubky = current_setting('request.headers', true)::json->>'x-user-pubky');

-- Policy: Allow inserting auth logs (permissive for logging purposes)
CREATE POLICY "Allow inserting auth logs"
  ON auth_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);