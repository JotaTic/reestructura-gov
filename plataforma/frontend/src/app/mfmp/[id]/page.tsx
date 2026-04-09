"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type {
  MFMP,
  MFMPLawByYear,
  MFMPSimulation,
  MFMPScenario,
  PayrollPlan,
  Paginated,
} from "@/types";
import { API_URL } from "@/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  TrendingUp,
  Upload,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import Link from "next/link";

type Tab = "matriz" | "graficas" | "ley617" | "ley358" | "simulacion" | "escenarios" | "importar";

export default function MFMPDetailPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}

function pct(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
      <CheckCircle2 size={10} /> Cumple
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
      <XCircle size={10} /> No cumple
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    VERDE: "bg-green-500",
    AMARILLO: "bg-yellow-400",
    ROJO: "bg-red-500",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[status] ?? "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const [mfmp, setMfmp] = useState<MFMP | null>(null);
  const [tab, setTab] = useState<Tab>("matriz");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Matriz
  const [matrix, setMatrix] = useState<Record<string, unknown> | null>(null);

  // Ley 617
  const [ley617, setLey617] = useState<Record<string, MFMPLawByYear> | null>(null);

  // Ley 358
  const [ley358, setLey358] = useState<Record<string, MFMPLawByYear> | null>(null);

  // Simulación
  const [plans, setPlans] = useState<PayrollPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [simulation, setSimulation] = useState<MFMPSimulation | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Escenarios
  const [scenarios, setScenarios] = useState<MFMPScenario[]>([]);

  // Importar FUT
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
    incomes_upserted: number;
    expenses_upserted: number;
    debts_upserted: number;
    warnings: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<MFMP>(`/mfmp/${id}/`)
      .then((m) => setMfmp(m))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!mfmp) return;
    if ((tab === "matriz" || tab === "graficas") && !matrix) {
      api.get<Record<string, unknown>>(`/mfmp/${id}/matriz/`).then(setMatrix).catch(() => {});
    }
    if ((tab === "ley617" || tab === "graficas") && !ley617) {
      api
        .get<Record<string, MFMPLawByYear>>(`/mfmp/${id}/ley-617/`)
        .then(setLey617)
        .catch(() => {});
    }
    if (tab === "ley358" && !ley358) {
      api
        .get<Record<string, MFMPLawByYear>>(`/mfmp/${id}/ley-358/`)
        .then(setLey358)
        .catch(() => {});
    }
    if (tab === "simulacion" && plans.length === 0) {
      api
        .get<Paginated<PayrollPlan>>("/planes/", { page_size: 50 })
        .then((d) => setPlans(d.results))
        .catch(() => {});
    }
    if (tab === "escenarios" && scenarios.length === 0) {
      api
        .get<Paginated<MFMPScenario>>("/mfmp-escenarios/", { mfmp: id })
        .then((d) => setScenarios(d.results))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mfmp]);

  const simulate = async () => {
    if (!selectedPlan) return;
    setSimLoading(true);
    try {
      const result = await api.get<MFMPSimulation>(`/mfmp/${id}/simular/`, { plan: selectedPlan });
      setSimulation(result);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error en simulación");
    } finally {
      setSimLoading(false);
    }
  };

  const downloadFicha = () => {
    if (!selectedPlan) return;
    const headers = { "X-Entity-Id": String(activeEntity.id) };
    const url = `${API_URL}/mfmp/${id}/ficha-impacto-fiscal/?plan=${selectedPlan}`;
    const a = document.createElement("a");
    a.href = url;
    // The API requires auth cookies (session) so direct link works in browser
    a.download = `ficha_ley819_${id}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const importFut = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/mfmp/${id}/importar-fut/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "",
          "X-Entity-Id": String(activeEntity.id),
        },
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  const exportUrl = (fmt: "xlsx" | "docx") =>
    `${API_URL}/mfmp/${id}/export/${fmt}/`;

  const TABS: { id: Tab; label: string }[] = [
    { id: "matriz", label: "Matriz" },
    { id: "graficas", label: "Graficas" },
    { id: "ley617", label: "Ley 617" },
    { id: "ley358", label: "Ley 358" },
    { id: "simulacion", label: "Simulacion" },
    { id: "escenarios", label: "Escenarios" },
    { id: "importar", label: "Importar FUT" },
  ];

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Cargando MFMP...</div>;
  }
  if (error || !mfmp) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error ?? "MFMP no encontrado"}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/mfmp" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={18} />
        </Link>
        <TrendingUp className="text-brand-600" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{mfmp.name}</h1>
          <p className="text-xs text-slate-500">
            Año base: {mfmp.base_year} · Horizonte: {mfmp.horizon_years} años
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <a
            href={exportUrl("xlsx")}
            className="flex items-center gap-1 rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Download size={12} /> XLSX
          </a>
          <a
            href={exportUrl("docx")}
            className="flex items-center gap-1 rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Download size={12} /> DOCX
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        {tab === "matriz" && (
          <MatrizTab matrix={matrix as MatrixData | null} mfmp={mfmp} />
        )}
        {tab === "graficas" && (
          <GraficasTab matrix={matrix as MatrixData | null} ley617={ley617} mfmp={mfmp} />
        )}
        {tab === "ley617" && (
          <Ley617Tab data={ley617} mfmp={mfmp} />
        )}
        {tab === "ley358" && (
          <Ley358Tab data={ley358} mfmp={mfmp} />
        )}
        {tab === "simulacion" && (
          <SimulacionTab
            plans={plans}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            simulation={simulation}
            simLoading={simLoading}
            onSimulate={simulate}
            onDownloadFicha={downloadFicha}
            mfmp={mfmp}
          />
        )}
        {tab === "escenarios" && (
          <EscenariosTab scenarios={scenarios} />
        )}
        {tab === "importar" && (
          <ImportarFutTab
            fileRef={fileRef}
            onImport={importFut}
            importing={importing}
            result={importResult}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GraficasTab({
  matrix,
  ley617,
  mfmp,
}: {
  matrix: MatrixData | null;
  ley617: Record<string, MFMPLawByYear> | null;
  mfmp: MFMP;
}) {
  if (!matrix) {
    return <div className="py-4 text-sm text-slate-400">Cargando datos...</div>;
  }

  const years = matrix.years ?? [];
  const chartData = years.map((y) => ({
    year: String(y),
    Ingresos: matrix.totals?.income?.[String(y)] ?? 0,
    Gastos: matrix.totals?.expense?.[String(y)] ?? 0,
  }));

  // Ley 617 ratios
  const ley617Years = ley617 ? Object.keys(ley617).sort() : [];
  const ley617Data = ley617Years.map((yr) => {
    const d = ley617![yr];
    return {
      year: yr,
      ratio: parseFloat(((d.ratio ?? 0) * 100).toFixed(1)),
      limite: parseFloat(((d.limit ?? 0) * 100).toFixed(1)),
      compliant: d.compliant !== false,
    };
  });
  // Use the first limit value for the ReferenceLine (typically constant across years)
  const refLimit = ley617Data.length > 0 ? ley617Data[0].limite : 0;

  return (
    <div className="space-y-8">
      {/* Income vs Expenses bar chart */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          Ingresos vs Gastos por Año
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `$${fmt(v)}`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => [`$${fmt(Number(value))}`, undefined]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Ley 617 ratio chart */}
      {ley617Data.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Ley 617 — Ratio Funcionamiento / ICLD por Año
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={ley617Data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 10 }}
                domain={[0, (max: number) => Math.max(max * 1.15, refLimit * 1.15)]}
              />
              <Tooltip formatter={(value) => [`${value}%`, undefined]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine
                y={refLimit}
                stroke="#94a3b8"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{ value: `Límite ${refLimit}%`, position: "right", fontSize: 10, fill: "#64748b" }}
              />
              <Bar dataKey="ratio" name="Ratio %" radius={[4, 4, 0, 0]}>
                {ley617Data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.compliant ? "#10b981" : "#f87171"} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}

interface MatrixData {
  years: number[];
  income_by_concept: Record<string, Record<string, number>>;
  expense_by_concept: Record<string, Record<string, number>>;
  debt: Record<string, { outstanding_debt: number; debt_service: number; new_disbursements: number }>;
  totals: { income: Record<string, number>; expense: Record<string, number> };
}

function MatrizTab({ matrix, mfmp }: { matrix: MatrixData | null; mfmp: MFMP }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  if (!matrix) {
    return <div className="py-4 text-sm text-slate-400">Cargando matriz...</div>;
  }
  const years = matrix.years ?? [];

  const handleCellSave = async (
    type: "income" | "expense",
    concept: string,
    year: number,
    value: string,
    currentValue: number,
  ) => {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
    if (parsed === currentValue) return;

    const key = `${type}-${concept}-${year}`;
    setSaving(key);
    setEditError(null);

    try {
      const endpoint = type === "income" ? "/mfmp-ingresos/" : "/mfmp-gastos/";
      // Try to find existing record
      const existing = await api.get<Paginated<{ id: number; amount: number }>>(`${endpoint}`, {
        mfmp: mfmp.id,
        year,
        concept,
      });
      if (existing.results.length > 0) {
        await api.patch(`${endpoint}${existing.results[0].id}/`, { amount: parsed });
      } else {
        await api.post(endpoint, { mfmp: mfmp.id, year, concept, amount: parsed });
      }
      // Update local matrix data
      const section = type === "income" ? matrix.income_by_concept : matrix.expense_by_concept;
      if (section[concept]) {
        section[concept][String(year)] = parsed;
      }
      // Recalculate totals
      const totalsSection = type === "income" ? matrix.totals.income : matrix.totals.expense;
      let yearTotal = 0;
      const concepts = type === "income" ? matrix.income_by_concept : matrix.expense_by_concept;
      for (const c of Object.values(concepts)) {
        yearTotal += c[String(year)] ?? 0;
      }
      totalsSection[String(year)] = yearTotal;
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 overflow-x-auto">
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setEditing(!editing)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            editing
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {editing ? "Modo lectura" : "Editar valores"}
        </button>
      </div>

      {editError && (
        <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{editError}</div>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wide">Totales</h3>
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left py-1 pr-4 text-slate-500">Concepto</th>
              {years.map((y) => (
                <th key={y} className="text-right py-1 px-2 text-slate-500">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t bg-emerald-50">
              <td className="py-1 pr-4 font-medium text-emerald-700">Total ingresos</td>
              {years.map((y) => (
                <td key={y} className="text-right py-1 px-2 font-semibold text-emerald-900">
                  ${fmt(matrix.totals?.income?.[String(y)])}
                </td>
              ))}
            </tr>
            <tr className="bg-red-50">
              <td className="py-1 pr-4 font-medium text-red-700">Total gastos</td>
              {years.map((y) => (
                <td key={y} className="text-right py-1 px-2 font-semibold text-red-900">
                  ${fmt(matrix.totals?.expense?.[String(y)])}
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <td className="py-1 pr-4 font-medium text-slate-700">Balance</td>
              {years.map((y) => {
                const inc = matrix.totals?.income?.[String(y)] ?? 0;
                const exp = matrix.totals?.expense?.[String(y)] ?? 0;
                const balance = inc - exp;
                return (
                  <td key={y} className={`text-right py-1 px-2 font-semibold ${balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    ${fmt(balance)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wide">Ingresos por concepto</h3>
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left py-1 pr-4 text-slate-500">Concepto</th>
              {years.map((y) => (
                <th key={y} className="text-right py-1 px-2 text-slate-500">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(matrix.income_by_concept ?? {}).map(([concept, yearAmounts]) => (
              <tr key={concept} className="border-t">
                <td className="py-1 pr-4 text-slate-600">{concept.replace(/_/g, " ")}</td>
                {years.map((y) => {
                  const val = yearAmounts[String(y)] ?? 0;
                  const key = `income-${concept}-${y}`;
                  return (
                    <td key={y} className="text-right py-1 px-1">
                      {editing ? (
                        <input
                          type="text"
                          defaultValue={val}
                          onBlur={(e) => handleCellSave("income", concept, y, e.target.value, val)}
                          className={`w-24 rounded border px-1 py-0.5 text-right text-xs ${saving === key ? "bg-yellow-50 border-yellow-300" : "border-slate-200"}`}
                        />
                      ) : (
                        `$${fmt(val)}`
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wide">Gastos por concepto</h3>
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left py-1 pr-4 text-slate-500">Concepto</th>
              {years.map((y) => (
                <th key={y} className="text-right py-1 px-2 text-slate-500">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(matrix.expense_by_concept ?? {}).map(([concept, yearAmounts]) => (
              <tr key={concept} className="border-t">
                <td className="py-1 pr-4 text-slate-600">{concept.replace(/_/g, " ")}</td>
                {years.map((y) => {
                  const val = yearAmounts[String(y)] ?? 0;
                  const key = `expense-${concept}-${y}`;
                  return (
                    <td key={y} className="text-right py-1 px-1">
                      {editing ? (
                        <input
                          type="text"
                          defaultValue={val}
                          onBlur={(e) => handleCellSave("expense", concept, y, e.target.value, val)}
                          className={`w-24 rounded border px-1 py-0.5 text-right text-xs ${saving === key ? "bg-yellow-50 border-yellow-300" : "border-slate-200"}`}
                        />
                      ) : (
                        `$${fmt(val)}`
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Ley617Tab({
  data,
  mfmp,
}: {
  data: Record<string, MFMPLawByYear> | null;
  mfmp: MFMP;
}) {
  if (!data) {
    return <div className="py-4 text-sm text-slate-400">Cargando indicadores Ley 617...</div>;
  }
  const years = Object.keys(data).sort();

  return (
    <div className="overflow-x-auto">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">
        Ley 617/2000 — Límites de gastos de funcionamiento sobre ICLD
      </h3>
      <table className="w-full text-xs">
        <thead className="bg-slate-50">
          <tr>
            {["Año", "ICLD", "Funcionamiento", "Ratio", "Límite", "Estado"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {years.map((yr) => {
            const d = data[yr];
            return (
              <tr key={yr} className={d.compliant === false ? "bg-red-50" : ""}>
                <td className="px-3 py-2 font-medium">{yr}</td>
                <td className="px-3 py-2">${fmt(d.icld)}</td>
                <td className="px-3 py-2">${fmt(d.funcionamiento)}</td>
                <td className="px-3 py-2">{pct(d.ratio)}</td>
                <td className="px-3 py-2">{pct(d.limit)}</td>
                <td className="px-3 py-2">
                  <StatusBadge ok={d.compliant !== false} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Ley358Tab({
  data,
  mfmp,
}: {
  data: Record<string, MFMPLawByYear> | null;
  mfmp: MFMP;
}) {
  if (!data) {
    return <div className="py-4 text-sm text-slate-400">Cargando indicadores Ley 358...</div>;
  }
  const years = Object.keys(data).sort();

  return (
    <div className="overflow-x-auto">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">
        Ley 358/1997 — Sostenibilidad e indicadores de solvencia
      </h3>
      <table className="w-full text-xs">
        <thead className="bg-slate-50">
          <tr>
            {[
              "Año",
              "Solvencia",
              "Sostenibilidad",
              "Estado",
              "Ahorro operacional",
              "Servicio deuda",
            ].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {years.map((yr) => {
            const d = data[yr];
            return (
              <tr
                key={yr}
                className={
                  d.status === "ROJO"
                    ? "bg-red-50"
                    : d.status === "AMARILLO"
                    ? "bg-yellow-50"
                    : ""
                }
              >
                <td className="px-3 py-2 font-medium">{yr}</td>
                <td className="px-3 py-2">{pct(d.solvency_ratio)}</td>
                <td className="px-3 py-2">{pct(d.sustainability_ratio)}</td>
                <td className="px-3 py-2">
                  <StatusDot status={d.status ?? "—"} />
                </td>
                <td className="px-3 py-2">${fmt(d.ahorro_operacional)}</td>
                <td className="px-3 py-2">${fmt(d.debt_service)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-slate-400">
        Verde &lt; 40% solvencia · Amarillo 40–60% · Rojo ≥ 60%
      </p>
    </div>
  );
}

function SimulacionTab({
  plans,
  selectedPlan,
  setSelectedPlan,
  simulation,
  simLoading,
  onSimulate,
  onDownloadFicha,
  mfmp,
}: {
  plans: PayrollPlan[];
  selectedPlan: string;
  setSelectedPlan: (v: string) => void;
  simulation: MFMPSimulation | null;
  simLoading: boolean;
  onSimulate: () => void;
  onDownloadFicha: () => void;
  mfmp: MFMP;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">
        Simulación de impacto fiscal (Ley 819 art. 7)
      </h3>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Plan de personal
          </label>
          <select
            className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
          >
            <option value="">Seleccionar plan...</option>
            {plans.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.kind_display})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onSimulate}
          disabled={!selectedPlan || simLoading}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {simLoading ? "Simulando..." : "Simular"}
        </button>
        {simulation && (
          <button
            onClick={onDownloadFicha}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Download size={14} /> Descargar ficha Ley 819
          </button>
        )}
      </div>

      {simulation && (
        <div className="space-y-4">
          <div className="rounded-md bg-brand-50 p-3 text-sm">
            <span className="font-medium text-brand-700">Costo anual efectivo del plan: </span>
            <span className="text-brand-900">
              ${new Intl.NumberFormat("es-CO").format(simulation.annual_cost)}
            </span>
          </div>

          {simulation.broken_years_617.length > 0 && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              <strong>Años que rompen Ley 617:</strong>{" "}
              {simulation.broken_years_617.join(", ")}
            </div>
          )}
          {simulation.broken_years_358.length > 0 && (
            <div className="rounded-md bg-orange-50 p-3 text-sm text-orange-700">
              <strong>Años en ROJO (Ley 358):</strong>{" "}
              {simulation.broken_years_358.join(", ")}
            </div>
          )}

          <div className="overflow-x-auto">
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wide">
              Ley 617 — Baseline vs Simulado
            </h4>
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {["Año", "Base ratio", "Base estado", "Sim. ratio", "Sim. estado"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.keys(simulation.baseline.law_617)
                  .sort()
                  .map((yr) => {
                    const base = simulation.baseline.law_617[yr];
                    const sim = simulation.simulated.law_617[yr];
                    return (
                      <tr key={yr}>
                        <td className="px-3 py-2 font-medium">{yr}</td>
                        <td className="px-3 py-2">{pct(base.ratio)}</td>
                        <td className="px-3 py-2">
                          <StatusBadge ok={base.compliant !== false} />
                        </td>
                        <td className="px-3 py-2">{pct(sim.ratio)}</td>
                        <td className="px-3 py-2">
                          <StatusBadge ok={sim.compliant !== false} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EscenariosTab({ scenarios }: { scenarios: MFMPScenario[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Escenarios MFMP</h3>
      {scenarios.length === 0 ? (
        <p className="text-sm text-slate-400">No hay escenarios registrados.</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {["Nombre", "Baseline", "Descripción"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {scenarios.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">
                  {s.is_baseline ? (
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                      Baseline
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500">{s.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ImportarFutTab({
  fileRef,
  onImport,
  importing,
  result,
}: {
  fileRef: React.MutableRefObject<HTMLInputElement | null>;
  onImport: () => void;
  importing: boolean;
  result: {
    incomes_upserted: number;
    expenses_upserted: number;
    debts_upserted: number;
    warnings: string[];
  } | null;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">
        Importar FUT (Formato Único Territorial)
      </h3>
      <p className="text-xs text-slate-500">
        Sube un archivo .xlsx con hojas{" "}
        <strong>INGRESOS</strong> y <strong>GASTOS</strong> (columnas: concepto, año, valor) y
        opcionalmente <strong>DEUDA</strong> (columnas: año, saldo, servicio, nuevos).
      </p>

      <div className="flex items-center gap-3">
        <input
          ref={fileRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept=".xlsx"
          className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
        />
        <button
          onClick={onImport}
          disabled={importing}
          className="flex items-center gap-1 rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Upload size={14} /> {importing ? "Importando..." : "Importar"}
        </button>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            Importación completada: {result.incomes_upserted} ingresos ·{" "}
            {result.expenses_upserted} gastos · {result.debts_upserted} deuda
          </div>
          {result.warnings.length > 0 && (
            <div className="rounded-md bg-yellow-50 p-3">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Advertencias:</p>
              <ul className="list-disc list-inside text-xs text-yellow-600 space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
