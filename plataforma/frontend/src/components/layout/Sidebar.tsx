"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Brain,
  Building2,
  DollarSign,
  FileSignature,
  FileText,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Menu,
  Network,
  ScrollText,
  Shield,
  Users,
  Users2,
  X,
} from "lucide-react";
import clsx from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  section?: string;
};

const nav: NavItem[] = [
  { href: "/", label: "Tablero", icon: LayoutDashboard },

  { href: "/entidades", label: "Entidades", icon: Building2, section: "Entidad" },
  { href: "/dependencias", label: "Dependencias", icon: Users },
  { href: "/estructura", label: "Estructura orgánica", icon: GitBranch, badge: "M9" },

  { href: "/diagnostico", label: "Diagnóstico", icon: Brain, section: "Diagnóstico", badge: "M6" },
  { href: "/base-legal", label: "Base legal", icon: BookOpen, badge: "M5" },
  { href: "/financiero", label: "Análisis financiero", icon: DollarSign, badge: "M7" },
  { href: "/procesos", label: "Procesos", icon: Network, badge: "M8" },

  { href: "/matrices", label: "Matriz de Cargas", icon: ListChecks, section: "Diseño", badge: "M10" },
  { href: "/planta", label: "Planta de Personal", icon: Users2, badge: "M11" },
  { href: "/manual-funciones", label: "Manual de funciones", icon: FileText, badge: "M12" },
  { href: "/reten-social", label: "Retén social", icon: Shield, badge: "M13" },

  { href: "/actos", label: "Actos administrativos", icon: FileSignature, section: "Implementación", badge: "M14" },

  { href: "/nomenclatura", label: "Nomenclatura", icon: ScrollText, section: "Referencia" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
          {nav.map((item) => {
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
