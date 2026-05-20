-- Cost tracking columns
ALTER TABLE public.generated_images
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.project_scenes
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fal_request_id text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS total_cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_scenes integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_spent_usd numeric(10,4) NOT NULL DEFAULT 0;