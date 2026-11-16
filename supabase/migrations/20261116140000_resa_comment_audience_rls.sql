begin;

-- Comment visibility must follow the parent publication's complete audience
-- policy, including followers, private ownership, communities and organizations.
-- The earlier policy only allowed public posts and the post author, which
-- unintentionally hid comments from authorized followers/community members.
drop policy if exists resa_comments_read on public.resa_comments;

create policy resa_comments_read
on public.resa_comments
for select
to authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.resa_contents c
    where c.id = resa_comments.content_id
      and c.moderation_status = 'active'
      and private.resa_can_view_content(
        c.author_id,
        c.visibility,
        c.community_id,
        c.organization_id
      )
      and not private.resa_is_blocked_by_or_blocking(c.author_id)
  )
);

commit;
