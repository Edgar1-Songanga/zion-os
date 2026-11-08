\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000001','resa-audience-author@example.test'),
 ('96000000-0000-4000-8000-000000000002','resa-audience-follower@example.test'),
 ('96000000-0000-4000-8000-000000000003','resa-audience-outsider@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('96000000-0000-4000-8000-000000000001','Audience Author','{}'::jsonb),
 ('96000000-0000-4000-8000-000000000002','Audience Follower','{}'::jsonb),
 ('96000000-0000-4000-8000-000000000003','Audience Outsider','{}'::jsonb)
on conflict (id) do nothing;

insert into public.resa_contents(id,author_id,type,title,body,visibility,moderation_status)
values
 ('96000000-0000-4000-8000-000000000011','96000000-0000-4000-8000-000000000001','text','Followers-only post','Private to followers','followers','active'),
 ('96000000-0000-4000-8000-000000000012','96000000-0000-4000-8000-000000000001','text','Public post','Visible to all','public','active')
on conflict (id) do nothing;

insert into public.resa_follows(follower_id,followed_id)
values ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001')
on conflict do nothing;

-- A non-follower must neither create nor enumerate a repost of followers-only content.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000003',false);
set role authenticated;

do $test$
begin
  begin
    insert into public.resa_comments(content_id,author_id,body)
    values ('96000000-0000-4000-8000-000000000011',auth.uid(),'Should not be allowed');
    raise exception 'Audience bypass: outsider commented on followers-only content';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.resa_reactions(content_id,user_id,reaction_type)
    values ('96000000-0000-4000-8000-000000000011',auth.uid(),'like');
    raise exception 'Audience bypass: outsider reacted to followers-only content';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.resa_shares(content_id,user_id,share_type)
    values ('96000000-0000-4000-8000-000000000011',auth.uid(),'repost');
    raise exception 'Audience bypass: outsider reposted followers-only content';
  exception when insufficient_privilege then null;
  end;

  if exists (
    select 1 from public.resa_shares
    where content_id='96000000-0000-4000-8000-000000000011'
  ) then
    raise exception 'Audience bypass: outsider enumerated shares of followers-only content';
  end if;
end;
$test$;
reset role;

-- A follower can repost and read the share metadata for content they can access.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',false);
set role authenticated;

insert into public.resa_shares(content_id,user_id,share_type)
values ('96000000-0000-4000-8000-000000000011',auth.uid(),'repost');

do $test$
begin
  if (select count(*) from public.resa_shares
      where content_id='96000000-0000-4000-8000-000000000011'
        and user_id=auth.uid()) <> 1 then
    raise exception 'Authorized follower cannot read own repost';
  end if;
end;
$test$;
reset role;

rollback;
