-- Chat conversations
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  provider text NOT NULL DEFAULT 'kling',
  mode text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conv" ON public.chat_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_chat_conv_user ON public.chat_conversations(user_id, updated_at DESC);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_type text,         -- 'image' | 'video' | 'multi' | 'error'
  result_url text,
  result_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own msg" ON public.chat_messages FOR ALL
  USING (conversation_id IN (SELECT id FROM public.chat_conversations WHERE user_id = auth.uid()))
  WITH CHECK (conversation_id IN (SELECT id FROM public.chat_conversations WHERE user_id = auth.uid()));
CREATE INDEX idx_chat_msg_conv ON public.chat_messages(conversation_id, created_at);

-- Multi-scene video projects (separate from existing 'projects' which has different schema)
CREATE TABLE public.chat_video_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Vídeo',
  status text NOT NULL DEFAULT 'pending',  -- pending|generating|merging|ready|failed
  provider text NOT NULL DEFAULT 'kling',
  total_scenes int NOT NULL DEFAULT 1,
  scenes_done int NOT NULL DEFAULT 0,
  output_url text,
  thumbnail_url text,
  duration_seconds int,
  aspect_ratio text DEFAULT '16:9',
  has_audio boolean DEFAULT false,
  has_overlay boolean DEFAULT false,
  overlay_config jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_video_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cvp" ON public.chat_video_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Scenes
CREATE TABLE public.chat_video_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.chat_video_projects(id) ON DELETE CASCADE,
  scene_index int NOT NULL,
  prompt text NOT NULL,
  image_url text,
  clip_url text,
  duration int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  error_msg text,
  fal_req_id text,
  overlay jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_video_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scene" ON public.chat_video_scenes FOR ALL
  USING (project_id IN (SELECT id FROM public.chat_video_projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.chat_video_projects WHERE user_id = auth.uid()));

-- Add overlay columns to existing media tables
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS has_overlay boolean NOT NULL DEFAULT false;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS overlay_cfg jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.generated_videos ADD COLUMN IF NOT EXISTS has_overlay boolean NOT NULL DEFAULT false;
ALTER TABLE public.generated_videos ADD COLUMN IF NOT EXISTS overlay_cfg jsonb NOT NULL DEFAULT '{}'::jsonb;

-- updated_at triggers
CREATE TRIGGER trg_chat_conv_updated BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_vp_updated BEFORE UPDATE ON public.chat_video_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('chat-attachments', 'chat-attachments', false),
  ('final-videos', 'final-videos', true),
  ('audio-tracks', 'audio-tracks', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (user-folder pattern: {user_id}/...)
CREATE POLICY "chat attach read" ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "chat attach write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "chat attach delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "final videos read" ON storage.objects FOR SELECT USING (bucket_id = 'final-videos');
CREATE POLICY "final videos write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'final-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "audio read" ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-tracks' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "audio write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-tracks' AND auth.uid()::text = (storage.foldername(name))[1]);