-- Create helper function to get email by phone for login
create or replace function public.get_email_by_phone(p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_email text;
begin
  select email into v_email
  from public.profiles
  where phone = p_phone
  limit 1;
  return v_email;
end;
$$;

-- Performance index
create index if not exists idx_profiles_phone on public.profiles (phone);

-- Allow clients to call it
grant execute on function public.get_email_by_phone(text) to anon, authenticated;