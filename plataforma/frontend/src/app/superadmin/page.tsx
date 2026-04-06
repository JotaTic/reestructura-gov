"use client";

import Link from "next/link";
import { ClipboardList, ShieldCheck, Users, History } from "lucide-react";

const cards = [
  {
    href: "/superadmin/users",
    title: "Usuarios",
    desc: "Crear y administrar usuarios, grupos y entidades permitidas.",
    icon: Users,
  },
  {
    href: "/superadmin/permissions",
    title: "Permisos CRUD",
    desc: "Matriz de permisos por grupo y modelo.",
    icon: ShieldCheck,
  },
  {
    href: "/superadmin/audit",
    title: "Auditoría",
    desc: "Historial de cambios sobre los modelos auditados.",
    icon: History,
  },
  {
    href: "/superadmin",
    title: "Jota — configuración",
    desc: "(Próximamente) Edita intents y respuestas del asistente.",
    icon: ClipboardList,
  },
];

export default function SuperadminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Superadministración</h1>
        <p className="mt-1 text-sm text-slate-600">
          Solo visible para usuarios con privilegio de superusuario.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow"
            >
              <Icon className="text-brand-600" size={28} />
              <h3 className="mt-3 text-base font-semibold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{c.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
