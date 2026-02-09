"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCompanySettings, type CompanySettings } from "@/lib/companySettings";
import { getCompanyId } from "@/lib/company";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [searchCode, setSearchCode] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchHistory, setSearchHistory] = useState<{ label: string; at: string }[]>([]);

  useEffect(() => {
    const guard = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }
      const userId = data.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("app_users")
        .select("role, is_active")
        .eq("id", userId)
        .limit(1)
        .single();

      if (!userRow || userRow.is_active === false) {
        router.replace("/login");
        return;
      }

      setRole(userRow.role ?? null);
      const cfg = await fetchCompanySettings();
      setSettings(cfg);
      setLoading(false);
    };

    void guard();
  }, [router]);

  useEffect(() => {
    if (!settings) return;
    const path = pathname || "";

    if (role === "operator" && path.includes("/dashboard/settings")) {
      router.replace("/dashboard");
      return;
    }

    if (!settings.show_packages && path.includes("/dashboard/packages")) {
      router.replace("/dashboard");
    }
    if (!settings.show_couriers && path.includes("/dashboard/couriers")) {
      router.replace("/dashboard");
    }
    if (!settings.show_returns && path.includes("/dashboard/returns")) {
      router.replace("/dashboard");
    }
    if (!settings.show_senders && path.includes("/dashboard/senders")) {
      router.replace("/dashboard");
    }
    if (!settings.show_accounting && path.includes("/dashboard/accounting")) {
      router.replace("/dashboard");
    }
  }, [pathname, router, settings]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const canSearch = useMemo(() => !!searchInput.trim(), [searchInput]);

  const lookupPackage = async () => {
    if (!searchInput.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setSearchHistory([]);

    const companyId = await getCompanyId();
    if (!companyId) {
      setSearchError("No se pudo identificar la empresa.");
      setSearchLoading(false);
      return;
    }

    const { data: pkg } = await supabase
      .from("package_list_view")
      .select(
        "id, public_code, created_at, current_status_id, status_name, sender_company_id, sender_company_name, courier_id, courier_name"
      )
      .eq("company_id", companyId)
      .eq("public_code", searchInput.trim())
      .limit(1)
      .single();

    if (!pkg?.id) {
      setSearchError("No se encontró el paquete.");
      setSearchLoading(false);
      return;
    }

    const [statusRes, companyRes, assignRes, courierRes, returnsRes, deletesRes] = await Promise.all([
      supabase
        .from("package_statuses")
        .select("id,name")
        .eq("company_id", companyId),
      supabase
        .from("sender_companies")
        .select("id,name")
        .eq("company_id", companyId),
      supabase
        .from("package_assignments")
        .select("courier_id, created_at, unassigned_at")
        .eq("company_id", companyId)
        .eq("package_id", pkg.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("couriers")
        .select("id, full_name, identification")
        .eq("company_id", companyId),
      supabase
        .from("returns")
        .select("created_at, reason_text")
        .eq("company_id", companyId)
        .eq("package_id", pkg.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("package_deletions")
        .select("created_at, reason")
        .eq("company_id", companyId)
        .eq("package_id", pkg.id)
        .order("created_at", { ascending: true }),
    ]);

    const statusById = new Map((statusRes.data ?? []).map((s: any) => [s.id, s.name]));
    const companyById = new Map((companyRes.data ?? []).map((s: any) => [s.id, s.name]));
    const courierById = new Map(
      (courierRes.data ?? []).map((c: any) => [
        c.id,
        c.full_name && c.full_name.trim().length > 0
          ? c.full_name
          : c.identification ?? "Mensajero",
      ])
    );

    const activeAssign = (assignRes.data ?? []).find((a: any) => !a.unassigned_at);
    const courierName = activeAssign?.courier_id
      ? courierById.get(activeAssign.courier_id) ?? "Sin mensajero"
      : "Sin mensajero";

    const statusName = pkg.status_name ?? statusById.get(pkg.current_status_id) ?? "Sin estado";
    const companyName = pkg.sender_company_name ?? (pkg.sender_company_id ? companyById.get(pkg.sender_company_id) ?? "-" : "-");

    const history: { label: string; at: string }[] = [];
    history.push({ label: "Paquete creado", at: pkg.created_at });
    (assignRes.data ?? []).forEach((a: any) => {
      const name = a.courier_id ? courierById.get(a.courier_id) ?? "Mensajero" : "Mensajero";
      history.push({ label: `Asignado a ${name}`, at: a.created_at });
      if (a.unassigned_at) {
        history.push({ label: `Desasignado de ${name}`, at: a.unassigned_at });
      }
    });
    (returnsRes.data ?? []).forEach((r: any) => {
      history.push({ label: `Devolución: ${r.reason_text ?? "sin motivo"}`, at: r.created_at });
    });
    (deletesRes.data ?? []).forEach((d: any) => {
      history.push({ label: `Eliminado: ${d.reason ?? "sin motivo"}`, at: d.created_at });
    });

    setSearchResult({
      public_code: pkg.public_code,
      created_at: pkg.created_at,
      status_name: statusName,
      courier_name: pkg.courier_name ?? courierName,
      sender_company_name: companyName,
    });
    setSearchHistory(
      history.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    );
    setSearchCode(searchInput.trim());
    setSearchOpen(true);
    setSearchLoading(false);
  };

  if (loading) {
    return <div className="content">Cargando...</div>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="brand">
          <img
            src="/logoRapiEntregas.jpeg"
            alt="Rapi Entregas"
            className="brand-logo"
          />
          <span>Rapi Entregas</span>
        </div>
        <nav className="nav">
          {role !== "operator" && settings?.show_home !== false && (
            <a className="nav-link" href="/dashboard" onClick={() => setNavOpen(false)}>Home</a>
          )}
          {settings?.show_packages !== false && (
            <a className="nav-link" href="/dashboard/packages" onClick={() => setNavOpen(false)}>Paquetes</a>
          )}
          {role !== "operator" && settings?.show_couriers !== false && (
            <a className="nav-link" href="/dashboard/couriers" onClick={() => setNavOpen(false)}>Mensajeros</a>
          )}
          {role !== "operator" && settings?.show_returns !== false && (
            <a className="nav-link" href="/dashboard/returns" onClick={() => setNavOpen(false)}>Devoluciones</a>
          )}
          {role !== "operator" && settings?.show_senders !== false && (
            <a className="nav-link" href="/dashboard/senders" onClick={() => setNavOpen(false)}>Empresas</a>
          )}
          {role !== "operator" && settings?.show_accounting !== false && (
            <a className="nav-link" href="/dashboard/accounting" onClick={() => setNavOpen(false)}>Contabilidad</a>
          )}
          {role !== "operator" && (
            <a className="nav-link" href="/dashboard/settings" onClick={() => setNavOpen(false)}>Settings</a>
          )}
        </nav>
      </aside>
      {navOpen && <button className="backdrop" onClick={() => setNavOpen(false)} aria-label="Cerrar menú" />}
      <section className="content">
        <div className="topbar">
          <div className="topbar-left">
            <button className="button ghost menu-btn" onClick={() => setNavOpen(true)}>Menú</button>
            <button className="button ghost logout-btn" onClick={logout}>Cerrar sesión</button>
          </div>
          <div className="topbar-search">
            <input
              placeholder="Buscar paquete por código"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookupPackage();
                }
              }}
            />
            <button className="button ghost" disabled={!canSearch || searchLoading} onClick={lookupPackage}>
              {searchLoading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
        {children}
      </section>
      {searchOpen && (
        <div className="modal">
          <div className="modal-card">
            <h3>Detalle del paquete</h3>
            {searchError && <p style={{ color: "crimson" }}>{searchError}</p>}
            {!searchError && searchResult && (
              <>
                <div className="form-grid">
                  <div>
                    <strong>Código</strong>
                    <div className="mono">{searchResult.public_code}</div>
                  </div>
                  <div>
                    <strong>Estado</strong>
                    <div>{searchResult.status_name}</div>
                  </div>
                  <div>
                    <strong>Mensajero</strong>
                    <div>{searchResult.courier_name}</div>
                  </div>
                  <div>
                    <strong>Empresa</strong>
                    <div>{searchResult.sender_company_name ?? "-"}</div>
                  </div>
                  <div>
                    <strong>Fecha</strong>
                    <div>{new Date(searchResult.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <h4>Historial</h4>
                  {searchHistory.length === 0 ? (
                    <p className="muted">Sin eventos.</p>
                  ) : (
                    <ul className="list">
                      {searchHistory.map((h, idx) => (
                        <li key={`${h.at}-${idx}`}>
                          <span className="muted">{new Date(h.at).toLocaleString()} · </span>
                          {h.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
            <div className="row-actions">
              <button className="button ghost" onClick={() => setSearchOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
