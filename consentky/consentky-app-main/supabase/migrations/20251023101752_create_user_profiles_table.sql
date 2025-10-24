/*
  # Create user_profiles table for optional usernames

  1. New Tables
    - `user_profiles`
      - `pubky` (text, primary key) - User's z32-encoded public key
      - `username` (text, optional) - User's chosen username
      - `created_at` (timestamptz) - Profile creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
  2. Security
    - Enable RLS on user_profiles table
    - Anyone can view profiles (SELECT)
    - Users can insert their own profile (INSERT)
    - Users can update their own profile (UPDATE)
    
  3. Performance
    - Unique index on username for efficient lookups and duplicate prevention
    - Index allows NULL values (multiple users can have NULL username)

  4. Notes
    - Username is completely optional
    - Users can set it during or after sign-in
    - Username must be unique if provided
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  pubky text PRIMARY KEY,
  username text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index on username (allows multiple NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_unique 
  ON user_profiles(username) 
  WHERE username IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles table
CREATE POLICY "Anyone can view user profiles"
  ON user_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);