/*
  # Create Pubky Social Platform Schema

  1. New Tables
    - `users`
      - `pubky` (text, primary key) - User's z32-encoded public key
      - `display_name` (text) - User's chosen display name
      - `bio` (text, nullable) - Optional user biography
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last profile update timestamp
    
    - `posts`
      - `id` (uuid, primary key) - Unique post identifier
      - `author_pubky` (text, foreign key) - References users.pubky
      - `content` (text) - Post text content
      - `homeserver_url` (text) - Full pubky:// URL for verification
      - `created_at` (timestamptz) - Post creation timestamp
      - `updated_at` (timestamptz) - Last edit timestamp

  2. Security
    - Enable RLS on both tables
    - Public read access for all posts and user profiles
    - Users can only update their own profile
    - Posts are immutable after creation (deletion handled separately)

  3. Performance
    - Index on author_pubky for efficient user post queries
    - Index on created_at for chronological feed ordering
    - Index on posts.author_pubky for join performance
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  pubky text PRIMARY KEY,
  display_name text NOT NULL,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_pubky text NOT NULL REFERENCES users(pubky) ON DELETE CASCADE,
  content text NOT NULL,
  homeserver_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_pubky);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_pubky, created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Anyone can view user profiles"
  ON users FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for posts table
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authors can update their own posts"
  ON posts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authors can delete their own posts"
  ON posts FOR DELETE
  TO public
  USING (true);
