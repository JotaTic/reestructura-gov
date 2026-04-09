"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  Calendar,
  CheckCircle,
  ClipboardList,
  DollarSign,
  FileSignature,
  FileStack,
  FileText,
  Flag,
  Gavel,
  GitBranch,
  GitCompare,
  Globe,
  GraduationCap,
  Handshake,
  IdCard,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  ListTodo,
  Mail,
  Menu,
  Network,
  ScrollText,
  Shield,
  ShieldCheck,
  Target,
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
  // ── INICIO
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Inicio" },

  // ── FASE 0 · CONFIGURACIÓN
  { href: "/entidades", label: "Entidades", icon: Building2, section: "F0 · Configuración" },
  { href: "/dependencias", label: "Dependencias", icon: Users },
  { href: "/estructura", label: "Estructura orgánica", icon: GitBranch },
  { href: "/nomenclatura", label: "Nomenclatura", icon: ScrollText },

  // ── FASE 1 · ACUERDO INICIAL
  { href: "/reestructuraciones", label: "Expediente", icon: Flag, section: "F1 · Acuerdo Inicial", badge: "F1" },
  { href: "/objetivos", label: "Objetivos", icon: Target, badge: "F1" },
  { href: "/cronograma", label: "Cronograma", icon: Calendar, badge: "F1" },
  { href: "/equipo-tecnico", label: "Equipo técnico", icon: Users2, badge: "F1" },

  // ── FASE 2 · DIAGNÓSTICO
  { href: "/diagnostico", label: "Diagnóstico DOFA", icon: Brain, section: "F2 · Diagnóstico", badge: "F2" },
  { href: "/base-legal", label: "Marco legal", icon: BookOpen, badge: "F2" },
  { href: "/mandatos", label: "Mandatos legales", icon: Gavel, badge: "F2" },

  // ── FASE 3 · DISEÑO TÉCNICO
  { href: "/procesos", label: "Procesos", icon: Network, section: "F3 · Diseño Técnico", badge: "F3" },
  { href: "/procedimientos", label: "Procedimientos", icon: ListOrdered, badge: "F3" },
  { href: "/matrices", label: "Matriz de Cargas", icon: ListChecks, badge: "F3" },
  { href: "/encuestas", label: "Encuestas de cargas", icon: ClipboardList, badge: "F3" },
  { href: "/contratistas", label: "Contratistas OPS/CPS", icon: Handshake, badge: "F3" },
  { href: "/brechas", label: "Análisis de brechas", icon: BarChart3, badge: "F3" },
  { href: "/planta", label: "Planta de Personal", icon: Users2, badge: "F3" },
  { href: "/manual-vigente", label: "Manual vigente", icon: FileStack, badge: "F3" },
  { href: "/manual-funciones", label: "Manual de funciones", icon: FileText, badge: "F3" },

  // ── FASE 4 · ANÁLISIS Y REVISIONES
  { href: "/validacion", label: "Validación", icon: CheckCircle, section: "F4 · Análisis", badge: "F4" },
  { href: "/financiero", label: "Análisis financiero", icon: DollarSign, badge: "F4" },
  { href: "/mfmp", label: "MFMP (Ley 819)", icon: TrendingUp, badge: "F4" },
  { href: "/simulador", label: "Simulador", icon: GitCompare, badge: "F4" },
  { href: "/analisis/elegibilidad", label: "Elegibilidad", icon: GraduationCap, badge: "F4" },
  { href: "/indemnizaciones", label: "Indemnizaciones", icon: Calculator, badge: "F4" },
  { href: "/estudio-tecnico", label: "Estudio técnico", icon: FileText, badge: "F4" },

  // ── FASE 5 · GOBIERNO Y APROBACIÓN
  { href: "/gobierno", label: "Gobierno", icon: Workflow, section: "F5 · Gobierno", badge: "F5" },
  { href: "/consultas", label: "Consultas oficiales", icon: Globe, badge: "F5" },
  { href: "/comision-personal", label: "Comisión Personal", icon: Users, badge: "F5" },
  { href: "/comunicaciones-sindicales", label: "Com. sindicales", icon: Mail, badge: "F5" },
  { href: "/actos", label: "Actos administrativos", icon: FileSignature, badge: "F5" },

  // ── FASE 6 · IMPLEMENTACIÓN
  { href: "/implementacion", label: "Plan implementación", icon: ListTodo, section: "F6 · Implementación", badge: "F6" },
  { href: "/reten-social", label: "Retén social", icon: Shield, badge: "F6" },
  { href: "/talento/empleados", label: "Hojas de vida", icon: IdCard, badge: "F6" },
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

  const finalNav: NavItem[] = nav.map((item) =>
    item.label === "Gobierno" ? { ...item, href: gobiernoHref } : item
  );

  // Ruta /objetivos redirige a objetivos de la reestructuración activa
  const objetivosHref = activeRestructuring
    ? `/reestructuraciones/${activeRestructuring.id}/objetivos`
    : "/reestructuraciones";

  const withDynamic: NavItem[] = finalNav.map((item) =>
    item.label === "Objetivos" ? { ...item, href: objetivosHref } : item
  );

  const navItems: NavItem[] = user?.is_superuser
    ? [...withDynamic, { href: "/superadmin", label: "Superadmin", icon: ShieldCheck, section: "Administración" }]
    : withDynamic;

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
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <div key={`${item.href}-${idx}`}>
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
          ReEstructura.Gov · Cartilla FP 2018
        </div>
      </aside>
    </>
  );
}
