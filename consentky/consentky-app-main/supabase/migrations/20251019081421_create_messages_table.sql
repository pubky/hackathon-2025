/*
  # Create Pubky Vault Encrypted Messages Table

  1. New Tables
    - `messages`
      - `id` (uuid, primary key) - Unique message identifier
      - `to_pubky` (text, indexed) - Recipient's z32-encoded public key
      - `from_pubky` (text, nullable) - Optional sender's z32-encoded public key
      - `author_hint` (text, nullable) - Optional plaintext sender identifier/name
      - `ciphertext_base64` (text) - Base64-encoded encrypted message content
      - `nonce_base64` (text) - Base64-encoded encryption nonce (24 bytes for NaCl box)
      - `created_at` (timestamptz) - Message creation timestamp
      - `expires_at` (timestamptz, nullable) - Optional expiration timestamp for auto-cleanup
      - `opened_at` (timestamptz, nullable) - Timestamp when recipient first opened the message

  2. Security (Row Level Security)
    - Enable RLS on messages table
    - Public can insert messages (anonymous sending allowed)
    - Only recipient (to_pubky) can read their own messages
    - Only recipient can update opened_at timestamp
    - Only recipient can delete their own messages
    - No one can read other users' messages

  3. Performance
    - Index on to_pubky for efficient inbox queries
    - Index on expires_at for cleanup of expired messages
    - Index on created_at for chronological ordering

  4. Data Integrity
    - All encrypted content stored as base64 strings
    - TTL (expires_at) is optional, null means no expiration
    - Client-side encryption ensures server never sees plaintext
    - Author hint allows identifying sender without compromising encryption

  5. Important Notes
    - All encryption/decryption happens CLIENT-SIDE only
    - Server stores only encrypted envelopes, never plaintext
    - Ed25519 keys from Pubky Ring are converted to X25519 for encryption
    - Uses NaCl sealed box or authenticated box for encryption
*/

-- Drop old tables if they exist
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_pubky text NOT NULL,
  from_pubky text,
  author_hint text,
  ciphertext_base64 text NOT NULL,
  nonce_base64 text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  opened_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_to_pubky ON messages(to_pubky);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_to_created ON messages(to_pubky, created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert messages (anonymous sending)
CREATE POLICY "Anyone can send encrypted messages"
  ON messages FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policy: Only recipient can view their own messages
CREATE POLICY "Recipients can view their own messages"
  ON messages FOR SELECT
  TO public
  USING (to_pubky = current_setting('request.headers', true)::json->>'x-recipient-pubky');

-- RLS Policy: Recipients can mark messages as opened
CREATE POLICY "Recipients can update their own messages"
  ON messages FOR UPDATE
  TO public
  USING (to_pubky = current_setting('request.headers', true)::json->>'x-recipient-pubky')
  WITH CHECK (to_pubky = current_setting('request.headers', true)::json->>'x-recipient-pubky');

-- RLS Policy: Recipients can delete their own messages
CREATE POLICY "Recipients can delete their own messages"
  ON messages FOR DELETE
  TO public
  USING (to_pubky = current_setting('request.headers', true)::json->>'x-recipient-pubky');

-- Function to automatically clean up expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages
  WHERE expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In production, you would schedule this function to run periodically
-- For now, it can be called manually or via a cron job