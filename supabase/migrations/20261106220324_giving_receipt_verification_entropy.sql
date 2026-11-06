-- Ensure every newly inserted Giving receipt receives a 128-bit random code.
-- A BEFORE INSERT trigger preserves the existing atomic confirmation function and
-- protects every insert path, without changing already-issued receipt codes.

create or replace function private.assign_giving_receipt_verification_code()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
begin
  new.verification_code := upper(encode(extensions.gen_random_bytes(16), 'hex'));
  return new;
end
$function$;

revoke all on function private.assign_giving_receipt_verification_code() from public, anon, authenticated;

drop trigger if exists giving_receipts_verification_entropy on public.giving_receipts;
create trigger giving_receipts_verification_entropy
before insert on public.giving_receipts
for each row
execute function private.assign_giving_receipt_verification_code();

comment on function private.assign_giving_receipt_verification_code() is
  'Assigns 128-bit cryptographically random verification codes to newly issued Giving receipts; existing receipts remain valid.';
