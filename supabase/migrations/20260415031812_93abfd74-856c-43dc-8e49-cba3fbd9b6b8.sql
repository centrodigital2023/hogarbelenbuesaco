-- Restrict 3-arg enqueue_email to service_role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb, integer) TO service_role;
