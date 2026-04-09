"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  CheckCircle,
  ClipboardList,
  DollarSign,
  FileSignature,
  FileStack,
  FileText,
  Gavel,
  GitBranch,
  GitCompare,
  GraduationCap,
  Handshake,
  IdCard,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  Mail,
  Menu,
  Network,
  ScrollText,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Users2,
  Workflow,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useContextStore } from "@/stores/contextStore";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  section?: string;
};

const nav: NavItem[] = [
  { href: "/", label: "Tablero", icon: LayoutDashboard },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },

  { href: "/entidades", label: "Entidades", icon: Building2, section: "Entidad" },
  { href: "/dependencias", label: "Dependencias", icon: Users },
  { href: "/estructura", label: "Estructura orgánica", icon: GitBranch, badge: "M9" },

  { href: "/talento/empleados", label: "Hojas de vida", icon: IdCard, section: "Talento", badge: "M15" },

  { href: "/diagnostico", label: "Diagnóstico", icon: Brain, section: "Diagnóstico", badge: "M6" },
  { href: "/base-legal", label: "Base legal", icon: BookOpen, badge: "M5" },
  { href: "/financiero", label: "Análisis financiero", icon: DollarSign, badge: "M7" },
  { href: "/mfmp", label: "MFMP (Ley 819)", icon: TrendingUp, badge: "M17" },
  { href: "/procesos", label: "Procesos", icon: Network, badge: "M8" },
  // Sprint 3 — Insumos
  { href: "/manual-vigente", label: "Manual vigente", icon: FileStack, section: "Insumos", badge: "M12+" },
  { href: "/procedimientos", label: "Procedimientos", icon: ListOrdered, badge: "M8+" },
  { href: "/mandatos", label: "Mandatos legales", icon: Gavel, badge: "M18" },

  { href: "/matrices", label: "Matriz de Cargas", icon: ListChecks, section: "Diseño", badge: "M10" },
  { href: "/encuestas", label: "Encuestas de cargas", icon: ClipboardList, badge: "M10+" },
  { href: "/contratistas", label: "Contratistas OPS/CPS", icon: Handshake, badge: "NEW" },
  { href: "/brechas", label: "Análisis de brechas", icon: BarChart3, badge: "NEW" },
  { href: "/planta", label: "Planta de Personal", icon: Users2, badge: "M11" },
  { href: "/manual-funciones", label: "Manual de funciones", icon: FileText, badge: "M12" },
  { href: "/reten-social", label: "Retén social", icon: Shield, badge: "M13" },

  // Sprint 4 — Núcleo Analítico
  { href: "/analisis/elegibilidad", label: "Elegibilidad", icon: GraduationCap, section: "Analítico", badge: "M20" },
  { href: "/validacion", label: "Validación", icon: CheckCircle, badge: "M4R" },
  { href: "/simulador", label: "Simulador", icon: GitCompare, badge: "M22" },

  // Sprint 5 — Gobierno
  { href: "/reestructuraciones", label: "Gobierno", icon: Workflow, section: "Gobierno", badge: "SP5" },
  { href: "/consultas", label: "Consultas", icon: Mail, badge: "SP5" },
  { href: "/comision-personal", label: "Comisión Personal", icon: Users, badge: "SP5" },
  { href: "/comunicaciones-sindicales", label: "Comunicaciones sindicales", icon: Mail, badge: "SP5" },

  { href: "/actos", label: "Actos administrativos", icon: FileSignature, section: "Implementación", badge: "M14" },

  { href: "/nomenclatura", label: "Nomenclatura", icon: ScrollText, section: "Referencia" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useContextStore((s) => s.user);
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);

  // Link dinámico de Gobierno según la reestructuración activa
  const gobiernoHref = activeRestructuring
    ? `/reestructuraciones/${activeRestructuring.id}/gobierno`
    : "/reestructuraciones";

  // Insertar el item de Gobierno con href dinámico en la sección Gobierno
  const finalNav: NavItem[] = nav.map((item) =>
    item.label === "Gobierno" ? { ...item, href: gobiernoHref } : item
  );

  const navItems: NavItem[] = user?.is_superuser
    ? [...finalNav, { href: "/superadmin", label: "Superadmin", icon: ShieldCheck, section: "Administración" }]
    : finalNav;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Abrir menú"
        className="fixed left-4 top-4 z-50 rounded-md bg-brand-700 p-2 text-white shadow-lg lg:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto bg-slate-900 text-slate-100 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 font-bold">
            R
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">ReEstructura</div>
            <div className="text-[11px] text-slate-400">.Gov</div>
          </div>
        </div>

        <nav className="px-2 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <div key={item.href}>
                {item.section && (
                  <div className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "mb-0.5 flex items-center justify-between rounded-md px-3 py-1.5 text-xs transition",
                    active
                      ? "bg-brand-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={15} />
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded bg-brand-500/20 px-1 py-0.5 text-[9px] font-semibold text-brand-100">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-3 text-[10px] text-slate-500">
          ReEstructura.Gov · MVP completo
        </div>
      </aside>
    </>
  );
}
