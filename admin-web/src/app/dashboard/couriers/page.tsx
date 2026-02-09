"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCompanyId } from "@/lib/company";

type CourierRow = {
  id: string;
  full_name: string | null;
  identification: string | null;
  email?: string | null;
  phone: string | null;
  is_active: boolean;
  user_id?: string | null;
};

export default function CouriersAdminPage() {
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [identification, setIdentification] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIdentification, setEditIdentification] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("admin");

  const load = async () => {
    setLoading(true);
    setError(null);

    const cid = await getCompanyId();
    setCompanyId(cid);

    let query = supabase
      .from("couriers")
      .select("id, full_name, identification, email, phone, is_active, user_id")
      .eq("company_id", cid)
      .order("full_name", { ascending: true });

    if (!showInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      setError("No se pudieron cargar los mensajeros.");
    } else {
      setCouriers(data ?? []);
    }
    setLoading(false);
  };

  const createCourier = async () => {
    if (!fullName || !identification || !email || !password) {
      setError("Escribe nombre, identificación, email y contraseña.");
      return;
    }
    if (!companyId) {
      setError("No se pudo identificar la empresa.");
      return;
    }
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setError("Sesión inválida. Vuelve a iniciar sesión.");
      return;
    }

    const res = await fetch("/api/admin/create-courier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName,
        identification,
        email,
        password,
        phone: phone || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "No se pudo crear el mensajero.");
      return;
    }
    setFullName("");
    setIdentification("");
    setEmail("");
    setPassword("");
    setPhone("");
    await load();
  };

  const toggleCourier = async (courierId: string, nextActive: boolean) => {
    const { error } = await supabase
      .from("couriers")
      .update({ is_active: nextActive })
      .eq("id", courierId);
    if (error) {
      setError("No se pudo actualizar el mensajero.");
      return;
    }
    await load();
  };

  const saveCourier = async () => {
    if (!editId) return;
    const { error } = await supabase
      .from("couriers")
      .update({
        full_name: editName || null,
        identification: editIdentification || null,
        phone: editPhone || null,
        email: editEmail || null,
      })
      .eq("id", editId);
    if (error) {
      setError("No se pudo actualizar el mensajero.");
      return;
    }
    setEditId(null);
    setEditName("");
    setEditIdentification("");
    setEditPhone("");
    setEditEmail("");
    setEditPassword("");
    setLinkMsg(null);
    await load();
  };

  const createCourierAccess = async (courier: CourierRow) => {
    if (!editEmail || !editPassword) {
      setLinkMsg("Completa correo y contraseña.");
      return;
    }
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setLinkMsg("Sesión inválida.");
      return;
    }

    const res = await fetch("/api/admin/create-courier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: courier.full_name ?? "",
        identification: courier.identification ?? "",
        email: editEmail,
        password: editPassword,
        phone: courier.phone ?? null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setLinkMsg(json.error ?? "No se pudo crear el acceso.");
      return;
    }
    setLinkMsg("Acceso creado correctamente.");
    await load();
  };

  const changeCourierPassword = async (courier: CourierRow) => {
    if (!editPassword) {
      setLinkMsg("Escribe la nueva contraseña.");
      return;
    }
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setLinkMsg("Sesión inválida.");
      return;
    }
    const res = await fetch("/api/admin/update-user-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: courier.user_id,
        password: editPassword,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setLinkMsg(json.error ?? "No se pudo cambiar la contraseña.");
      return;
    }
    setLinkMsg("Contraseña actualizada.");
  };


  useEffect(() => {
    void load();
  }, [showInactive]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const { data: userRow } = await supabase
        .from("app_users")
        .select("role")
        .eq("id", userId)
        .limit(1)
        .single();
      if (userRow?.role) setUserRole(userRow.role);
    })();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Mensajeros</h1>
          <p className="muted">Gestión de mensajeros activos</p>
        </div>
      </div>

      <div className="card compact" style={{ marginBottom: 16 }}>
        <h3>Crear mensajero</h3>
        <div className="form-grid">
          <input className="input" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="input" placeholder="Identificación" value={identification} onChange={(e) => setIdentification(e.target.value)} />
          <input className="input" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input" placeholder="Celular" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="row-actions">
          <button
            className="btn ghost"
            onClick={() => {
              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
              let pwd = "";
              for (let i = 0; i < 10; i += 1) pwd += chars[Math.floor(Math.random() * chars.length)];
              setPassword(pwd);
            }}
          >
            Generar contraseña
          </button>
        </div>
        <div className="row-actions">
          <button className="btn" onClick={createCourier}>Crear</button>
        </div>
      </div>

      <div className="card compact" style={{ marginBottom: 16 }}>
        <div className="row-actions" style={{ justifyContent: "space-between" }}>
          <strong>Mostrar desactivados</strong>
          <label className="pill">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            {showInactive ? "Sí" : "No"}
          </label>
        </div>
      </div>

      {error && <div className="card" style={{ color: "crimson" }}>{error}</div>}
      {loading && <div className="card">Cargando...</div>}

      {!loading && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Activos</h3>
          <table className="table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Identificación</th>
                <th>Celular</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {couriers.filter((c) => c.is_active).length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">No hay mensajeros activos</td>
                </tr>
              )}
                  {couriers.filter((c) => c.is_active).map((c) => (
                    <tr key={c.id}>
                  <td>
                    {editId === c.id ? (
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      c.full_name ?? "-"
                    )}
                  </td>
                  <td>
                    {editId === c.id ? (
                      <input
                        className="input"
                        value={editIdentification}
                        onChange={(e) => setEditIdentification(e.target.value)}
                      />
                    ) : (
                      c.identification ?? "-"
                    )}
                  </td>
                  <td>
                    {editId === c.id ? (
                      <input
                        className="input"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    ) : (
                      c.phone ?? "-"
                    )}
                  </td>
                  <td>Activo</td>
                  <td>
                    <div className="row-actions">
                          {userRole === "admin" && (
                            <button className="btn ghost" onClick={() => toggleCourier(c.id, false)}>Desactivar</button>
                          )}
                      {editId === c.id ? (
                        <>
                          <button className="btn" onClick={saveCourier}>Guardar</button>
                          {!c.user_id && (
                            <>
                              <input
                                className="input"
                                placeholder="Correo"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                              />
                              <input
                                className="input"
                                placeholder="Contraseña"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                              />
                              <button className="btn ghost" onClick={() => createCourierAccess(c)}>
                                Crear acceso
                              </button>
                            </>
                          )}
                          {c.user_id && (
                            <>
                              <input
                                className="input"
                                placeholder="Nueva contraseña"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                              />
                              <button className="btn ghost" onClick={() => changeCourierPassword(c)}>
                                Cambiar contraseña
                              </button>
                            </>
                          )}
                          {linkMsg && <span className="muted">{linkMsg}</span>}
                        </>
                      ) : (
                        <button
                          className="btn ghost"
                          onClick={() => {
                            setEditId(c.id);
                              setEditName(c.full_name ?? "");
                              setEditIdentification(c.identification ?? "");
                              setEditPhone(c.phone ?? "");
                              setEditEmail(c.email ?? "");
                              setEditPassword("");
                              setLinkMsg(null);
                            }}
                          >
                          Editar
                          </button>
                      )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {showInactive && (
            <>
              <h3 style={{ marginBottom: 8 }}>Inactivos</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Identificación</th>
                    <th>Celular</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {couriers.filter((c) => !c.is_active).length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">No hay mensajeros inactivos</td>
                    </tr>
                  )}
                  {couriers.filter((c) => !c.is_active).map((c) => (
                    <tr key={c.id}>
                      <td>
                        {editId === c.id ? (
                          <input
                            className="input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          c.full_name ?? "-"
                        )}
                      </td>
                      <td>
                        {editId === c.id ? (
                          <input
                            className="input"
                            value={editIdentification}
                            onChange={(e) => setEditIdentification(e.target.value)}
                          />
                        ) : (
                          c.identification ?? "-"
                        )}
                      </td>
                  <td>
                    {editId === c.id ? (
                      <input
                        className="input"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    ) : (
                      c.phone ?? "-"
                    )}
                  </td>
                  <td>Inactivo</td>
                  <td>
                    <div className="row-actions">
                          {userRole === "admin" && (
                            <button className="btn" onClick={() => toggleCourier(c.id, true)}>Activar</button>
                          )}
                      {editId === c.id ? (
                        <>
                          <button className="btn" onClick={saveCourier}>Guardar</button>
                          {!c.user_id && (
                            <>
                              <input
                                className="input"
                                placeholder="Correo"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                              />
                              <input
                                className="input"
                                placeholder="Contraseña"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                              />
                              <button className="btn ghost" onClick={() => createCourierAccess(c)}>
                                Crear acceso
                              </button>
                            </>
                          )}
                          {c.user_id && (
                            <>
                              <input
                                className="input"
                                placeholder="Nueva contraseña"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                              />
                              <button className="btn ghost" onClick={() => changeCourierPassword(c)}>
                                Cambiar contraseña
                              </button>
                            </>
                          )}
                          {linkMsg && <span className="muted">{linkMsg}</span>}
                        </>
                      ) : (
                        <button
                          className="btn ghost"
                          onClick={() => {
                            setEditId(c.id);
                              setEditName(c.full_name ?? "");
                              setEditIdentification(c.identification ?? "");
                              setEditPhone(c.phone ?? "");
                              setEditEmail(c.email ?? "");
                              setEditPassword("");
                              setLinkMsg(null);
                            }}
                          >
                            Editar
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
