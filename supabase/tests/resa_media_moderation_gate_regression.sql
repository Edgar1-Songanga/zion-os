\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email)
values ('95600000-0000-4000-8000-000000000001','resa-media-gate@example.test')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub','95600000-0000-4000-8000-000000000001',false);
set role authenticated;

do $test$
begin
  begin
    insert into public.resa_contents(
      id,author_id,type,body,visibility,media_type,media_url,media_path
    ) values (
      '95700000-0000-4000-8000-000000000001',
      auth.uid(),
      'text',
      'Direct public media must be rejected',
      'public',
      'image',
      'https://example.test/unmoderated.jpg',
      null
    );
    raise exception 'Unaudited public media insert unexpectedly succeeded';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.resa_contents(
      id,author_id,type,body,visibility,media_type,media_url,media_path,
      media_moderation_status,media_moderation_provider,media_moderation_model,
      media_moderation_score,media_moderation_categories,media_moderated_at
    ) values (
      '95700000-0000-4000-8000-000000000002',
      auth.uid(),
      'text',
      'Client cannot self-approve media',
      'public',
      'image',
      null,
      auth.uid()::text || '/22222222-2222-4222-8222-222222222222.jpg',
      'approved',
      'forged-provider',
      'forged-model',
      1,
      array['safe']::text[],
      now()
    );
    raise exception 'RESA_TEST_UNEXPECTED_SELF_APPROVAL';
  exception
    when insufficient_privilege or check_violation then null;
    when raise_exception then
      if sqlerrm = 'RESA_TEST_UNEXPECTED_SELF_APPROVAL' then
        raise;
      elsif sqlerrm = 'RESA media must be privately stored and approved by the trusted moderation service' then
        null;
      else
        raise;
      end if;
  end;
end;
$test$;

reset role;
rollback;
