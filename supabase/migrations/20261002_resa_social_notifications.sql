-- RESA interaction notifications. Triggers are security-definer and do not expose
-- notification INSERT permissions to end users.
create or replace function public.resa_follow_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.follower_id <> new.followed_id then
    insert into public.notifications(user_id, type, title, body, channel, priority, data)
    values (new.followed_id, 'resa.follow', 'Novo seguidor', 'Alguém começou a seguir o seu perfil.', 'in_app', 'normal', jsonb_build_object('actor_id', new.follower_id));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_resa_follow_notification on public.resa_follows;
create trigger trg_resa_follow_notification after insert on public.resa_follows for each row execute function public.resa_follow_notification();

create or replace function public.resa_content_author_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.resa_contents where id = new.content_id;
  if owner_id is not null and owner_id <> new.author_id then
    insert into public.notifications(user_id, type, title, body, channel, priority, data)
    values (owner_id, 'resa.comment', 'Novo comentário', 'A sua publicação recebeu um comentário.', 'in_app', 'normal', jsonb_build_object('content_id', new.content_id, 'actor_id', new.author_id, 'comment_id', new.id));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_resa_comment_notification on public.resa_comments;
create trigger trg_resa_comment_notification after insert on public.resa_comments for each row execute function public.resa_content_author_notification();

create or replace function public.resa_reaction_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.resa_contents where id = new.content_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, type, title, body, channel, priority, data)
    values (owner_id, 'resa.reaction', 'Nova reação', 'A sua publicação recebeu uma reação.', 'in_app', 'low', jsonb_build_object('content_id', new.content_id, 'actor_id', new.user_id, 'reaction_type', new.reaction_type));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_resa_reaction_notification on public.resa_reactions;
create trigger trg_resa_reaction_notification after insert on public.resa_reactions for each row execute function public.resa_reaction_notification();

create or replace function public.resa_share_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.resa_contents where id = new.content_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, type, title, body, channel, priority, data)
    values (owner_id, 'resa.share', 'Publicação partilhada', 'A sua publicação foi partilhada.', 'in_app', 'normal', jsonb_build_object('content_id', new.content_id, 'actor_id', new.user_id, 'share_type', new.share_type));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_resa_share_notification on public.resa_shares;
create trigger trg_resa_share_notification after insert on public.resa_shares for each row execute function public.resa_share_notification();
