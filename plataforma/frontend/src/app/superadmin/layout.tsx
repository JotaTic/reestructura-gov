"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useContextStore } from "@/stores/contextStore";

/**
 * Guard del módulo de Superadministración.
 * Redirige a `/` cualquier usuario que no sea `is_superuser`.
 */
export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useContextStore((s) => s.user);

  useEffect(() => {
    if (user && !user.is_superuser) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="p-8 text-sm text-slate-500">Verificando sesión…</div>
    );
  }
  if (!user.is_superuser) {
    return null;
  }
  return <>{children}</>;
}
