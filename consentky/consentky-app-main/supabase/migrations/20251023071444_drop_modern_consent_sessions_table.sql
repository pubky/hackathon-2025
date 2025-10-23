/*
  # Drop unused modern_consent_sessions table

  ## Overview
  Removes the `modern_consent_sessions` table which is not referenced anywhere in the codebase.
  The application uses only the `consent_sessions` table for all consent session functionality.

  ## Changes
  - Drop `modern_consent_sessions` table if it exists
  - This is a cleanup operation with no impact on application functionality

  ## Safety
  - Using IF EXISTS to prevent errors if table doesn't exist
  - No data dependencies - table is completely unused in the codebase
*/

DROP TABLE IF EXISTS modern_consent_sessions CASCADE;
