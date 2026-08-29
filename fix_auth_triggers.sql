-- ==============================================================================
-- FIX AUTH REGISTRATION ERROR (Database error saving new user)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. DROP ALL OLD / BROKEN TRIGGERS ON auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_onboarding ON auth.users;

-- 2. DROP OBSOLETE TRIGGER FUNCTIONS THAT CAUSE FAILURES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT 'DROP FUNCTION IF EXISTS ' || oid::regprocedure::text || ' CASCADE;' AS stmt
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND prokind = 'f'
          AND proname IN (
            'handle_auth_user_created',
            'handle_new_user_onboarding',
            'handle_new_user'
          )
    LOOP
        EXECUTE r.stmt;
    END LOOP;
END $$;

-- 3. ENSURE PROPER SCHEMA PERMISSIONS
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. RELOAD SUPABASE POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
