-- Fix search_path on email functions (matching existing signatures)

CREATE OR REPLACE FUNCTION public.enqueue_email(
  queue_name text,
  msg jsonb,
  delay_seconds integer DEFAULT 0
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result bigint;
BEGIN
  SELECT pgmq.send(queue_name, msg, delay_seconds) INTO result;
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS public.read_email_batch(text, integer, integer);

CREATE OR REPLACE FUNCTION public.read_email_batch(
  queue_name text,
  batch_size integer,
  vt integer
)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(
  queue_name text,
  message_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT pgmq.delete(queue_name, message_id) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue text,
  message_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  dlq_name text := source_queue || '_dlq';
  msg jsonb;
  result boolean;
BEGIN
  SELECT message INTO msg FROM pgmq.read(source_queue, 0, 1) WHERE msg_id = message_id;
  IF msg IS NOT NULL THEN
    PERFORM pgmq.send(dlq_name, msg);
    SELECT pgmq.delete(source_queue, message_id) INTO result;
    RETURN result;
  END IF;
  RETURN false;
END;
$$;
