"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCompanyId } from "@/lib/company";

type ReturnRow = {
  id: string;
  package_id: string;
  reason_text: string | null;
  created_at: string;
  package_public_code?: string | null;
  sender_company_name?: string | null;
};

type PackageOption = {
  id: string;
  public_code: string;
};

export default function ReturnsAdminPage() {
  const [returnsList, setReturnsList] = useState<ReturnRow[]>([]);
  const [packageId, setPackageId] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const cid = await getCompanyId();
    setCompanyId(cid);

    const { data: statusRows } = await supabase
      .from("package_statuses")
      .select("id,name")
      .eq("company_id", cid);

    const deletedId =
      (statusRows ?? []).find((s: any) => s.name === "Eliminado")?.id ?? null;

    const { data, error } = await supabase
      .from("returns")
      .select("id, package_id, reason_text, created_at, packages(public_code, sender_companies(name))")
      .eq("company_id", cid)
      .order("created_at", { ascending: false });

    if (error) {
      setError("No se pudieron cargar las devoluciones.");
    } else {
      const rows: ReturnRow[] = (data ?? []).map((r: any) => {
        const pkg = Array.isArray(r.packages) ? r.packages[0] : r.packages;
        return {
          id: r.id,
          package_id: r.package_id,
          reason_text: r.reason_text ?? null,
          created_at: r.created_at,
          package_public_code: pkg?.public_code ?? null,
          sender_company_name: pkg?.sender_companies?.name ?? null,
        };
      });
      setReturnsList(rows);
    }

    const pkg = await supabase
      .from("packages")
      .select("id, public_code, current_status_id")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
      .limit(200);

    const activePackages = (pkg.data ?? []).filter(
      (p: any) => !deletedId || p.current_status_id !== deletedId
    );

    setPackages(activePackages.map((p: any) => ({ id: p.id, public_code: p.public_code })));
    setPackageId(activePackages[0]?.id ?? "");

    setLoading(false);
  };

  const createReturn = async () => {
    if (!packageId || !reasonText) {
      setError("Completa paquete y motivo.");
      return;
    }
    if (!companyId) {
      setError("No se pudo identificar la empresa.");
      return;
    }
    const { error } = await supabase
      .from("returns")
      .insert({ package_id: packageId, reason_text: reasonText, company_id: companyId });
    if (error) {
      setError("No se pudo registrar la devolución.");
      return;
    }
    setReasonText("");
    await load();
  };

  const deleteReturn = async (returnId: string) => {
    const ok = window.confirm("¿Eliminar devolución? Esta acción no se puede deshacer.");
    if (!ok) return;

    const { error } = await supabase.from("returns").delete().eq("id", returnId);
    if (error) {
      console.error("deleteReturn error:", error);
      setError("No se pudo eliminar la devolución.");
      alert(error.message);
      return;
    }
    await load();
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Devoluciones</h1>
          <p className="muted">Registro y consulta</p>
        </div>
      </div>

      <div className="card compact" style={{ marginBottom: 16 }}>
        <h3>Registrar devolución</h3>
        <div className="form-grid">
          <select className="select" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.public_code}
              </option>
            ))}
          </select>
          <input className="input" placeholder="Motivo" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
        </div>
        <div className="row-actions">
          <button className="btn" onClick={createReturn}>Registrar</button>
        </div>
      </div>

      {error && <div className="card" style={{ color: "crimson" }}>{error}</div>}
      {loading && <div className="card">Cargando...</div>}

      {!loading && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Empresa</th>
                <th>Motivo</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {returnsList
                .filter((r) => r.package_public_code)
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.package_public_code ?? r.package_id}</td>
                    <td>{r.sender_company_name ?? "-"}</td>
                  <td>{r.reason_text ?? "Sin motivo"}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn danger" onClick={() => deleteReturn(r.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
