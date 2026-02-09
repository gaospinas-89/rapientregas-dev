"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCompanyId } from "@/lib/company";

type AccountingCourierRow = {
  courier_id: string | null;
  courier_name: string | null;
  total_packages: number;
  delivered_count: number;
  returned_count: number;
};

type AccountingCompanyRow = {
  sender_company_id: string | null;
  sender_company_name: string | null;
  total_packages: number;
  delivered_count: number;
  returned_count: number;
};

export default function AccountingPage() {
  const router = useRouter();
  const [byCourier, setByCourier] = useState<AccountingCourierRow[]>([]);
  const [byCompany, setByCompany] = useState<AccountingCompanyRow[]>([]);
  const [totalPackagesRange, setTotalPackagesRange] = useState(0);
  const [totalAssignedRange, setTotalAssignedRange] = useState(0);
  const [totalUnassignedRange, setTotalUnassignedRange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");
  const [weekValue, setWeekValue] = useState<string>(getCurrentWeekValue());
  const [couriers, setCouriers] = useState<{ id: string; label: string }[]>([]);
  const [filterCourierId, setFilterCourierId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const exportCourierCsv = () => {
    const headers = ["mensajero", "total", "entregados", "devueltos"];
    const rows = byCourier.map((r) => [
      r.courier_name ?? "Sin mensajero",
      r.total_packages,
      r.delivered_count,
      r.returned_count,
    ]);
    downloadCsv(`contabilidad_mensajeros_${weekValue}.csv`, headers, rows);
  };

  const exportCompanyCsv = () => {
    const headers = ["empresa", "total", "entregados", "devueltos"];
    const rows = byCompany.map((r) => [
      r.sender_company_name ?? "Sin empresa",
      r.total_packages,
      r.delivered_count,
      r.returned_count,
    ]);
    downloadCsv(`contabilidad_empresas_${weekValue}.csv`, headers, rows);
  };

  const { weekStart, weekEnd } = useMemo(() => getWeekRangeFromValue(weekValue), [weekValue]);
  const effectiveFrom = dateFrom ? new Date(dateFrom) : weekStart;
  const effectiveTo = dateTo ? new Date(dateTo) : weekEnd;

  useEffect(() => {
    (async () => {
      const cid = await getCompanyId();
      setCompanyId(cid);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);

      const [courierRes, pkgRes] = await Promise.all([
        supabase
          .from("couriers")
          .select("id,full_name,identification")
          .eq("company_id", companyId),
        supabase
          .from("package_list_view")
          .select("id, current_status_id, status_name, sender_company_id, sender_company_name, courier_id, courier_name, created_at")
          .eq("company_id", companyId)
          .gte("created_at", effectiveFrom.toISOString())
          .lt("created_at", effectiveTo.toISOString()),
      ]);

      setCouriers((courierRes.data ?? []).map((c: any) => ({
        id: c.id,
        label: `${c.full_name ?? "Sin nombre"} · ${c.identification ?? "-"}`,
      })));

      const deliveredNames = new Set(["entregado", "entregada"]);
      const returnedNames = new Set(["devuelto", "devolución", "devolucion"]);

      const courierAgg = new Map<string, AccountingCourierRow>();
      const companyAgg = new Map<string, AccountingCompanyRow>();
      let totalCount = 0;
      let assignedCount = 0;
      let unassignedCount = 0;

      for (const p of pkgRes.data ?? []) {
        const statusName = p.status_name ?? "";
        if (statusName.toLowerCase() === "eliminado") continue;

        totalCount += 1;

        const courierId = p.courier_id ?? null;
        if (courierId) assignedCount += 1;
        else unassignedCount += 1;
        if (filterCourierId && courierId !== filterCourierId) continue;
        const courierName = p.courier_name ?? "Sin mensajero";
        const courierKey = courierId ?? "no-courier";
        const companyIdVal = p.sender_company_id ?? null;
        const companyName = p.sender_company_name ?? "Sin empresa";
        const companyKey = companyIdVal ?? "no-company";

        const isDelivered = deliveredNames.has(statusName.toLowerCase());
        const isReturned = returnedNames.has(statusName.toLowerCase());

        if (!courierAgg.has(courierKey)) {
          courierAgg.set(courierKey, {
            courier_id: courierId,
            courier_name: courierName,
            total_packages: 0,
            delivered_count: 0,
            returned_count: 0,
          });
        }
        const cRow = courierAgg.get(courierKey)!;
        cRow.total_packages += 1;
        if (isDelivered) cRow.delivered_count += 1;
        if (isReturned) cRow.returned_count += 1;

        if (!companyAgg.has(companyKey)) {
          companyAgg.set(companyKey, {
            sender_company_id: companyIdVal,
            sender_company_name: companyName,
            total_packages: 0,
            delivered_count: 0,
            returned_count: 0,
          });
        }
        const sRow = companyAgg.get(companyKey)!;
        sRow.total_packages += 1;
        if (isDelivered) sRow.delivered_count += 1;
        if (isReturned) sRow.returned_count += 1;
      }

      setByCourier(Array.from(courierAgg.values()));
      setByCompany(Array.from(companyAgg.values()));
      setTotalPackagesRange(totalCount);
      setTotalAssignedRange(assignedCount);
      setTotalUnassignedRange(unassignedCount);
      setLoading(false);
    };

    void load();
  }, [companyId, weekStart, weekEnd, dateFrom, dateTo, filterCourierId]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Contabilidad</h1>
          <p className="muted">
            Rango: {formatDate(effectiveFrom)} → {formatDate(new Date(effectiveTo.getTime() - 1))}
          </p>
        </div>
        <div className="page-actions">
          <label className="muted">Semana</label>
          <input
            type="week"
            value={weekValue}
            onChange={(e) => setWeekValue(e.target.value)}
          />
        </div>
      </div>
      <div className="card compact" style={{ marginBottom: 16 }}>
        <h3>Resumen del rango</h3>
        <div className="stats-grid" style={{ marginBottom: 12 }}>
          <div className="stat-card">
            <div className="stat-value">{totalPackagesRange}</div>
            <div className="muted">Total paquetes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalAssignedRange}</div>
            <div className="muted">Asignados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalUnassignedRange}</div>
            <div className="muted">Sin mensajero</div>
          </div>
        </div>

        <h3>Filtro histórico por mensajero</h3>
        <div className="form-grid">
          <select value={filterCourierId} onChange={(e) => setFilterCourierId(e.target.value)}>
            <option value="">Todos los mensajeros</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="row-actions">
          <button className="btn ghost" onClick={() => {
            setFilterCourierId("");
            setDateFrom("");
            setDateTo("");
          }}>
            Limpiar
          </button>
        </div>
      </div>

      {loading && <div className="card">Cargando...</div>}

      {!loading && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="page-header" style={{ marginBottom: 8 }}>
              <h3>Por mensajero</h3>
              <button className="btn" onClick={exportCourierCsv}>Exportar CSV</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Mensajero</th>
                  <th>Total</th>
                  <th>Entregados</th>
                  <th>Devueltos</th>
                </tr>
              </thead>
              <tbody>
                {byCourier.map((r, i) => (
                  <tr key={r.courier_id ?? `c-${i}`}>
                    <td>{r.courier_name ?? "Sin mensajero"}</td>
                    <td>{r.total_packages}</td>
                    <td>{r.delivered_count}</td>
                    <td>{r.returned_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button
                className="btn ghost"
                onClick={() => router.push("/dashboard/packages?courier=no_courier")}
              >
                Ver paquetes sin mensajero
              </button>
            </div>
          </div>

          <div className="card">
            <div className="page-header" style={{ marginBottom: 8 }}>
              <h3>Por empresa remitente</h3>
              <button className="btn" onClick={exportCompanyCsv}>Exportar CSV</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Total</th>
                  <th>Entregados</th>
                  <th>Devueltos</th>
                </tr>
              </thead>
              <tbody>
                {byCompany.map((r, i) => (
                  <tr key={r.sender_company_id ?? `s-${i}`}>
                    <td>{r.sender_company_name ?? "Sin empresa"}</td>
                    <td>{r.total_packages}</td>
                    <td>{r.delivered_count}</td>
                    <td>{r.returned_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function downloadCsv(filename: string, headers: (string | number)[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getCurrentWeekValue() {
  const now = new Date();
  const { weekYear, weekNumber } = getISOWeek(now);
  return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
}

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekYear: d.getUTCFullYear(), weekNumber };
}

function getWeekRangeFromValue(value: string) {
  const [yearPart, weekPart] = value.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const monday = new Date(simple);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setUTCDate(simple.getUTCDate() + diff);

  const start = new Date(monday);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 7);
  return { weekStart: start, weekEnd: end };
}

function formatDate(date: Date) {
  return date.toLocaleDateString();
}
