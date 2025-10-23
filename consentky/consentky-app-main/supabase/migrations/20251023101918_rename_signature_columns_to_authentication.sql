/*
  # Rename signature columns to authentication

  This migration renames the columns from a_signature/b_signature to 
  a_authentication/b_authentication to better reflect that these are
  authentication tokens from Pubky Ring, not traditional cryptographic signatures.
*/

-- Rename the columns
ALTER TABLE consent_sessions 
  RENAME COLUMN a_signature TO a_authentication;

ALTER TABLE consent_sessions 
  RENAME COLUMN b_signature TO b_authentication;