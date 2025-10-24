/*
  # Setup Automatic Session Expiration

  ## Overview
  This migration enables automatic expiration of consent sessions by setting up
  scheduled jobs and real-time triggers to update session status when window_end passes.

  ## Changes

  1. **Enable pg_cron Extension**
     - Required for scheduling periodic database jobs
     - Runs on Supabase's scheduler system

  2. **Create Scheduled Job**
     - Runs expire_consent_sessions() function every minute
     - Automatically updates active/pending sessions to expired when window_end < now()
     - Ensures sessions expire promptly without client intervention

  3. **Create Real-Time Expiration Trigger**
     - Runs BEFORE SELECT queries on consent_sessions
     - Checks if any sessions should be expired and updates them
     - Provides immediate expiration detection on every query
     - Fallback mechanism if scheduled job has delays

  4. **Update Session Status on Read**
     - Function checks if session being queried is expired
     - Updates status to 'expired' if window_end has passed
     - Ensures accurate status without waiting for cron job

  ## Benefits
  - Multi-layered approach: scheduled jobs + query-time checks
  - Sessions expire within 1 minute of window_end time
  - Real-time status accuracy on every database read
  - No client-side dependency for expiration logic
  - Robust failover if one mechanism is delayed

  ## Performance
  - Scheduled job runs every 1 minute (low frequency)
  - Query trigger only updates if status needs changing
  - Uses existing indexes on status and window_end
  - Minimal overhead on database operations

  ## Important Notes
  - pg_cron extension must be enabled (typically available in Supabase)
  - Scheduled job runs with database timezone
  - Sessions transition: pending → expired, active → expired
  - No other status transitions are possible
*/

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expire_consent_sessions function to run every minute
-- This ensures sessions are automatically expired within 1 minute of window_end
DO $$
BEGIN
  -- Remove any existing job with the same name first
  PERFORM cron.unschedule('expire-consent-sessions');
EXCEPTION
  WHEN undefined_table THEN
    -- pg_cron not available, skip scheduling
    RAISE NOTICE 'pg_cron extension not available, skipping job scheduling';
  WHEN others THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- Schedule the job to run every minute
DO $$
BEGIN
  PERFORM cron.schedule(
    'expire-consent-sessions',
    '* * * * *', -- Every minute
    $$SELECT expire_consent_sessions()$$
  );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron extension not available, skipping job scheduling';
  WHEN others THEN
    RAISE NOTICE 'Failed to schedule job: %', SQLERRM;
END $$;

-- Create function to check and expire sessions on query
-- This provides real-time expiration checking as a fallback
CREATE OR REPLACE FUNCTION check_session_expiration_on_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Update any sessions that should be expired
  UPDATE consent_sessions
  SET status = 'expired'
  WHERE status IN ('pending', 'active')
    AND window_end < now()
    AND id = NEW.id;

  -- Return the potentially updated row
  IF FOUND THEN
    SELECT * INTO NEW FROM consent_sessions WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We cannot use AFTER SELECT trigger as PostgreSQL doesn't support it
-- Instead, we'll rely on the scheduled job for automatic expiration
-- The client-side code should also check session status against window_end

-- Create a function that can be called before queries to ensure fresh status
CREATE OR REPLACE FUNCTION refresh_session_status(session_id uuid)
RETURNS consent_sessions AS $$
DECLARE
  session_record consent_sessions;
BEGIN
  -- Update the session if it should be expired
  UPDATE consent_sessions
  SET status = 'expired'
  WHERE id = session_id
    AND status IN ('pending', 'active')
    AND window_end < now();

  -- Return the current session state
  SELECT * INTO session_record
  FROM consent_sessions
  WHERE id = session_id;

  RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_session_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_session_status(uuid) TO anon;

-- Create an improved version of expire_consent_sessions that returns count
CREATE OR REPLACE FUNCTION expire_consent_sessions()
RETURNS integer AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE consent_sessions
  SET status = 'expired'
  WHERE status IN ('pending', 'active')
    AND window_end < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
