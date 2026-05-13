import { useEffect, useMemo, useRef, useState } from "react";

const RATE_LEVELS = [0, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const RATE_LABELS = new Set(RATE_LEVELS);

const FALLBACK_RULES = [
  { formule_code: "ACDD", formule_name: "Access", price: 5000, commission_actuelle: 200, current_rate: 4, cashbox_amount: 0, activation_count: 0, in_chart: 1, display_order: 1 },
  { formule_code: "ENGLISH PLUS DD", formule_name:"English +", price: 5000, commission_actuelle: 200, current_rate: 4, cashbox_amount: 0, activation_count: 0, in_chart: 1, display_order: 2 },
  { formule_code: "CHARME", formule_name: "Charme", price: 7000, commission_actuelle: 280, current_rate: 4, cashbox_amount: 0, activation_count: 0, in_chart: 1, display_order: 3 },
  { formule_code: "EVDD", formule_name: "Évasion", price: 10500, commission_actuelle: 420, current_rate: 4, cashbox_amount: 0, activation_count: 0, in_chart: 1, display_order: 4 },
  { formule_code: "ACPDD", formule_name: "Acces+", price: 15000, commission_actuelle: 600, current_rate: 4, cashbox_amount: 0, activation_count: 0, in_chart: 1, display_order: 5 },
  { formule_code: "EVPDD", formule_name: "Evasion+", price: 20000, commission_actuelle: 800, current_rate: 4, cashbox_amount: 0, activation_count: 0, in_chart: 1, display_order: 6 },
  { formule_code: "TCADD", formule_name: "Tout Canal+", price: 28000, commission_actuelle: 1120, current_rate: 4, cashbox_amount: 0, activation_count: 0, in_chart: 1, display_order: 7 },
];

const CODE_ALIASES = {
  Access: "ACDD",
  Evasion: "EVDD",
  "Évasion": "EVDD",
  "Access+": "ACPDD",
  "Acces+": "ACPDD",
  "Tout Canal+": "TCADD",
  Charme: "CHARME",
  CHARME: "CHARME",
  "English Basic": "ENGLISH PLUS DD",
  "ENGLISH PLUS DD": "ENGLISH PLUS DD",
};

const baseCommission = (price, rate) => Math.round((Number(price) || 0) * (Number(rate) || 0) / 100);

const normalizeRule = (rule) => ({
  code: CODE_ALIASES[rule.formule_code || rule.code || rule.formule] || rule.formule_code || rule.code || rule.formule,
  name: rule.formule_name || rule.name || rule.formule,
  price: Number(rule.price) || 0,
  commission: Number(rule.commission_actuelle ?? rule.commissions) || 0,
  rate: Number(rule.current_rate ?? rule.taux ?? 4),
  cashbox: Number(rule.cashbox_amount ?? 0) || 0,
  maxCommission: Number(rule.max_commission ?? baseCommission(rule.price, 10)) || 0,
  activations: Number(rule.activation_count ?? rule.nb_operations ?? 0) || 0,
  inChart: Number(rule.in_chart ?? 1) === 1,
  order: Number(rule.display_order ?? 999),
  trend: rule.visible_trend || rule.trend_direction || rule.trend || "base",
  updatedAt: rule.updated_at || rule.updatedAt || null,
});

export default function CommissionChart({
  commissionsParFormule = [],
  commissionsAdmin = [],
  isAdmin = false,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const rulesRef = useRef([]);
  const [now, setNow] = useState(Date.now());

  const rules = useMemo(() => {
    const source = commissionsAdmin.length > 0 ? commissionsAdmin : commissionsParFormule;
    const byCode = new Map(FALLBACK_RULES.map((rule) => {
      const normalized = normalizeRule(rule);
      return [normalized.code, normalized];
    }));

    source.map(normalizeRule).forEach((incoming) => {
      const existing = byCode.get(incoming.code);
      if (!existing) return;
      const merged = {
        ...existing,
        ...incoming,
        name: existing.name,
        price: incoming.price || existing.price,
        rate: incoming.rate,
        commission: incoming.commission || baseCommission(incoming.price || existing.price, incoming.rate),
        inChart: true,
      };
      byCode.set(incoming.code, merged);
    });

    return Array.from(byCode.values())
      .filter((r) => r.inChart)
      .sort((a, b) => a.order - b.order);
  }, [commissionsAdmin, commissionsParFormule]);

  rulesRef.current = rules;

  useEffect(() => {
    const remainingTimes = rules
      .filter((rule) => rule.updatedAt && rule.trend !== "base")
      .map((rule) => 30 * 60 * 1000 - (Date.now() - new Date(rule.updatedAt).getTime()))
      .filter((remaining) => remaining > 0);

    if (remainingTimes.length === 0) return undefined;
    const timeout = setTimeout(() => setNow(Date.now()), Math.min(...remainingTimes) + 80);
    return () => clearTimeout(timeout);
  }, [rules, now]);

  const activeTrend = (rule) => {
    if (!rule.updatedAt || rule.trend === "base") return "base";
    const age = now - new Date(rule.updatedAt).getTime();
    if (rule.trend === "down" && rule.rate === 4 && age >= 30 * 60 * 1000) return "base";
    return rule.trend;
  };

  const nextReset = useMemo(() => {
    const now = new Date();
    const reset = new Date(now);
    reset.setHours(7, 0, 0, 0);
    if (now >= reset) reset.setDate(reset.getDate() + 1);
    return reset.toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  }, []);

  const buildOrUpdate = () => {
    if (!canvasRef.current || typeof window.Chart === "undefined") return;

    const styles = getComputedStyle(document.documentElement);
   const primary = styles.getPropertyValue("--primary").trim() || "#378ADD";
   const accent = `hsl(${styles.getPropertyValue("--chart-2").trim()})`;
    const textColor = styles.getPropertyValue("--foreground").trim() || "#111827";
    const gridColor = styles.getPropertyValue("--border").trim() || "#e5e7eb";

    const labels = rules.map((r) => r.name);
    const rates = rules.map((r) => r.rate);
    const red = "#ef4444";
   const colors = rules.map((r) => {
  const trend = activeTrend(r);
  if (trend === "down") return "#ef4444";   // rouge
  if (trend === "up")   return "#22c55e";   // vert
  return primary;
  
});

    const data = {
      labels,
      datasets: [{
        label: "Taux actuel",
        data: rates,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.89,
        categoryPercentage: 0.9,
      }],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => rules[items[0]?.dataIndex]?.name || "",
            label: (ctx) => {
              const r = rules[ctx.dataIndex];
              const lines = [
                `Taux : ${r.rate.toLocaleString("fr-FR")}%`,
                `Commission : ${Math.round(r.commission).toLocaleString("fr-FR")} FCFA`,
                `Activations : ${r.activations}`,
              ];
              if (isAdmin) {
                lines.splice(2, 0, `Caisse : ${Math.round(r.cashbox).toLocaleString("fr-FR")} FCFA`);
              }
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 11 }, color: textColor, maxRotation: 0, autoSkip: false },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 0.5,
            autoSkip: false,
            color: textColor,
            font: { size: 11 },
            callback: (value) => RATE_LABELS.has(Number(value)) ? `${String(value).replace(".", ",")}%` : null,
          },
          grid: { color: (ctx) => RATE_LABELS.has(Number(ctx.tick.value)) ? gridColor : "transparent" },
          border: { display: false },
        },
      },
      animation: { duration: 0 },
    };

    const valueLabels = {
      id: "valueLabels",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.font = "700 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = textColor;
        chart.getDatasetMeta(0).data.forEach((bar, index) => {
          const r = rulesRef.current[index];
          if (!r) return;
          ctx.fillText(`${Math.min(Math.round(r.commission), r.maxCommission).toLocaleString("fr-FR")} F`, bar.x, bar.y - 8);
        });
        ctx.restore();
      },
    };

    if (chartRef.current) {
      chartRef.current.data = data;
      chartRef.current.options = options;
      chartRef.current.update("none");
      return;
    }

    chartRef.current = new window.Chart(canvasRef.current, {
      type: "bar",
      data,
      options,
      plugins: [valueLabels],
    });
  };

  useEffect(() => {
    if (typeof window.Chart !== "undefined") {
      buildOrUpdate();
      return;
    }
    const existing = document.querySelector("script[data-chartjs='true']");
    if (existing) {
      existing.addEventListener("load", buildOrUpdate, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
    script.dataset.chartjs = "true";
    script.onload = buildOrUpdate;
    document.head.appendChild(script);
  }, [rules, now]);

  useEffect(() => () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
  }, []);

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            {isAdmin ? "Pilotage global" : "Mes commissions"}
          </p>
          <h2 className="text-sm font-bold text-foreground mt-0.5">Courbe évolutive des commissions</h2>
        </div>
        {isAdmin && (
          <span className="text-[11px] px-3 py-1 rounded-full font-medium border bg-muted text-muted-foreground border-border">
            Reset {nextReset}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="flex flex-wrap gap-3 mb-3">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-primary" />
            Base
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: "var(--chart-2)" }} />
            Hausse
          </span>
          {isAdmin && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-red-500" />
              Baisse
            </span>
          )}
        </div>

        <div style={{ position: "relative", width: "100%", height: "270px", marginBottom: "12px" }}>
          <canvas ref={canvasRef} role="img" aria-label="Courbe des pourcentages de commissions Canal+">Commissions Canal+.</canvas>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            {rules.map((r) => (
              <div key={r.code} className="rounded-lg border border-border bg-muted/20 p-2.5 text-center transition-all">
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5 truncate">{r.name}</p>
                <p className="text-sm font-bold text-foreground">{r.rate.toLocaleString("fr-FR")}%</p>
                <p className="text-[11px] font-semibold text-foreground">{Math.min(Math.round(r.commission), r.maxCommission).toLocaleString("fr-FR")} F</p>
                <p className="text-[10px] text-muted-foreground">Caisse {Math.round(r.cashbox).toLocaleString("fr-FR")} F</p>
                <p className="text-[10px] text-muted-foreground">{r.activations} act.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
