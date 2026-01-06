-- 1. Function to handle new user signup automatically
-- This ensures every user in Auth has a corresponding Profile in the public table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, toga_coins)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'FREE',
    50
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. One-time fix: Backfill missing profiles for existing users
-- This fixes the issue where current users don't appear in the Admin Panel
INSERT INTO public.profiles (id, email, role, toga_coins)
SELECT id, email, 'FREE', 50
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
