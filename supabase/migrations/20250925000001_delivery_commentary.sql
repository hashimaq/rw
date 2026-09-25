-- Ball-by-ball Urdu commentary audio metadata (audio bytes in Storage).

CREATE TABLE public.delivery_commentary (
  client_event_id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  innings_id UUID NOT NULL REFERENCES public.innings (id) ON DELETE CASCADE,
  sequence_in_innings INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  commentary_text TEXT,
  audio_storage_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX delivery_commentary_match_innings_seq_idx
  ON public.delivery_commentary (match_id, innings_id, sequence_in_innings);

CREATE TRIGGER delivery_commentary_set_updated_at
  BEFORE UPDATE ON public.delivery_commentary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.delivery_commentary ENABLE ROW LEVEL SECURITY;

CREATE POLICY delivery_commentary_public_read ON public.delivery_commentary
  FOR SELECT TO anon, authenticated
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = delivery_commentary.match_id
        AND (
          public.is_admin()
          OR (m.status IN ('live', 'completed') AND m.is_public_live = true)
        )
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-commentary',
  'delivery-commentary',
  false,
  524288,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_commentary;
