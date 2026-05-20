CREATE TABLE public.generated_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  video_url text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'processing',
  external_id text,
  duration_s integer,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own videos" ON public.generated_videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own videos" ON public.generated_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own videos" ON public.generated_videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own videos" ON public.generated_videos FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_generated_videos_updated_at
BEFORE UPDATE ON public.generated_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'openai';