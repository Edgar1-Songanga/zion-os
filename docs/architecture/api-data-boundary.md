# ZION API/Data Boundary

The API uses the caller's Supabase access token when acting on behalf of a signed-in user. The publishable key identifies the project; authorization remains enforced by Supabase Auth/RLS.

The API must never use a service-role key in browser code, logs, or source control.

NestJS owns application orchestration and domain rules. Supabase/Postgres owns persistence and row-level authorization. This keeps the API from becoming a second identity or permission database.
