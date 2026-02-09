"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales incorrectas.");
      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError("No se pudo iniciar sesión.");
      setLoading(false);
      return;
    }

    const { data: userRow } = await supabase
      .from("app_users")
      .select("role")
      .eq("id", userId)
      .limit(1)
      .single();

    if (userRow?.role === "admin") {
      router.replace("/dashboard");
    } else {
      router.replace("/courier");
    }
  };

  return (
    <main className="page" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <img
            src="/logoRapiEntregas.jpeg"
            alt="Rapi Entregas"
            style={{ height: 72, width: "auto", objectFit: "contain" }}
          />
        </div>
        <h1 style={{ marginBottom: 8, textAlign: "center" }}>Rapi Entregas</h1>
        <p className="muted" style={{ marginTop: 0 }}>Ingresa con tu cuenta</p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
