/*
  # Create Session Tags Table

  This migration creates a table for storing colorful tags that can be added to consent sessions
  where both participants have opted in (status = 'active').

  ## Tables Created
  
  1. `session_tags`
    - `id` (uuid, primary key) - Unique identifier for each tag
    - `session_id` (text, foreign key) - References consent_sessions.id
    - `tag_text` (text) - The text content of the tag (max 30 characters)
    - `tag_color` (text) - Color identifier for the tag
    - `created_by_pubky` (text) - Public key of user who created the tag
    - `created_at` (timestamptz) - When the tag was created
    - `updated_at` (timestamptz) - When the tag was last updated

  ## Constraints
  
  - Maximum 3 tags per session (enforced via check)
  - Tag text limited to 30 characters for brevity
  - Tag color must be from predefined set
  - Both session participants can add/remove tags
  - Only active sessions (with 2 participants) should have tags

  ## Security
  
  - Enable RLS on session_tags table
  - Both session participants can view tags
  - Both session participants can create tags
  - Both session participants can delete tags
  - Users cannot add tags to sessions they don't participate in

  ## Indexes
  
  - Index on session_id for efficient tag lookups
  - Index on created_by_pubky for user-specific queries
*/

-- Create session_tags table
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

-- Create function to count tags per session
CREATE OR REPLACE FUNCTION count_session_tags(p_session_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tag_count integer;
BEGIN
  SELECT COUNT(*) INTO tag_count
  FROM session_tags
  WHERE session_id = p_session_id;
  
  RETURN tag_count;
END;
$$;

-- Create function to check if user is session participant
CREATE OR REPLACE FUNCTION is_session_participant(p_session_id text, p_pubky text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_participant boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM consent_sessions
    WHERE id = p_session_id
    AND (a_pubky = p_pubky OR b_pubky = p_pubky)
  ) INTO is_participant;
  
  RETURN is_participant;
END;
$$;

-- RLS Policy: Session participants can view tags
CREATE POLICY "Session participants can view tags"
  ON session_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consent_sessions
      WHERE consent_sessions.id = session_tags.session_id
      AND (
        consent_sessions.a_pubky = current_setting('request.headers', true)::json->>'x-pubky'
        OR consent_sessions.b_pubky = current_setting('request.headers', true)::json->>'x-pubky'
      )
    )
  );

-- RLS Policy: Session participants can create tags (max 3 per session)
CREATE POLICY "Session participants can create tags"
  ON session_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consent_sessions
      WHERE consent_sessions.id = session_tags.session_id
      AND consent_sessions.status = 'active'
      AND consent_sessions.a_signature IS NOT NULL
      AND consent_sessions.b_signature IS NOT NULL
      AND (
        consent_sessions.a_pubky = current_setting('request.headers', true)::json->>'x-pubky'
        OR consent_sessions.b_pubky = current_setting('request.headers', true)::json->>'x-pubky'
      )
    )
    AND (
      SELECT COUNT(*) FROM session_tags WHERE session_id = session_tags.session_id
    ) < 3
  );

-- RLS Policy: Session participants can delete tags
CREATE POLICY "Session participants can delete tags"
  ON session_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consent_sessions
      WHERE consent_sessions.id = session_tags.session_id
      AND (
        consent_sessions.a_pubky = current_setting('request.headers', true)::json->>'x-pubky'
        OR consent_sessions.b_pubky = current_setting('request.headers', true)::json->>'x-pubky'
      )
    )
  );

-- Create indexes for efficient queries
CREATE INDEX idx_session_tags_session_id ON session_tags(session_id);
CREATE INDEX idx_session_tags_created_by ON session_tags(created_by_pubky);
CREATE INDEX idx_session_tags_created_at ON session_tags(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_session_tags_updated_at
  BEFORE UPDATE ON session_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION count_session_tags(text) TO authenticated;
GRANT EXECUTE ON FUNCTION count_session_tags(text) TO anon;
GRANT EXECUTE ON FUNCTION is_session_participant(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_session_participant(text, text) TO anon;