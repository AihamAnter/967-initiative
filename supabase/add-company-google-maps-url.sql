-- Run once in Supabase SQL Editor for existing Yemeni Products installations.

alter table if exists public.yemeni_companies
  add column if not exists google_maps_url text;

alter table if exists public.yemeni_companies
  drop constraint if exists yemeni_companies_google_maps_url_check;

alter table if exists public.yemeni_companies
  add constraint yemeni_companies_google_maps_url_check
  check (google_maps_url is null or google_maps_url ~ '^https?://');

comment on column public.yemeni_companies.google_maps_url is
  'Optional Google Maps place, pin, or directions URL for the company location.';
