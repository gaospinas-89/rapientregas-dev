import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const { data: appUser } = await adminClient
      .from("app_users")
      .select("role, company_id")
      .eq("id", userData.user.id)
      .limit(1)
      .single();

    if (!appUser || appUser.role !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "").trim();
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const role = String(body.role || "admin").trim();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Completa email, contraseña y nombre." }, { status: 400 });
    }
    if (!["admin", "operator"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      return NextResponse.json({ error: createError?.message ?? "No se pudo crear el usuario." }, { status: 400 });
    }

    const { error: insertError } = await adminClient.from("app_users").insert({
      id: created.user.id,
      company_id: appUser.company_id,
      role,
      full_name: fullName,
      phone: phone || null,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}
