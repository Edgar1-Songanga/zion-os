-- RLS policies for the durable Live Studio hand-raise queue inspect the parent
-- live session. Authenticated users need table SELECT privilege for those policy
-- subqueries; the existing resa_live_sessions RLS policy remains the visibility
-- boundary and is not weakened by this grant.
grant select on public.resa_live_sessions to authenticated;
