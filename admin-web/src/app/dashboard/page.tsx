"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCompanyId } from "@/lib/company";

type PackageRow = {
  id: string;
  public_code: string;
  created_at: string;
  courier_name: string | null;
};

type CourierRow = {
  id: string;
  full_name: string | null;
  identification: string | null;
  is_active: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    packages: 0,
    couriers: 0,
    returns: 0,
  });
  const [latestPackages, setLatestPackages] = useState<PackageRow[]>([]);
  const [activeCouriers, setActiveCouriers] = useState<CourierRow[]>([]);
  const [pendingUnassigned, setPendingUnassigned] = useState<PackageRow[]>([]);
  const [pendingOld, setPendingOld] = useState<PackageRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const companyId = await getCompanyId();

        const statusRows = await supabase
          .from("package_statuses")
          .select("id,name")
          .eq("company_id", companyId);

        const deletedId =
          (statusRows.data ?? []).find((s: any) => s.name === "Eliminado")?.id ?? null;

        const [packagesCount, couriersCount, returnsCount] = await Promise.all([
          supabase
            .from("packages")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .neq("current_status_id", deletedId ?? ""),
          supabase.from("couriers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          supabase.from("returns").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        ]);

        setStats({
          packages: packagesCount.count ?? 0,
          couriers: couriersCount.count ?? 0,
          returns: returnsCount.count ?? 0,
        });

        const [pkgRes, courierRes, assignRes, statusRes] = await Promise.all([
          supabase
            .from("packages")
            .select("id, public_code, created_at, current_status_id")
            .eq("company_id", companyId)
            .neq("current_status_id", deletedId ?? "")
            .order("created_at", { ascending: false })
            .limit(6),
          supabase.from("couriers").select("id,full_name,identification").eq("company_id", companyId),
          supabase
            .from("package_assignments")
            .select("package_id,courier_id,unassigned_at")
            .eq("company_id", companyId)
            .is("unassigned_at", null),
          supabase
            .from("package_statuses")
            .select("id,name")
            .eq("company_id", companyId),
        ]);

        if (pkgRes.error) throw pkgRes.error;

        const courierById = new Map(
          (courierRes.data ?? []).map((c: any) => [
            c.id,
            `${c.full_name ?? "Sin nombre"} · ${c.identification ?? "-"}`,
          ])
        );
        const courierByPackage = new Map(
          (assignRes.data ?? []).map((a) => [a.package_id, a.courier_id])
        );
        const statusById = new Map((statusRes.data ?? []).map((s) => [s.id, s.name]));

        const latest = (pkgRes.data ?? []).map((p) => ({
          id: p.id,
          public_code: p.public_code,
          created_at: p.created_at,
          courier_name: courierById.get(courierByPackage.get(p.id) ?? "") ?? null,
        }));
        setLatestPackages(latest);

        const receivedStatusId = (statusRes.data ?? []).find((s: any) => s.name === "Recibido")?.id;
        const eliminatedStatusId = (statusRes.data ?? []).find((s: any) => s.name === "Eliminado")?.id;

        const [unassignedRes, oldRes] = await Promise.all([
          supabase
            .from("packages")
            .select("id, public_code, created_at, current_status_id")
            .eq("company_id", companyId)
            .neq("current_status_id", eliminatedStatusId ?? ""),
          receivedStatusId
            ? supabase
                .from("packages")
                .select("id, public_code, created_at, current_status_id")
                .eq("company_id", companyId)
                .eq("current_status_id", receivedStatusId)
                .lte("created_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const unassigned = (unassignedRes.data ?? []).filter(
          (p: any) => !courierByPackage.get(p.id)
        );
        setPendingUnassigned(
          unassigned.slice(0, 6).map((p: any) => ({
            id: p.id,
            public_code: p.public_code,
            created_at: p.created_at,
            courier_name: null,
          }))
        );
        setPendingOld(
          (oldRes.data ?? []).slice(0, 6).map((p: any) => ({
            id: p.id,
            public_code: p.public_code,
            created_at: p.created_at,
            courier_name: null,
          }))
        );

        const couriers = await supabase
          .from("couriers")
          .select("id, full_name, identification, is_active")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("full_name", { ascending: true })
          .limit(6);

        if (couriers.error) throw couriers.error;
        setActiveCouriers(couriers.data ?? []);
      } catch (err) {
        setError("No se pudo cargar el dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  return (
    <main style={{ minHeight: "100vh" }}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">Resumen operativo</p>
          </div>
        </div>

        {loading && <div className="card">Cargando...</div>}
        {error && <div className="card" style={{ color: "crimson" }}>{error}</div>}

        {!loading && !error && (
          <>
            <section className="grid grid-4">
              <StatCard title="Total paquetes" value={stats.packages} icon="📦" />
              <StatCard title="Total mensajeros" value={stats.couriers} icon="🚚" />
              <StatCard title="Total devoluciones" value={stats.returns} icon="↩" />
            </section>

            <section className="grid grid-2">
              <div className="card">
                <h3>Últimos paquetes</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Mensajero</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestPackages.map((p) => (
                      <tr key={p.id}>
                        <td>{p.public_code}</td>
                        <td>{p.courier_name ?? "Sin asignar"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h3>Mensajeros activos</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCouriers.map((c) => (
                      <tr key={c.id}>
                        <td>{`${c.full_name ?? "Sin nombre"} · ${c.identification ?? "-"}`}</td>
                        <td><span className="badge">Activo</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-2">
              <div className="card">
                <h3>Paquetes sin mensajero</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUnassigned.length === 0 && (
                      <tr>
                        <td colSpan={2} className="muted">No hay pendientes</td>
                      </tr>
                    )}
                    {pendingUnassigned.map((p) => (
                      <tr key={p.id}>
                        <td>{p.public_code}</td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h3>Recibidos hace más de 2 días</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOld.length === 0 && (
                      <tr>
                        <td colSpan={2} className="muted">No hay pendientes</td>
                      </tr>
                    )}
                    {pendingOld.map((p) => (
                      <tr key={p.id}>
                        <td>{p.public_code}</td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span className="badge">Hoy</span>
      </div>
      <h2 style={{ margin: "12px 0 4px" }}>{value}</h2>
      <p style={{ margin: 0, color: "var(--muted)" }}>{title}</p>
    </div>
  );
}
