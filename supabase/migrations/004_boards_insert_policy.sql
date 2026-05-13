-- Allow any authenticated user to create a board.
-- The application layer (createBoard action) enforces the one-board-per-user rule.
-- A WITH CHECK that queries profiles here would cause infinite recursion because
-- the profiles RLS policies themselves query profiles.
create policy "authenticated users can create a board"
  on boards for insert
  with check (auth.uid() is not null);
