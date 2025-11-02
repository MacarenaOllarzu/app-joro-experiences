-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT NOT NULL,
  city TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for categories (public read)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Create objectives table
CREATE TABLE public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for objectives (public read)
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view objectives"
  ON public.objectives FOR SELECT
  USING (true);

-- Create objective_items table (individual parks, cities, etc.)
CREATE TABLE public.objective_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for objective_items (public read)
ALTER TABLE public.objective_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view objective items"
  ON public.objective_items FOR SELECT
  USING (true);

-- Create user_objectives table (objectives added by users)
CREATE TABLE public.user_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, objective_id)
);

-- Enable RLS for user_objectives
ALTER TABLE public.user_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own objectives"
  ON public.user_objectives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add objectives"
  ON public.user_objectives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their objectives"
  ON public.user_objectives FOR DELETE
  USING (auth.uid() = user_id);

-- Create user_progress table (completed items)
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  objective_item_id UUID NOT NULL REFERENCES public.objective_items(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, objective_item_id)
);

-- Enable RLS for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete progress"
  ON public.user_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, city, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();