-- User 1 creates a private spiritual chat.
set role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', false);

insert into public.spiritual_chat_conversations (id, user_id, title)
values (
  '52000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  'My private study'
);

insert into public.spiritual_chat_messages (id, conversation_id, user_id, role, content)
values (
  '53000000-0000-4000-8000-000000000001',
  '52000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  'user',
  'Private question'
);

do $$
begin
  if (select count(*) from public.spiritual_chat_conversations) <> 1 then
    raise exception 'Owner must read their spiritual chat conversation';
  end if;
  if (select count(*) from public.spiritual_chat_messages) <> 1 then
    raise exception 'Owner must read their spiritual chat messages';
  end if;
end;
$$;

-- User 2 must not discover or modify user 1's chat.
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000002', false);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.spiritual_chat_conversations) <> 0 then
    raise exception 'Another user must not read private spiritual chat conversations';
  end if;
  if (select count(*) from public.spiritual_chat_messages) <> 0 then
    raise exception 'Another user must not read private spiritual chat messages';
  end if;

  update public.spiritual_chat_conversations
     set title = 'Unauthorized edit'
   where id = '52000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Another user must not update a private conversation';
  end if;

  begin
    insert into public.spiritual_chat_conversations (id, user_id, title)
    values (
      '52000000-0000-4000-8000-000000000002',
      '51000000-0000-4000-8000-000000000001',
      'Forged owner'
    );
    raise exception 'A user must not create a conversation for another owner';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- Confirm the optimized policy definitions retain the statement-level auth lookup.
do $$
declare
  policy_expression text;
begin
  select qual into policy_expression
  from pg_policies
  where schemaname = 'public'
    and tablename = 'spiritual_chat_conversations'
    and policyname = 'spiritual_chat_conversations_owner_select';

  if policy_expression not like '%SELECT auth.uid()%' then
    raise exception 'Conversation SELECT policy is missing the initplan-safe auth lookup';
  end if;

  select qual into policy_expression
  from pg_policies
  where schemaname = 'public'
    and tablename = 'spiritual_chat_messages'
    and policyname = 'spiritual_chat_messages_owner_select';

  if policy_expression not like '%SELECT auth.uid()%' then
    raise exception 'Message SELECT policy is missing the initplan-safe auth lookup';
  end if;
end;
$$;
