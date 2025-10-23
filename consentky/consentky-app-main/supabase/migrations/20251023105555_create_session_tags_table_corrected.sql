/*
  # Create Session Tags Table (Corrected)

  This migration creates the session_tags table with correct column references.
  It uses the correct authentication column names (a_authentication, b_authentication)
  instead of the old signature column names.

  ## Tables Created
  
  1. `session_tags`
    - `id` (uuid, primary key) - Unique identifier for each tag
    - `session_id` (text, foreign key) - References consent_sessions.id
    - `tag_text` (text) - The text content of the tag (max 30 characters)
    - `tag_color` (text) - Color identifier for the tag
    - `created_by_pubky` (text) - Public key of user who created the tag
    - `created_at` (timestamptz) - When the tag was created
    - `updated_at` (timestamptz) - When the tag was last updated

  ## Security
  
  - Enable RLS on session_tags table
  - Public access with validation (matching consent_sessions security model)
  - Tag operations validated at application layer

  ## Constraints
  
  - Maximum 3 tags per session
  - Tag text limited to 30 characters
  - Tag color from predefined set
*/

-- Create session_tags table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES consent_sessions(id) ON DELETE CASCADE,
  tag_text text NOT NULL CHECK (length(tag_text) > 0 AND length(tag_text) <= 30),
  tag_color text NOT NULL CHECK (tag_color IN ('coral', 'emerald', 'sky', 'amber', 'rose', 'violet', 'cyan', 'lime')),
  created_by_pubky text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE session_tags ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can view session tags" ON session_tags;
DROP POLICY IF EXISTS "Anyone can create tags on active sessions" ON session_tags;
DROP POLICY IF EXISTS "Anyone can delete session tags" ON session_tags;
DROP POLICY IF EXISTS "Session participants can view tags" ON session_tags;
DROP POLICY IF EXISTS "Session participants can create tags" ON session_tags;
DROP POLICY IF EXISTS "Session participants can delete tags" ON session_tags;

-- Create public SELECT policy
CREATE POLICY "Anyone can view session tags"
  ON session_tags FOR SELECT
  TO public
  USING (true);

-- Create public INSERT policy with validation using correct column names
CREATE POLICY "Anyone can create tags on active sessions"
  ON session_tags FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consent_sessions
      WHERE consent_sessions.id = session_tags.session_id
      AND consent_sessions.status = 'active'
      AND consent_sessions.a_authentication IS NOT NULL
      AND consent_sessions.b_authentication IS NOT NULL
    )
    AND (
      SELECT COUNT(*) FROM session_tags 
      WHERE session_id = session_tags.session_id
    ) < 3
  );

-- Create public DELETE policy
CREATE POLICY "Anyone can delete session tags"
  ON session_tags FOR DELETE
  TO public
  USING (true);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_session_tags_session_id ON session_tags(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tags_created_by ON session_tags(created_by_pubky);
CREATE INDEX IF NOT EXISTS idx_session_tags_created_at ON session_tags(created_at);

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_session_tags_updated_at ON session_tags;
CREATE TRIGGER update_session_tags_updated_at
  BEFORE UPDATE ON session_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
