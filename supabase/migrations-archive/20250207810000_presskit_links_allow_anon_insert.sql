-- Permettre l'insertion sans auth pour éviter les erreurs "Non authentifié"
drop policy if exists "Authenticated users can insert presskit links" on public.presskit_links;
drop policy if exists "Anyone can insert presskit links" on public.presskit_links;

create policy "Anyone can insert presskit links"
  on public.presskit_links
  for insert
  with check (true);
