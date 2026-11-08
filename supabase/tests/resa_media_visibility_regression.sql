\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email)
values ('95000000-0000-4000-8000-000000000001','resa-media-visibility@example.test')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',false);
set role authenticated;

do $test$
begin
  begin
    insert into public.resa_contents(
      id,author_id,type,body,visibility,media_type,media_url,media_path
    ) values (
      '95100000-0000-4000-8000-000000000001',
      auth.uid(),
      'text',
      'Private image must not be public',
      'followers',
      'image',
      'https://example.test/public-image.jpg',
      auth.uid()::text || '/private-image.jpg'
    );
    raise exception 'Private media insert unexpectedly succeeded';
  exception
    when check_violation then
      null;
  end;

  begin
    insert into public.resa_contents(
      id,author_id,type,body,visibility,media_type,media_url,media_path
    ) values (
      '95100000-0000-4000-8000-000000000002',
      auth.uid(),
      'text',
      'Private video must not be public',
      'private',
      'video',
      'https://example.test/public-video.mp4',
      auth.uid()::text || '/private-video.mp4'
    );
    raise exception 'Private video insert unexpectedly succeeded';
  exception
    when check_violation then
      null;
  end;
end;
$test$;

reset role;
rollback;
