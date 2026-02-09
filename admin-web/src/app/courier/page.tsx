"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PackageRow = {
  id: string;
  public_code: string;
  created_at: string;
  zone_name: string | null;
  courier_name: string | null;
  status_name: string | null;
};

type PackageDetail = {
  id: string;
  public_code: string;
  created_at: string;
  sender_name: string;
  recipient_name: string;
  destination_address: string;
  zone_name: string | null;
  status_name: string | null;
  courier_name: string | null;
  sender_company_name: string | null;
};

type ReturnRow = {
  id: string;
  package_id: string;
  reason_text: string | null;
  created_at: string;
};

export default function CourierPage() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [deletedPackages, setDeletedPackages] = useState<PackageRow[]>([]);
  const [returnsList, setReturnsList] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [deliveredStatusId, setDeliveredStatusId] = useState<string | null>(null);
  const [returnedStatusId, setReturnedStatusId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<Record<string, string>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");
  const [weeklyDelivered, setWeeklyDelivered] = useState(0);
  const [weeklyReturned, setWeeklyReturned] = useState(0);

  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const getStatusId = async (name: string) => {
    const { data } = await supabase
      .from("package_statuses")
      .select("id")
      .eq("name", name)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  };

  const load = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: courierRow } = await supabase
      .from("couriers")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    const cid = courierRow?.id ?? null;
    setCourierId(cid);
    if (!cid) {
      setLoading(false);
      return;
    }

    const [delId, retId] = await Promise.all([
      getStatusId("Entregado"),
      getStatusId("Devuelto"),
    ]);
    setDeliveredStatusId(delId);
    setReturnedStatusId(retId);

    const assignments = await supabase
      .from("package_assignments")
      .select("package_id")
      .eq("courier_id", cid)
      .is("unassigned_at", null);

    const packageIds = (assignments.data ?? []).map((a) => a.package_id);

    if (packageIds.length > 0) {
      const pkg = await supabase
        .from("package_detail_view")
        .select("id, public_code, created_at, zone_name, courier_name, status_name")
        .in("id", packageIds)
        .order("created_at", { ascending: false });
      const unique = new Map<string, PackageRow>();
      (pkg.data ?? []).forEach((row) => {
        if (!unique.has(row.id)) unique.set(row.id, row);
      });
      const allRows = Array.from(unique.values());
      setPackages(allRows.filter((r) => r.status_name !== "Eliminado"));
      setDeletedPackages(allRows.filter((r) => r.status_name === "Eliminado"));
    } else {
      setPackages([]);
      setDeletedPackages([]);
    }

    const ret = await supabase
      .from("returns")
      .select("id, package_id, reason_text, created_at")
      .eq("courier_id", cid)
      .order("created_at", { ascending: false });

    setReturnsList(ret.data ?? []);
    if (cid) {
      await loadWeeklySummary(cid);
    }
    setLoading(false);
  };

  const loadWeeklySummary = async (cid: string) => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const start = new Date(now);
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    setWeekStart(start.toISOString());
    setWeekEnd(end.toISOString());

    const deliveredStatusId = await getStatusId("Entregado");
    const returnedStatusId = await getStatusId("Devuelto");

    const [deliveredRes, returnedRes, returnsRes] = await Promise.all([
      supabase
        .from("package_assignments")
        .select("package_id")
        .eq("courier_id", cid)
        .gte("assigned_at", start.toISOString())
        .lte("assigned_at", end.toISOString()),
      supabase
        .from("package_assignments")
        .select("package_id")
        .eq("courier_id", cid)
        .gte("assigned_at", start.toISOString())
        .lte("assigned_at", end.toISOString()),
      supabase
        .from("returns")
        .select("id")
        .eq("courier_id", cid)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString()),
    ]);

    const assignedIds = (deliveredRes.data ?? []).map((r: any) => r.package_id);
    const uniqueAssigned = Array.from(new Set(assignedIds));

    if (uniqueAssigned.length > 0) {
      const delivered = await supabase
        .from("packages")
        .select("id, current_status_id")
        .in("id", uniqueAssigned);
      const deliveredCount = (delivered.data ?? []).filter(
        (p: any) => p.current_status_id === deliveredStatusId
      ).length;
      const returnedCount = (delivered.data ?? []).filter(
        (p: any) => p.current_status_id === returnedStatusId
      ).length;
      setWeeklyDelivered(deliveredCount);
      setWeeklyReturned(returnedCount);
    } else {
      setWeeklyDelivered(0);
      setWeeklyReturned(0);
    }

    if (returnsRes.data) {
      setWeeklyReturned((prev) => Math.max(prev, returnsRes.data.length));
    }
  };

  const markDelivered = async (packageId: string) => {
    if (!deliveredStatusId) return;
    await supabase
      .from("packages")
      .update({ current_status_id: deliveredStatusId })
      .eq("id", packageId);
    await load();
  };

  const registerReturn = async (packageId: string) => {
    if (!courierId || !returnedStatusId) return;
    const reason = returnReason[packageId];
    if (!reason) return;

    await supabase
      .from("returns")
      .insert({
        package_id: packageId,
        courier_id: courierId,
        reason_text: reason,
      });

    await supabase
      .from("packages")
      .update({ current_status_id: returnedStatusId })
      .eq("id", packageId);

    setReturnReason((prev) => ({ ...prev, [packageId]: "" }));
    await load();
  };

  const openDetail = async (packageId: string) => {
    const detailRow = await supabase
      .from("package_detail_view")
      .select("id, public_code, created_at, sender_name, recipient_name, destination_address, zone_name, status_name, courier_name")
      .eq("id", packageId)
      .single();

    let senderCompanyName: string | null = null;
    const companyRow = await supabase
      .from("packages")
      .select("sender_company_id, sender_companies(name)")
      .eq("id", packageId)
      .single();

    const senderCompanies = companyRow.data?.sender_companies;
    if (Array.isArray(senderCompanies) && senderCompanies.length > 0) {
      senderCompanyName = senderCompanies[0]?.name ?? null;
    } else if (senderCompanies && (senderCompanies as any).name) {
      senderCompanyName = (senderCompanies as any).name;
    }

    if (detailRow.data) {
      setDetail({
        ...detailRow.data,
        sender_company_name: senderCompanyName,
      } as PackageDetail);
      setShowDetail(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page">
      {loading && <div className="card">Cargando...</div>}

      {!loading && (
        <>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <img
              src="/logoRapiEntregas.jpeg"
              alt="Rapi Entregas"
              style={{ height: 44, width: "auto", objectFit: "contain" }}
            />
            <div>
              <h3 style={{ margin: 0 }}>Rapi Entregas</h3>
              <p className="muted" style={{ margin: 0 }}>Panel de mensajero</p>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <h3>Mis paquetes</h3>
              <p style={{ fontSize: 28, margin: 0 }}>{packages.length}</p>
            </div>
            <div className="card">
              <h3>Mis devoluciones</h3>
              <p style={{ fontSize: 28, margin: 0 }}>{returnsList.length}</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Contabilidad semanal</h3>
            <p className="muted">
              Semana actual (Lun–Dom): {weekStart ? new Date(weekStart).toLocaleDateString() : "-"}{" "}
              - {weekEnd ? new Date(weekEnd).toLocaleDateString() : "-"}
            </p>
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              <div className="card">
                <h4>Entregados</h4>
                <p style={{ fontSize: 26, margin: 0 }}>{weeklyDelivered}</p>
              </div>
              <div className="card">
                <h4>Devueltos</h4>
                <p style={{ fontSize: 26, margin: 0 }}>{weeklyReturned}</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Mis paquetes</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Municipio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button className="btn ghost" onClick={() => openDetail(p.id)}>
                        {p.public_code}
                      </button>
                    </td>
                    <td>{p.zone_name ?? "Sin municipio"}</td>
                    <td>{p.status_name ?? "Sin estado"}</td>
                    <td style={{ display: "grid", gap: 6 }}>
                      <button
                        className="btn"
                        onClick={() => markDelivered(p.id)}
                        disabled={p.status_name === "Eliminado"}
                      >
                        Marcar entregado
                      </button>
                      <div style={{ display: "grid", gap: 6 }}>
                        <input
                          className="input"
                          placeholder="Motivo devolución"
                          value={returnReason[p.id] ?? ""}
                          onChange={(e) =>
                            setReturnReason((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          disabled={p.status_name === "Eliminado"}
                        />
                        <button
                          className="btn"
                          onClick={() => registerReturn(p.id)}
                          disabled={p.status_name === "Eliminado"}
                        >
                          Registrar devolución
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {deletedPackages.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Paquetes eliminados por admin</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Estos paquetes no se consideran para pago.
              </p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Municipio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedPackages.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.public_code}</td>
                      <td>{p.zone_name ?? "Sin municipio"}</td>
                      <td>{p.status_name ?? "Eliminado"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card">
            <h3>Mis devoluciones</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Paquete</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {returnsList.map((r) => (
                  <tr key={r.id}>
                    <td>{r.package_id}</td>
                    <td>{r.reason_text ?? "Sin motivo"}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showDetail && detail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
          }}
          onClick={() => setShowDetail(false)}
        >
          <div className="modal-card" style={{ width: "min(520px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <h3>Detalle del paquete</h3>
            <p><strong>Código:</strong> {detail.public_code}</p>
            <p><strong>Remitente:</strong> {detail.sender_name}</p>
            <p><strong>Empresa:</strong> {detail.sender_company_name ?? "Sin empresa"}</p>
            <p><strong>Destinatario:</strong> {detail.recipient_name}</p>
            <p><strong>Dirección:</strong> {detail.destination_address}</p>
            <p><strong>Municipio:</strong> {detail.zone_name ?? "Sin municipio"}</p>
            <p><strong>Estado:</strong> {detail.status_name ?? "Sin estado"}</p>
            <div className="row-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setShowDetail(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
