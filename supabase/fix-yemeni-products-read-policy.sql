-- Run once in Supabase SQL Editor if yemeni-products.sql was already installed.
-- Separates anonymous published reads from authenticated editor draft reads.

drop policy if exists "Read published companies and editor drafts" on public.yemeni_companies;
drop policy if exists "Public reads published companies" on public.yemeni_companies;
drop policy if exists "Editors read all companies" on public.yemeni_companies;

create policy "Public reads published companies"
on public.yemeni_companies for select to anon, authenticated
using (is_published);

create policy "Editors read all companies"
on public.yemeni_companies for select to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));
