-- Permission tests for schema.sql. Run after auth_stub.sql + schema.sql; any failed check raises an error.
\set ON_ERROR_STOP on
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','Admin@Crew.test'),
 ('00000000-0000-0000-0000-00000000000e','editor@crew.test'),
 ('00000000-0000-0000-0000-00000000000f','editor2@crew.test'),
 ('00000000-0000-0000-0000-000000000001','viewer@crew.test'),
 ('00000000-0000-0000-0000-000000000002','stranger@crew.test');
update public.profiles set role='admin'  where email='admin@crew.test';
update public.profiles set role='editor' where email in ('editor@crew.test','editor2@crew.test');

create function pg_temp.as_user(uid text, em text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub',uid,'email',em,'role','authenticated')::text, false); end $$;
create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;

-- editor creates a project
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e','editor@crew.test');
set role authenticated;
insert into public.projects (id,name,data) values ('11111111-1111-1111-1111-111111111111','Arena A','{"v":1}');
select pg_temp.expect((select owner_email from public.projects where id='11111111-1111-1111-1111-111111111111')='editor@crew.test','editor creates project; owner and email filled in');
insert into public.project_shares values ('11111111-1111-1111-1111-111111111111','viewer@crew.test');
insert into public.project_shares values ('11111111-1111-1111-1111-111111111111','notyet@crew.test');
select pg_temp.expect((select count(*) from public.project_shares)=2,'editor shares with a user and a not-yet-signed-up email');
select pg_temp.expect((select count(*) from public.profiles)=1,'editor sees only own profile');
update public.profiles set role='admin' where id='00000000-0000-0000-0000-00000000000e';
reset role; select pg_temp.expect((select role from public.profiles where email='editor@crew.test')='editor','editor cannot promote self'); set role authenticated;

-- viewer
select pg_temp.as_user('00000000-0000-0000-0000-000000000001','viewer@crew.test');
select pg_temp.expect((select count(*) from public.projects)=1,'viewer sees the shared project');
select pg_temp.expect((select count(*) from public.project_shares)=1,'viewer sees only their own share row');
update public.projects set name='hacked' where id='11111111-1111-1111-1111-111111111111';
delete from public.projects where id='11111111-1111-1111-1111-111111111111';
reset role; select pg_temp.expect((select name from public.projects)='Arena A','viewer cannot edit or delete a shared project'); set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001','viewer@crew.test');
do $$ begin insert into public.projects (name,data) values ('mine','{}'); raise exception 'FAIL: viewer created a project'; exception when insufficient_privilege then raise notice 'ok  viewer cannot create projects'; end $$;
do $$ begin insert into public.project_shares values ('11111111-1111-1111-1111-111111111111','friend@crew.test'); raise exception 'FAIL: viewer reshared'; exception when insufficient_privilege then raise notice 'ok  viewer cannot reshare'; end $$;

-- stranger and another editor
select pg_temp.as_user('00000000-0000-0000-0000-000000000002','stranger@crew.test');
select pg_temp.expect((select count(*) from public.projects)=0,'unshared user sees nothing');
select pg_temp.expect((select count(*) from public.project_shares)=0,'unshared user sees no shares');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f','editor2@crew.test');
select pg_temp.expect((select count(*) from public.projects)=0,'another editor cannot see an unshared project');
do $$ begin insert into public.project_shares values ('11111111-1111-1111-1111-111111111111','editor2@crew.test'); raise exception 'FAIL: non-owner shared'; exception when insufficient_privilege then raise notice 'ok  non-owner cannot share into a project'; end $$;
do $$ begin insert into public.projects (owner,name,data) values ('00000000-0000-0000-0000-00000000000e','spoof','{}'); raise exception 'FAIL: spoofed owner'; exception when insufficient_privilege then raise notice 'ok  cannot create a project owned by someone else'; end $$;

-- owner cannot hand the project to someone else by update
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e','editor@crew.test');
update public.projects set owner='00000000-0000-0000-0000-00000000000f', name='Arena A2' where id='11111111-1111-1111-1111-111111111111';
reset role; select pg_temp.expect((select owner::text from public.projects)='00000000-0000-0000-0000-00000000000e' and (select name from public.projects)='Arena A2','owner can rename but owner field is fixed'); set role authenticated;

-- signing up later with a shared email sees the project
reset role; insert into auth.users values ('00000000-0000-0000-0000-000000000003','NotYet@crew.test'); set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003','notyet@crew.test');
select pg_temp.expect((select count(*) from public.projects)=1,'invitee who signs up later sees the shared project');
-- recipient can leave a share
delete from public.project_shares where email='notyet@crew.test';
select pg_temp.expect((select count(*) from public.projects)=0,'recipient can remove a project from their shared list');

-- admin manages roles
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','admin@crew.test');
select pg_temp.expect((select count(*) from public.profiles)=6,'admin sees all profiles');
update public.profiles set role='editor' where email='viewer@crew.test';
select pg_temp.expect((select role from public.profiles where email='viewer@crew.test')='editor','admin promotes a viewer to editor');
select pg_temp.expect((select count(*) from public.projects)=0,'admin does not see other people''s unshared projects');

-- demoted editor loses write access to own project
reset role; update public.profiles set role='viewer' where email='editor@crew.test'; set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e','editor@crew.test');
update public.projects set name='after demote';
reset role; select pg_temp.expect((select name from public.projects)='Arena A2','demoted editor can no longer edit (still sees own project)');

-- anon sees nothing
set role anon; select pg_temp.as_user('','');
select pg_temp.expect((select count(*) from public.projects)=0,'signed-out requests see nothing');
reset role;
\echo ALL RLS TESTS PASSED
