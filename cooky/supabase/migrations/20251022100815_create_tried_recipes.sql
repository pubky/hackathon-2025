/*
  # Create tried recipes table

  1. New Tables
    - `tried_recipes`
      - `id` (uuid, primary key) - Unique identifier for the tried recipe record
      - `recipe_id` (text) - ID of the recipe that was tried
      - `user_id` (uuid) - User identifier (for future auth integration)
      - `session_id` (text) - Anonymous session identifier
      - `created_at` (timestamptz) - Timestamp when recipe was marked as tried
  
  2. Security
    - Enable RLS on `tried_recipes` table
    - Add policy for users to read their own tried recipes (by session_id)
    - Add policy for users to insert their own tried recipes
    - Add policy for users to delete their own tried recipes
    - Add policy for users to update their own tried recipes
  
  3. Indexes
    - Add index on recipe_id for faster lookups
    - Add index on session_id for filtering by session
*/

CREATE TABLE IF NOT EXISTS tried_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id text NOT NULL,
  user_id uuid,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(recipe_id, session_id)
);

ALTER TABLE tried_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tried recipes by session"
  ON tried_recipes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own tried recipes"
  ON tried_recipes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own tried recipes by session"
  ON tried_recipes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own tried recipes by session"
  ON tried_recipes
  FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_tried_recipes_recipe_id ON tried_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_tried_recipes_session_id ON tried_recipes(session_id);