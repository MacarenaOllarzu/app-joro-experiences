-- Allow users to delete their own activities
CREATE POLICY "Users can delete their own activities"
ON public.activity_feed
FOR DELETE
USING (auth.uid() = user_id);