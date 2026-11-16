export function foundationServiceSql() {
  return `create table public.projects(id uuid primary key);alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema storage to authenticated,anon,service_role;grant select,insert,update,delete on storage.objects to authenticated;
 create schema realtime;create table realtime.messages(topic text);alter table realtime.messages enable row level security;
 create function realtime.topic() returns text language sql stable as $$select current_setting('request.topic',true)$$;
 grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;`;
}
