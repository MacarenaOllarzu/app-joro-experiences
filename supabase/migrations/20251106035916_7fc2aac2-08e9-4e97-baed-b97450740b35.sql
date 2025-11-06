-- Create activity feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  objective_id UUID NOT NULL,
  objective_item_id UUID,
  objective_title TEXT NOT NULL,
  item_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Users can view their own activities
CREATE POLICY "Users can view their own activities"
ON public.activity_feed
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own activities
CREATE POLICY "Users can insert their own activities"
ON public.activity_feed
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_activity_feed_user_created ON public.activity_feed(user_id, created_at DESC);