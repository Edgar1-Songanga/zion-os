import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const ORG = "b8aa6049-ca38-43f8-a19f-a5e3e595cf7f";
const accounts = [
  ["zion.secretaria","secretaria@zion-demo.test","ZION — Secretaria","secretary","Secretaria"],
  ["zion.mordomia","mordomia@zion-demo.test","ZION — Mordomia","stewardship_manager","Mordomia"],
  ["zion.tesouraria","tesouraria@zion-demo.test","ZION — Tesouraria","finance_manager","Finanças"],
  ["zion.pastorado","pastor@zion-demo.test","ZION — Pastorado","pastor","Pastorado"],
  ["zion.escolasabatina","escolasabatina@zion-demo.test","ZION — Escola Sabatina","department_leader","Escola Sabatina"],
  ["zion.jovens","jovens@zion-demo.test","ZION — Ministério Jovem","youth_director","Ministério Jovem"],
  ["zion.membro","membro@zion-demo.test","ZION — Membro","member",null],
  ["resa.publico","publico@resa-demo.test","RESA — Público",null,null],
] as const;
const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};

function reply(data: unknown, status=200) {
  return new Response(JSON.stringify(data), {status,headers});
}
function password() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
  const bytes = crypto.getRandomValues(new Uint8Array(28));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok",{headers});
  if (req.method !== "POST") return reply({error:"Method not allowed"},405);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/,"");
  if (!token) return reply({error:"Authentication required"},401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply({error:"Server configuration incomplete"},503);

  const auth = createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data: callerData,error: callerError} = await auth.auth.getUser(token);
  const caller = callerData.user;
  if (callerError || !caller) return reply({error:"Invalid session"},401);
  if (caller.app_metadata?.zion_global_role !== "global_admin" || caller.app_metadata?.zion_verified !== true)
    return reply({error:"Verified ZION global administrator required"},403);

  const admin = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const {data: org,error: orgError} = await admin.from("organizations").select("id,is_active").eq("id",ORG).maybeSingle();
    if (orgError || !org?.is_active) return reply({error:"Demo organization unavailable"},409);
    const keys = [...new Set(accounts.map(a=>a[3]).filter(Boolean))] as string[];
    const {data: roles,error: roleError} = await admin.from("roles").select("id,key").in("key",keys);
    if (roleError) throw roleError;
    const roleIds = new Map((roles||[]).map(r=>[r.key,r.id]));
    const missing = keys.filter(k=>!roleIds.has(k));
    if (missing.length) return reply({error:"Missing role definitions",missing},409);
    const {data: page,error: listError} = await admin.auth.admin.listUsers({page:1,perPage:1000});
    if (listError) throw listError;
    const existing = new Map((page.users||[]).map(u=>[(u.email||"").toLowerCase(),u]));
    const credentials = [];
    const results = [];

    for (const [key,email,name,role,department] of accounts) {
      let user = existing.get(email);
      let temporaryPassword = "";
      let created = false;
      if (user && (user.app_metadata?.zion_demo_account !== true || user.app_metadata?.zion_demo_key !== key)) {
        results.push({username:key,status:"conflict"}); continue;
      }
      if (!user) {
        temporaryPassword = password();
        const result = await admin.auth.admin.createUser({
          email,password:temporaryPassword,email_confirm:true,
          user_metadata:{display_name:name,demo_account:true},
          app_metadata:{zion_demo_account:true,zion_demo_key:key,zion_global_role:"member",zion_verified:false,resa_access_level:"authenticated_public"}
        });
        if (result.error || !result.data.user) {
          results.push({username:key,status:"error",reason:result.error?.message||"Auth creation failed"}); continue;
        }
        user = result.data.user; created = true; existing.set(email,user);
      }
      try {
        const {error: profileError} = await admin.from("profiles").upsert({
          id:user.id,display_name:name,first_name:name,last_name:"Demonstração",locale:"pt-AO",timezone:"Africa/Luanda"
        },{onConflict:"id"});
        if (profileError) throw profileError;
        if (role) {
          const {data: membership,error: membershipError} = await admin.from("organization_memberships").upsert({
            organization_id:ORG,user_id:user.id,role_id:roleIds.get(role),status:"ACTIVE"
          },{onConflict:"organization_id,user_id"}).select("id").single();
          if (membershipError || !membership) throw membershipError || new Error("Membership missing");
          if (department) {
            let {data: unit,error: unitError} = await admin.from("organization_units").select("id").eq("organization_id",ORG).eq("name",department).maybeSingle();
            if (unitError) throw unitError;
            if (!unit) {
              const inserted = await admin.from("organization_units").insert({organization_id:ORG,name:department,unit_type:"DEPARTMENT",description:"Departamento da IASD Porto Seco.",is_active:true}).select("id").single();
              if (inserted.error || !inserted.data) throw inserted.error || new Error("Department missing");
              unit = inserted.data;
            }
            const {error: assignmentError} = await admin.from("unit_memberships").upsert({unit_id:unit.id,membership_id:membership.id},{onConflict:"unit_id,membership_id"});
            if (assignmentError) throw assignmentError;
          }
        }
        const {error: auditError} = await admin.from("audit_logs").insert({
          organization_id:role?ORG:null,actor_user_id:caller.id,action:created?"demo.account.created":"demo.account.checked",
          resource_type:"auth_user",resource_id:user.id,metadata:{demo_key:key,role_key:role,department}
        });
        if (auditError) throw auditError;
        if (created) credentials.push({username:key,email,password:temporaryPassword});
        results.push({username:key,email,status:created?"created":"already_created",email_confirmed:true});
      } catch (e) {
        if (created) credentials.push({username:key,email,password:temporaryPassword});
        results.push({username:key,email,status:"setup_error",reason:e instanceof Error?e.message:"Unknown error"});
      }
    }
    return reply({
      ok:results.every(r=>r.status==="created"||r.status==="already_created"),
      credentials,results,
      note:"Passwords are returned only once, at creation. No verification email is sent. The reserved .test addresses cannot receive email or password-reset messages."
    });
  } catch (e) {
    console.error("ZION demo account provisioning failed",e instanceof Error?e.message:"unknown");
    return reply({error:"Provisioning failed"},500);
  }
});