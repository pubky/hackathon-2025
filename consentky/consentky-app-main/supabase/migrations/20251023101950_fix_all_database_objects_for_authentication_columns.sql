/*
  # Fix All Column References to Use Authentication Instead of Signature

  This migration updates all database objects (functions, triggers, RLS policies)
  to use the correct column names: a_authentication and b_authentication
*/

-- Step 1: Update cleanup_unsigned_sessions function
CREATE OR REPLACE FUNCTION cleanup_unsigned_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM consent_sessions
  WHERE status = 'pending'
    AND created_at < now() - interval '10 minutes'
    AND (a_authentication IS NULL OR b_authentication IS NULL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update auto_cleanup_old_sessions trigger function
CREATE OR REPLACE FUNCTION auto_cleanup_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM cleanup_unsigned_sessions();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update the session activation trigger function
CREATE OR REPLACE FUNCTION update_session_status_on_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF NEW.a_authentication IS NOT NULL
       AND NEW.b_authentication IS NOT NULL
       AND NEW.window_end > now() THEN
      NEW.status = 'active';
      RETURN NEW;
    END IF;
    
    IF NEW.window_end <= now() THEN
      NEW.status = 'expired';
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.status = 'active' AND NEW.window_end <= now() THEN
    NEW.status = 'expired';
    RETURN NEW;
  END IF;

  IF NEW.window_end <= now() AND NEW.status != 'expired' THEN
    NEW.status = 'expired';
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Ensure triggers are properly attached
DROP TRIGGER IF EXISTS trigger_cleanup_old_sessions ON consent_sessions;
CREATE TRIGGER trigger_cleanup_old_sessions
  AFTER INSERT ON consent_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_cleanup_old_sessions();

DROP TRIGGER IF EXISTS trigger_activate_session_on_signatures ON consent_sessions;
CREATE TRIGGER trigger_activate_session_on_signatures
  BEFORE UPDATE ON consent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_signature();

-- Step 5: Update RLS policies on consent_sessions
DROP POLICY IF EXISTS "Anyone can view active sessions" ON consent_sessions;
CREATE POLICY "Anyone can view active sessions"
  ON consent_sessions FOR SELECT
  USING (
    status = 'active'
    AND a_authentication IS NOT NULL
    AND b_authentication IS NOT NULL
  );

-- Step 6: Update session_tags RLS policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_tags') THEN
    DROP POLICY IF EXISTS "Anyone can create tags on active sessions" ON session_tags;
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

    DROP POLICY IF EXISTS "Anyone can view tags for active sessions" ON session_tags;
    CREATE POLICY "Anyone can view tags for active sessions"
      ON session_tags FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM consent_sessions
          WHERE consent_sessions.id = session_tags.session_id
          AND consent_sessions.status = 'active'
          AND consent_sessions.a_authentication IS NOT NULL
          AND consent_sessions.b_authentication IS NOT NULL
        )
      );
  END IF;
END $$;

-- Step 7: Fix any sessions that should be active
UPDATE consent_sessions
SET 
  status = 'active',
  updated_at = now()
WHERE status = 'pending'
  AND a_authentication IS NOT NULL
  AND b_authentication IS NOT NULL
  AND b_pubky IS NOT NULL
  AND window_end > now();

-- Step 8: Add column comments
COMMENT ON COLUMN consent_sessions.a_authentication IS 'Person A authentication token proving consent agreement';
COMMENT ON COLUMN consent_sessions.b_authentication IS 'Person B authentication token proving consent agreement';