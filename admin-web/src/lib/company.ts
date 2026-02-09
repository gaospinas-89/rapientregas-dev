import { supabase } from "@/lib/supabaseClient";

export async function getCompanyId() {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) return null;
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error: dbError } = await supabase
    .from("app_users")
    .select("company_id")
    .eq("id", userId)
    .limit(1)
    .single();

  if (dbError) return null;
  return data?.company_id ?? null;
}
