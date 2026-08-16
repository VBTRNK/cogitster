-- The auth-trigger function only needs to run as the table owner when
-- auth.users fires it; it was never meant to be callable directly. Postgres
-- grants EXECUTE to PUBLIC on new functions by default, which left it
-- reachable (though not runnable, since it's a trigger function) via
-- PostgREST at /rest/v1/rpc/create_player_profile. Close that off.
revoke execute on function cogitster.create_player_profile() from public, anon, authenticated;
