"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { FiscalYear, Paginated } from "@/types";
import { CheckCircle2, Plus, Save, Trash2, XCircle } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";
import { useContextStore } from "@/stores/contextStore";

type Row = FiscalYear & { _dirty?: boolean; _tempId?: string };

export default function FinancieroPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<FiscalYear>>("/anios-fiscales/", { page_size: 50, ordering: "year" })
      .then((d) => setRows(d.results as Row[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, version]);

  const addRow = () => {
    const thisYear = new Date().getFullYear();
    const temp: Row = {
      _tempId: `tmp-${Date.now()}`,
      _dirty: true,
      id: 0,
      entity: activeEntity.id,
      entity_name: "",
      year: thisYear,
      current_income: 0,
      operating_expenses: 0,
      personnel_expenses: 0,
      law_617_limit_pct: 50,
      debt_service: 0,
      total_debt: 0,
      law_617_ratio: 0,
      law_617_compliant: true,
      solvency_ratio: 0,
      sustainability_ratio: 0,
      notes: "",
    };
    setRows([...rows, temp]);
  };

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch, _dirty: true } : r)));

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    if (row.id) {
      if (!confirm("¿Eliminar este año fiscal?")) return;
      await api.delete(`/anios-fiscales/${row.id}/`);
    }
    setRows(rows.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const row of rows.filter((r) => r._dirty)) {
        const payload = {
          entity: activeEntity.id,
          year: Number(row.year),
          current_income: row.current_income,
          operating_expenses: row.operating_expenses,
          personnel_expenses: row.personnel_expenses,
          law_617_limit_pct: row.law_617_limit_pct,
          debt_service: row.debt_service,
          total_debt: row.total_debt,
          notes: row.notes,
        };
        if (row.id) {
          await api.put(`/anios-fiscales/${row.id}/`, payload);
        } else {
          await api.post(`/anios-fiscales/`, payload);
        }
      }
      load();
    } finally {
      setSaving(false);
    }
  };

  const dirty = rows.some((r) => r._dirty);

  const totals = useMemo(() => {
    if (rows.length === 0) return null;
    const last = rows[rows.length - 1];
    return {
      year: last.year,
      ratio: Number(last.law_617_ratio),
      limit: Number(last.law_617_limit_pct),
      compliant: last.law_617_compliant,
    };
  }, [rows]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análisis financiero</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · Indicadores Ley 617/2000 y Ley 358/1997.
          </p>
        </div>
        <ExportBar
          xlsxPath="/anios-fiscales/export/xlsx/"
          docxPath="/anios-fiscales/export/docx/"
          disabled={loading || rows.length === 0}
        />
      </div>

      {totals && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium uppercase text-slate-500">
            Último año — cumplimiento Ley 617/2000
          </div>
          <div className="mt-2 flex items-center gap-3">
            {totals.compliant ? (
              <CheckCircle2 className="text-emerald-600" size={28} />
            ) : (
              <XCircle className="text-red-600" size={28} />
            )}
            <div>
              <div
                className={
                  "text-2xl font-semibold tabular-nums " +
                  (totals.compliant ? "text-emerald-700" : "text-red-700")
                }
              >
                {totals.ratio.toFixed(2)}% / {totals.limit}%
              </div>
              <div className="text-xs text-slate-500">
                Gastos de funcionamiento sobre ICLD — año {totals.year}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold uppercase text-slate-600">
            Años fiscales ({rows.length})
          </span>
          <div className="flex gap-2">
            {dirty && (
              <button
                onClick={saveAll}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-800 disabled:bg-slate-400"
              >
                <Save size={12} /> {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={12} /> Agregar año
            </button>
          </div>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Sin información financiera. Agrega los últimos 4 años.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[11px]">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="p-2 text-left">Año</th>
                  <th className="p-2 text-right">ICLD</th>
                  <th className="p-2 text-right">Funcionamiento</th>
                  <th className="p-2 text-right">Personal</th>
                  <th className="p-2 text-right">% Ley 617</th>
                  <th className="p-2 text-right">Límite %</th>
                  <th className="p-2 text-center">Cumple</th>
                  <th className="p-2 text-right">Servicio deuda</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.id || r._tempId}
                    className={"border-t border-slate-100 " + (r._dirty ? "bg-amber-50" : "")}
                  >
                    <td className="p-1">
                      <input
                        type="number"
                        value={r.year}
                        onChange={(e) => updateRow(idx, { year: Number(e.target.value) })}
                        className="w-20 rounded border border-slate-200 px-1 py-0.5 text-right"
                      />
                    </td>
                    <td className="p-1 text-right">
                      <Num value={Number(r.current_income)} onChange={(v) => updateRow(idx, { current_income: v })} />
                    </td>
                    <td className="p-1 text-right">
                      <Num value={Number(r.operating_expenses)} onChange={(v) => updateRow(idx, { operating_expenses: v })} />
                    </td>
                    <td className="p-1 text-right">
                      <Num value={Number(r.personnel_expenses)} onChange={(v) => updateRow(idx, { personnel_expenses: v })} />
                    </td>
                    <td className="p-1 text-right font-semibold tabular-nums">
                      {Number(r.law_617_ratio).toFixed(2)}%
                    </td>
                    <td className="p-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={Number(r.law_617_limit_pct)}
                        onChange={(e) => updateRow(idx, { law_617_limit_pct: Number(e.target.value) })}
                        className="w-16 rounded border border-slate-200 px-1 py-0.5 text-right tabular-nums"
                      />
                    </td>
                    <td className="p-1 text-center">
                      {r.law_617_compliant ? (
                        <CheckCircle2 size={14} className="mx-auto text-emerald-600" />
                      ) : (
                        <XCircle size={14} className="mx-auto text-red-600" />
                      )}
                    </td>
                    <td className="p-1 text-right">
                      <Num value={Number(r.debt_service)} onChange={(v) => updateRow(idx, { debt_service: v })} />
                    </td>
                    <td className="p-1 text-right">
                      <button onClick={() => removeRow(idx)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Num({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step={1000}
      min={0}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-32 rounded border border-slate-200 px-1 py-0.5 text-right tabular-nums"
    />
  );
}
