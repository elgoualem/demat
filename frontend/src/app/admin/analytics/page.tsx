"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AdminGuard from "@/components/AdminGuard";
import { getAdminAnalytics, Analytics, AnalyticsRange, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

// Palette catégorielle validée (dataviz skill) : ordre fixe, jamais réassigné
// selon le classement — la couleur d'un fournisseur suit son index dans la
// liste complète des fournisseurs, pas son rang dans les données affichées.
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

const DAY_OPTIONS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
];

type Metric = "amount" | "platformFee";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const [preset, setPreset] = useState<number | "custom">(30);
  const [customFrom, setCustomFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86400000)));
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()));
  const [metric, setMetric] = useState<Metric>("amount");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const range: AnalyticsRange = preset === "custom" ? { from: customFrom, to: customTo } : { days: preset };

  useEffect(() => {
    if (!token) return;
    if (preset === "custom" && (!customFrom || !customTo)) return;
    setLoading(true);
    getAdminAnalytics(token, range)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
    // `range` est recréé à chaque rendu ; on ne redéclenche que sur ses entrées réelles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, preset, customFrom, customTo]);

  // Fournisseurs ayant au moins une commande confirmée sur la période : seuls
  // eux tracent une ligne, mais leur couleur reste indexée sur la liste
  // complète pour ne jamais changer quand la période bouge.
  const activeProviders = useMemo(() => {
    if (!data) return [];
    const withData = new Set(data.summary.filter((s) => s.confirmedCount > 0).map((s) => s.providerId));
    return data.providers
      .map((p, i) => ({ ...p, color: SERIES_COLORS[i % SERIES_COLORS.length] }))
      .filter((p) => withData.has(p.id));
  }, [data]);

  const chartRows = useMemo(() => {
    if (!data) return [];
    return data.daily.map((d) => {
      const row: Record<string, number | string> = { date: d.date };
      for (const p of activeProviders) {
        row[p.name] = (d.byProvider[p.id]?.[metric] ?? 0) / 100;
      }
      return row;
    });
  }, [data, activeProviders, metric]);

  return (
    <AdminGuard>
      <div>
        <Link href="/admin" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Tableau de bord
        </Link>
        <h1 className="mb-1 font-serif text-3xl text-stone-900">Analytique</h1>
        <p className="mb-6 text-stone-500">Chiffre d&apos;affaires et commission par fournisseur, comparés dans le temps.</p>

        <div className="mb-3 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreset(opt.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  preset === opt.value ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setPreset("custom")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                preset === "custom" ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              Dates personnalisées
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMetric("amount")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                metric === "amount" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              Chiffre d&apos;affaires
            </button>
            <button
              onClick={() => setMetric("platformFee")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                metric === "platformFee" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              Commission
            </button>
          </div>
        </div>

        {preset === "custom" && (
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Du</span>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Au</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={isoDate(new Date())}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-stone-500">Chargement…</p>
        ) : !data || activeProviders.length === 0 ? (
          <p className="mb-8 text-stone-500">Aucune commande confirmée sur cette période.</p>
        ) : (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e1e0d9" strokeDasharray="0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fill: "#898781", fontSize: 12 }}
                    axisLine={{ stroke: "#c3c2b7" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#898781", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatPrice(v * 100, "EUR")}
                    width={80}
                  />
                  <Tooltip
                    labelFormatter={(v) => shortDate(String(v))}
                    formatter={(value, name) => [formatPrice(Number(value) * 100, "EUR"), String(name)]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e1e0d9", fontSize: 13 }}
                  />
                  {activeProviders.map((p) => (
                    <Line
                      key={p.id}
                      type="monotone"
                      dataKey={p.name}
                      stroke={p.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: p.color, stroke: "#fff", strokeWidth: 2 }}
                      activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {activeProviders.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-sm text-stone-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {data && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">Diagnostic par fournisseur</h2>
              <button onClick={() => setShowTable((v) => !v)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                {showTable ? "Masquer le détail journalier" : "Voir le détail journalier"}
              </button>
            </div>
            <div className="mb-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                    <th className="p-3 font-medium">Fournisseur</th>
                    <th className="p-3 font-medium">Commandes</th>
                    <th className="p-3 font-medium">Confirmées</th>
                    <th className="p-3 font-medium">Échouées</th>
                    <th className="p-3 font-medium">Taux de confirmation</th>
                    <th className="p-3 font-medium">Panier moyen</th>
                    <th className="p-3 font-medium">Chiffre d&apos;affaires</th>
                    <th className="p-3 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.map((s) => (
                    <tr key={s.providerId} className="border-b border-stone-50 last:border-0">
                      <td className="p-3 font-medium text-stone-900">{s.providerName}</td>
                      <td className="p-3 text-stone-600">{s.orderCount}</td>
                      <td className="p-3 text-stone-600">{s.confirmedCount}</td>
                      <td className="p-3 text-stone-600">{s.failedCount}</td>
                      <td className="p-3 text-stone-600">
                        {s.confirmationRate !== null ? `${Math.round(s.confirmationRate * 100)}%` : "—"}
                      </td>
                      <td className="p-3 text-stone-600">{s.confirmedCount > 0 ? formatPrice(s.avgOrderValue, "EUR") : "—"}</td>
                      <td className="p-3 font-medium text-stone-900">{formatPrice(s.amount, "EUR")}</td>
                      <td className="p-3 text-stone-600">{formatPrice(s.platformFee, "EUR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showTable && (
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                      <th className="p-3 font-medium">Date</th>
                      {activeProviders.map((p) => (
                        <th key={p.id} className="p-3 font-medium">{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.date} className="border-b border-stone-50 last:border-0">
                        <td className="p-3 text-stone-500">{shortDate(d.date)}</td>
                        {activeProviders.map((p) => (
                          <td key={p.id} className="p-3 text-stone-700">
                            {formatPrice(d.byProvider[p.id]?.[metric] ?? 0, "EUR")}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {data.daily.length === 0 && (
                      <tr>
                        <td colSpan={activeProviders.length + 1} className="p-4 text-center text-stone-400">
                          Aucune donnée sur cette période.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminGuard>
  );
}
