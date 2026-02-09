import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: "No autorizado.", status: 401 as const };

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) return { error: "Sesión inválida.", status: 401 as const };

  const { data: appUser } = await adminClient
    .from("app_users")
    .select("role, company_id, is_active")
    .eq("id", userData.user.id)
    .limit(1)
    .single();

  if (!appUser || appUser.role !== "admin" || appUser.is_active === false) {
    return { error: "No autorizado.", status: 403 as const };
  }

  return { userId: userData.user.id, companyId: appUser.company_id };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { data, error } = await adminClient
    .from("app_users")
    .select("id, full_name, phone, role, is_active, created_at")
    .eq("company_id", guard.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ admins: data ?? [] });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const id = String(body.id || "").trim();
  const is_active = Boolean(body.is_active);

  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  if (id === guard.userId) {
    return NextResponse.json({ error: "No puedes desactivar tu propio usuario." }, { status: 400 });
  }

  const { error } = await adminClient
    .from("app_users")
    .update({ is_active })
    .eq("id", id)
    .eq("company_id", guard.companyId)
    .eq("role", "admin");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
