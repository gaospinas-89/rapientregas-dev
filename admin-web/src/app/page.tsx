"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const go = async () => {
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

      if (userRow?.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/courier");
      }
    };

    void go();
  }, [router]);

  return null;
}
