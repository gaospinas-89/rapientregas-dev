"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchCompanySettings, type CompanySettings } from "@/lib/companySettings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminRole, setAdminRole] = useState("admin");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const cfg = await fetchCompanySettings();
      setSettings(cfg);
      setLoading(false);
    })();
  }, []);

  const loadAdmins = async () => {
    setAdminsLoading(true);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setAdminsLoading(false);
      return;
    }
    const res = await fetch("/api/admin/admins", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) {
      const all = json.admins ?? [];
      setAdmins(all.filter((u: any) => u.role === "admin"));
      setOperators(all.filter((u: any) => u.role === "operator"));
    }
    setAdminsLoading(false);
  };

  useEffect(() => {
    void loadAdmins();
  }, []);

  const update = async (key: keyof Omit<CompanySettings, "company_id">, value: boolean) => {
    if (!settings) return;
    setSaving(true);
    const next = { ...settings, [key]: value };
    setSettings(next);
    await supabase
      .from("company_settings")
      .update({ [key]: value })
      .eq("company_id", settings.company_id);
    setSaving(false);
  };

  if (loading) return <div className="card">Cargando...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Activa o desactiva módulos según tu operación</p>
        </div>
        {saving && <span className="muted">Guardando...</span>}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <Toggle
          label="Home"
          checked={settings?.show_home ?? true}
          onChange={(v) => update("show_home", v)}
        />
        <Toggle
          label="Paquetes"
          checked={settings?.show_packages ?? true}
          onChange={(v) => update("show_packages", v)}
        />
        <Toggle
          label="Mensajeros"
          checked={settings?.show_couriers ?? true}
          onChange={(v) => update("show_couriers", v)}
        />
        <Toggle
          label="Devoluciones"
          checked={settings?.show_returns ?? true}
          onChange={(v) => update("show_returns", v)}
        />
        <Toggle
          label="Empresas"
          checked={settings?.show_senders ?? true}
          onChange={(v) => update("show_senders", v)}
        />
        <Toggle
          label="Contabilidad"
          checked={settings?.show_accounting ?? true}
          onChange={(v) => update("show_accounting", v)}
        />
      </div>

      <div className="card" style={{ maxWidth: 520, marginTop: 16 }}>
        <h3>Crear usuario</h3>
        <div className="form-grid">
          <input placeholder="Nombre completo" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          <input placeholder="Celular" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
          <input placeholder="Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          <input placeholder="Contraseña" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
          <select className="select" value={adminRole} onChange={(e) => setAdminRole(e.target.value)}>
            <option value="admin">Administrador</option>
            <option value="operator">Operador</option>
          </select>
        </div>
        {adminMsg && <p className="muted">{adminMsg}</p>}
        <div className="row-actions">
          <button
            className="btn"
            disabled={adminLoading}
            onClick={async () => {
              setAdminMsg(null);
              setAdminLoading(true);
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;
              if (!token) {
                setAdminMsg("Sesión inválida.");
                setAdminLoading(false);
                return;
              }

              const res = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  email: adminEmail,
                  password: adminPassword,
                  fullName: adminName,
                  phone: adminPhone,
                  role: adminRole,
                }),
              });
              const json = await res.json();
              if (!res.ok) {
                setAdminMsg(json.error ?? "No se pudo crear el admin.");
              } else {
                setAdminMsg("Usuario creado correctamente.");
                setAdminEmail("");
                setAdminPassword("");
                setAdminName("");
                setAdminPhone("");
                setAdminRole("admin");
                await loadAdmins();
              }
              setAdminLoading(false);
            }}
          >
            {adminLoading ? "Creando..." : "Crear admin"}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 700, marginTop: 16 }}>
        <h3>Administradores</h3>
        {adminsLoading && <p className="muted">Cargando...</p>}
        {!adminsLoading && (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Celular</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">No hay admins registrados</td>
                </tr>
              )}
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.full_name ?? "-"}</td>
                  <td>{a.phone ?? "-"}</td>
                  <td>{a.is_active ? "Activo" : "Inactivo"}</td>
                  <td>
                    <button
                      className="btn ghost"
                      onClick={async () => {
                        const { data } = await supabase.auth.getSession();
                        const token = data.session?.access_token;
                        if (!token) return;
                        await fetch("/api/admin/admins", {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
                        });
                        await loadAdmins();
                      }}
                    >
                      {a.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ maxWidth: 700, marginTop: 16 }}>
        <h3>Operadores</h3>
        {!adminsLoading && (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Celular</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operators.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">No hay operadores registrados</td>
                </tr>
              )}
              {operators.map((o) => (
                <tr key={o.id}>
                  <td>{o.full_name ?? "-"}</td>
                  <td>{o.phone ?? "-"}</td>
                  <td>{o.is_active ? "Activo" : "Inactivo"}</td>
                  <td>
                    <button
                      className="btn ghost"
                      onClick={async () => {
                        const { data } = await supabase.auth.getSession();
                        const token = data.session?.access_token;
                        if (!token) return;
                        await fetch("/api/admin/admins", {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ id: o.id, is_active: !o.is_active }),
                        });
                        await loadAdmins();
                      }}
                    >
                      {o.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="row-actions" style={{ justifyContent: "space-between", padding: "10px 0" }}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
