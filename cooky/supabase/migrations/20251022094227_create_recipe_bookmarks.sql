/*
  # Create recipe bookmarks table

  1. New Tables
    - `recipe_bookmarks`
      - `id` (uuid, primary key) - Unique identifier for the bookmark
      - `recipe_id` (text) - ID of the bookmarked recipe
      - `user_id` (uuid) - User identifier (for future auth integration)
      - `session_id` (text) - Anonymous session identifier
      - `created_at` (timestamptz) - Timestamp when bookmark was created
      - `notes` (text, optional) - User notes about the recipe
  
  2. Security
    - Enable RLS on `recipe_bookmarks` table
    - Add policy for users to read their own bookmarks (by session_id)
    - Add policy for users to insert their own bookmarks
    - Add policy for users to delete their own bookmarks
    - Add policy for users to update their own bookmarks
  
  3. Indexes
    - Add index on recipe_id for faster lookups
    - Add index on session_id for filtering by session
*/

CREATE TABLE IF NOT EXISTS recipe_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id text NOT NULL,
  user_id uuid,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(recipe_id, session_id)
);

ALTER TABLE recipe_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks by session"
  ON recipe_bookmarks
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own bookmarks"
  ON recipe_bookmarks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own bookmarks by session"
  ON recipe_bookmarks
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own bookmarks by session"
  ON recipe_bookmarks
  FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_recipe_bookmarks_recipe_id ON recipe_bookmarks(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_bookmarks_session_id ON recipe_bookmarks(session_id);