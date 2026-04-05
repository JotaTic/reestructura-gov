"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Paginated, PayrollComparison, PayrollPlan } from "@/types";
import { ArrowLeft, GitCompare, TrendingDown, TrendingUp } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function CompararPlantasPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const activeRestructuring = useContextStore((s) => s.activeRestructuring)!;
  const version = useContextStore((s) => s.version);

  const [plans, setPlans] = useState<PayrollPlan[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [proposedId, setProposedId] = useState<number | null>(null);
  const [result, setResult] = useState<PayrollComparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Paginated<PayrollPlan>>("/planes/", { page_size: 200 }).then((d) => {
      setPlans(d.results);
      const cur = d.results.find((p) => p.kind === "CURRENT");
      const prop = d.results.find((p) => p.kind === "PROPOSED");
      setCurrentId(cur?.id ?? null);
      setProposedId(prop?.id ?? null);
      setResult(null);
    });
  }, [activeEntity.id, activeRestructuring.id, version]);

  const runComparison = async () => {
    if (!currentId || !proposedId) return;
    setLoading(true);
    try {
      const data = await api.get<PayrollComparison>("/planes/comparar/", {
        current: currentId,
        proposed: proposedId,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <Link href="/planta" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
          <ArrowLeft size={14} /> Volver a planta
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Comparativo planta actual vs propuesta
        </h1>
        <p className="text-sm text-slate-600">
          {activeEntity.name} · {activeRestructuring.name}
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-700">Planta actual</label>
          <select
            value={currentId ?? ""}
            onChange={(e) => setCurrentId(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {plans.filter((p) => p.kind === "CURRENT").map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Planta propuesta</label>
          <select
            value={proposedId ?? ""}
            onChange={(e) => setProposedId(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {plans.filter((p) => p.kind === "PROPOSED").map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={runComparison}
            disabled={!currentId || !proposedId || loading}
            className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:bg-slate-300"
          >
            <GitCompare size={14} /> {loading ? "Comparando…" : "Comparar"}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Delta label="Δ cargos" value={result.delta.positions} formatter={(v) => v.toString()} />
            <Delta label="Δ costo mensual" value={result.delta.monthly} formatter={money} />
            <Delta label="Δ costo anual" value={result.delta.annual} formatter={money} />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid grid-cols-2 border-b border-slate-100">
              <PlanHeader title="Actual" summary={result.current} accent="slate" />
              <PlanHeader title="Propuesta" summary={result.proposed} accent="brand" />
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full min-w-[1100px] text-[12px]">
                <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase text-slate-700">
                  <tr>
                    <th className="p-2 text-left">Nivel</th>
                    <th className="p-2 text-left">Cód.</th>
                    <th className="p-2 text-left">Grado</th>
                    <th className="p-2 text-left">Denominación</th>
                    <th className="p-2 text-right">Actual</th>
                    <th className="p-2 text-right">Propuesta</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">Costo actual</th>
                    <th className="p-2 text-right">Costo propuesta</th>
                    <th className="p-2 text-right">Δ costo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-2">{r.hierarchy_level}</td>
                      <td className="p-2">{r.code}</td>
                      <td className="p-2">{r.grade}</td>
                      <td className="p-2">{r.denomination}</td>
                      <td className="p-2 text-right tabular-nums">{r.current_quantity}</td>
                      <td className="p-2 text-right tabular-nums">{r.proposed_quantity}</td>
                      <td
                        className={
                          "p-2 text-right font-semibold tabular-nums " +
                          (r.delta_quantity > 0
                            ? "text-emerald-700"
                            : r.delta_quantity < 0
                            ? "text-red-700"
                            : "text-slate-400")
                        }
                      >
                        {r.delta_quantity > 0 ? "+" : ""}
                        {r.delta_quantity}
                      </td>
                      <td className="p-2 text-right tabular-nums">{money(r.current_monthly)}</td>
                      <td className="p-2 text-right tabular-nums">{money(r.proposed_monthly)}</td>
                      <td
                        className={
                          "p-2 text-right font-semibold tabular-nums " +
                          (r.delta_monthly > 0
                            ? "text-emerald-700"
                            : r.delta_monthly < 0
                            ? "text-red-700"
                            : "text-slate-400")
                        }
                      >
                        {money(r.delta_monthly)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function money(n: number): string {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function Delta({
  label,
  value,
  formatter,
}: {
  label: string;
  value: number;
  formatter: (n: number) => string;
}) {
  const positive = value > 0;
  const zero = value === 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={
          "mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums " +
          (zero ? "text-slate-500" : positive ? "text-emerald-700" : "text-red-700")
        }
      >
        {!zero && (positive ? <TrendingUp size={20} /> : <TrendingDown size={20} />)}
        {positive ? "+" : ""}
        {formatter(value)}
      </div>
    </div>
  );
}

function PlanHeader({
  title,
  summary,
  accent,
}: {
  title: string;
  summary: {
    name: string;
    total_positions: number;
    total_monthly: number;
    total_annual: number;
  };
  accent: "slate" | "brand";
}) {
  return (
    <div className={"p-4 " + (accent === "brand" ? "bg-brand-50" : "bg-slate-50")}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="truncate text-sm font-semibold text-slate-900">{summary.name}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-slate-500">Cargos</div>
          <div className="font-semibold tabular-nums">{summary.total_positions}</div>
        </div>
        <div>
          <div className="text-slate-500">Mensual</div>
          <div className="font-semibold tabular-nums">{money(summary.total_monthly)}</div>
        </div>
        <div>
          <div className="text-slate-500">Anual</div>
          <div className="font-semibold tabular-nums">{money(summary.total_annual)}</div>
        </div>
      </div>
    </div>
  );
}
