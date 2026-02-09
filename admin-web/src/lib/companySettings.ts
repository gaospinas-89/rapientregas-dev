import { supabase } from "@/lib/supabaseClient";
import { getCompanyId } from "@/lib/company";

export type CompanySettings = {
  company_id: string;
  show_home: boolean;
  show_packages: boolean;
  show_couriers: boolean;
  show_returns: boolean;
  show_senders: boolean;
  show_accounting: boolean;
};

const defaultSettings: Omit<CompanySettings, "company_id"> = {
  show_home: true,
  show_packages: true,
  show_couriers: true,
  show_returns: true,
  show_senders: true,
  show_accounting: true,
};

export async function fetchCompanySettings() {
  const companyId = await getCompanyId();
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("company_settings")
    .select(
      "company_id, show_home, show_packages, show_couriers, show_returns, show_senders, show_accounting"
    )
    .eq("company_id", companyId)
    .single();

  if (!error && data) return data as CompanySettings;

  await supabase.from("company_settings").insert({
    company_id: companyId,
    ...defaultSettings,
  });

  return {
    company_id: companyId,
    ...defaultSettings,
  } as CompanySettings;
}
