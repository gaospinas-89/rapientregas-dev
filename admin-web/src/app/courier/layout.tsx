"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guard = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("app_users")
        .select("role")
        .eq("id", userId)
        .limit(1)
        .single();

      if (!userRow || userRow.role !== "courier") {
        router.replace("/login");
        return;
      }

      setLoading(false);
    };

    void guard();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return <div className="content">Cargando...</div>;
  }

  return (
    <div className="page" style={{ minHeight: "100vh" }}>
      <div className="page-header">
        <div>
          <h1>Panel Mensajero</h1>
          <p className="muted">Tus paquetes y devoluciones</p>
        </div>
        <button className="btn ghost" onClick={logout}>Cerrar sesión</button>
      </div>
      {children}
    </div>
  );
}
