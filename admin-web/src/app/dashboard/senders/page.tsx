"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCompanyId } from "@/lib/company";

type SenderRow = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  zone_id: string | null;
  zone_name?: string | null;
};
type ZoneOption = { id: string; name: string; is_active?: boolean };

export default function SendersAdminPage() {
  const [senders, setSenders] = useState<SenderRow[]>([]);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zonesSupportActive, setZonesSupportActive] = useState(true);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const cid = await getCompanyId();
    setCompanyId(cid);

    const { data, error } = await supabase
      .from("sender_companies")
      .select("id, name, contact_name, contact_phone, zone_id")
      .eq("company_id", cid)
      .order("name", { ascending: true });
    if (error) {
      setError("No se pudieron cargar las empresas.");
    } else {
      const zoneRes = await supabase
        .from("zones")
        .select("id, name, is_active")
        .eq("company_id", cid)
        .order("name", { ascending: true });

      let zoneRows: ZoneOption[] = [];
      if (zoneRes.error) {
        const zoneFallback = await supabase
          .from("zones")
          .select("id, name")
          .eq("company_id", cid)
          .order("name", { ascending: true });
        zoneRows = (zoneFallback.data ?? []).map((z: any) => ({
          id: z.id,
          name: z.name,
          is_active: true,
        }));
        setZonesSupportActive(false);
      } else {
        zoneRows = (zoneRes.data ?? []) as ZoneOption[];
        setZonesSupportActive(true);
      }
      setZones(zoneRows);

      const zoneMap = new Map(zoneRows.map((z) => [z.id, z.name]));
      setSenders(
        (data ?? []).map((s: any) => ({
          ...s,
          zone_name: s.zone_id ? zoneMap.get(s.zone_id) ?? null : null,
        }))
      );
    }
    setLoading(false);
  };

  const createSender = async () => {
    if (!name) {
      setError("Escribe el nombre de la empresa.");
      return;
    }
    if (!companyId) {
      setError("No se pudo identificar la empresa.");
      return;
    }
    const payload = {
      name,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      zone_id: zoneId || null,
      company_id: companyId,
    };

    const { error } = await supabase.from("sender_companies").insert(payload);
    if (error) {
      setError("No se pudo crear la empresa.");
      return;
    }
    setName("");
    setContactName("");
    setContactPhone("");
    setZoneId("");
    await load();
  };

  const createZone = async () => {
    setError(null);
    const zoneName = newZoneName.trim();
    if (!zoneName) {
      setError("Escribe el nombre del municipio.");
      return;
    }
    if (!companyId) {
      setError("No se pudo identificar la empresa.");
      return;
    }

    const payload: any = {
      company_id: companyId,
      name: zoneName,
    };
    if (zonesSupportActive) payload.is_active = true;
    const { error } = await supabase.from("zones").insert(payload);

    if (error) {
      setError("No se pudo crear el municipio. Verifica si ya existe.");
      return;
    }

    setNewZoneName("");
    await load();
  };

  const startEditZone = (zone: ZoneOption) => {
    setEditingZoneId(zone.id);
    setEditingZoneName(zone.name);
  };

  const saveEditZone = async () => {
    if (!editingZoneId) return;
    const name = editingZoneName.trim();
    if (!name) {
      setError("El nombre del municipio no puede quedar vacío.");
      return;
    }
    const { error } = await supabase.from("zones").update({ name }).eq("id", editingZoneId);
    if (error) {
      setError("No se pudo actualizar el municipio.");
      return;
    }
    setEditingZoneId(null);
    setEditingZoneName("");
    await load();
  };

  const toggleZoneActive = async (zone: ZoneOption) => {
    if (!zonesSupportActive) return;
    const next = !(zone.is_active ?? true);
    const { error } = await supabase
      .from("zones")
      .update({ is_active: next })
      .eq("id", zone.id);
    if (error) {
      setError("No se pudo cambiar el estado del municipio.");
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
          <h1>Empresas</h1>
          <p className="muted">Remitentes que envían paquetes</p>
        </div>
      </div>

      <div className="card compact" style={{ marginBottom: 16 }}>
        <h3>Crear empresa</h3>
        <div className="form-grid">
          <input className="input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Contacto" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <input className="input" placeholder="Teléfono" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <select className="select" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">Municipio</option>
            {zones.filter((z) => z.is_active !== false).map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
        <div className="row-actions">
          <button className="btn" onClick={createSender}>Crear</button>
        </div>
      </div>

      <div className="card compact" style={{ marginBottom: 16 }}>
        <h3>Crear municipio</h3>
        <div className="form-grid">
          <input
            className="input"
            placeholder="Nombre del municipio"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
          />
        </div>
        <div className="row-actions">
          <button className="btn" onClick={createZone}>Crear municipio</button>
        </div>
        {!zonesSupportActive && (
          <p className="muted" style={{ marginTop: 8 }}>
            Para activar/desactivar municipios, ejecuta la migración SQL de `zones.is_active`.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Municipios</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id}>
                <td>
                  {editingZoneId === z.id ? (
                    <input
                      className="input"
                      value={editingZoneName}
                      onChange={(e) => setEditingZoneName(e.target.value)}
                    />
                  ) : (
                    z.name
                  )}
                </td>
                <td>{z.is_active === false ? "Inactivo" : "Activo"}</td>
                <td>
                  <div className="actions">
                    {editingZoneId === z.id ? (
                      <button className="btn" onClick={saveEditZone}>Guardar</button>
                    ) : (
                      <button className="btn ghost" onClick={() => startEditZone(z)}>Editar</button>
                    )}
                    {zonesSupportActive && (
                      <button className="btn ghost" onClick={() => toggleZoneActive(z)}>
                        {z.is_active === false ? "Activar" : "Desactivar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="card" style={{ color: "crimson" }}>{error}</div>}
      {loading && <div className="card">Cargando...</div>}

      {!loading && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Municipio</th>
              </tr>
            </thead>
            <tbody>
              {senders.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.contact_name ?? "-"}</td>
                  <td>{s.contact_phone ?? "-"}</td>
                  <td>{s.zone_name ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
