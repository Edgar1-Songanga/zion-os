-- Atomic RESA conversation creation. The API must not leave a conversation row
-- without its participant rows if an RLS check or network request fails midway.
create or replace function public.resa_create_conversation(
  p_member_ids uuid[],
  p_title text default null
)
returns public.resa_conversations
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_targets uuid[];
  v_target uuid;
  v_conversation public.resa_conversations%rowtype;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_member_ids is null or cardinality(p_member_ids) < 1 or cardinality(p_member_ids) > 50 then
    raise exception 'one to fifty participant ids are required' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_member_ids) as supplied(user_id) where supplied.user_id is null) then
    raise exception 'participant ids cannot contain null' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct supplied.user_id order by supplied.user_id), '{}'::uuid[])
    into v_targets
  from unnest(p_member_ids) as supplied(user_id)
  where supplied.user_id <> v_actor;

  if cardinality(v_targets) < 1 or cardinality(v_targets) > 49 then
    raise exception 'a conversation requires one to forty-nine other participants' using errcode = '22023';
  end if;

  -- Serialize creation for a direct pair so concurrent requests converge on one
  -- conversation rather than producing duplicate direct threads.
  if cardinality(v_targets) = 1 then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'resa-direct:' || least(v_actor::text, v_targets[1]::text) || ':' || greatest(v_actor::text, v_targets[1]::text),
        0::bigint
      )
    );

    select c.* into v_conversation
    from public.resa_conversations c
    where c.kind = 'direct'
      and exists (
        select 1 from public.resa_conversation_members m
        where m.conversation_id = c.id and m.user_id = v_actor
      )
      and exists (
        select 1 from public.resa_conversation_members m
        where m.conversation_id = c.id and m.user_id = v_targets[1]
      )
      and (select count(*) from public.resa_conversation_members m where m.conversation_id = c.id) = 2
    order by c.updated_at desc, c.created_at desc
    limit 1;

    if found then
      return v_conversation;
    end if;
  end if;

  insert into public.resa_conversations (kind, title, created_by)
  values (
    case when cardinality(v_targets) = 1 then 'direct' else 'group' end,
    nullif(left(btrim(coalesce(p_title, '')), 120), ''),
    v_actor
  )
  returning * into v_conversation;

  foreach v_target in array array_append(v_targets, v_actor) loop
    insert into public.resa_conversation_members (conversation_id, user_id, role)
    values (
      v_conversation.id,
      v_target,
      case when v_target = v_actor then 'owner' else 'member' end
    );
  end loop;

  return v_conversation;
end;
$function$;

revoke all on function public.resa_create_conversation(uuid[], text) from public, anon;
grant execute on function public.resa_create_conversation(uuid[], text) to authenticated;
comment on function public.resa_create_conversation(uuid[], text) is
  'Creates a RESA conversation and all participant memberships atomically; serializes direct-thread creation for each user pair.';
