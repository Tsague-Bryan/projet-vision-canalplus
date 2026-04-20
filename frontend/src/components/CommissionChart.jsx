// src/components/CommissionChart.jsx
// Charge Chart.js dynamiquement si pas déjà chargé
import { useEffect, useRef, useMemo } from "react";

const FORMULES_BASE = [
  { name: "Access",      code: "ACDD",  base: 300  },
  { name: "Évasion",     code: "EVDD",  base: 600  },
  { name: "Access+",     code: "ACPDD", base: 900  },
  { name: "Tout Canal+", code: "TCADD", base: 1200 },
];

const resolveFormule = (raw) => {
  const map = {
    ACDD:"Access", EVDD:"Évasion", ACPDD:"Access+",
    EVPDD:"Évasion+", TCADD:"Tout Canal+",
    Access:"Access", Evasion:"Évasion", "Évasion":"Évasion",
    "Access+":"Access+", "Tout Canal+":"Tout Canal+",
    Essentiel:"Essentiel",
  };
  return map[raw] || raw;
};

export default function CommissionChart({
  commissionsParFormule = [],
  isAdmin = false,
  commissionsAdmin = [],
  onUpdate,
  adminTotal = 0,
  seuilAdmin = 50000,
}) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const statsMap = useMemo(() => {
    const m = {};
    commissionsParFormule.forEach(s => {
      const name = resolveFormule(s.formule);
      m[name] = { commissions: Number(s.commissions)||0, nbOps: Number(s.nb_operations)||0 };
    });
    return m;
  }, [commissionsParFormule]);

  const adminMap = useMemo(() => {
    const m = {};
    commissionsAdmin.forEach(c => {
      m[resolveFormule(c.formule)] = Number(c.commission_actuelle)||0;
    });
    return m;
  }, [commissionsAdmin]);

  const getCommCourante = (f) => adminMap[f.name] ?? f.base;
  const bonusOn = adminTotal >= seuilAdmin;

  const bestFormule = useMemo(() => {
    let best=null, maxOps=0;
    FORMULES_BASE.forEach(f => {
      const n = statsMap[f.name]?.nbOps||0;
      if(n>maxOps){maxOps=n; best=f.name;}
    });
    return maxOps>0?best:null;
  }, [statsMap]);

  const getBonus = (f) => {
    const cur    = getCommCourante(f);
    const manual = Math.max(0, cur - f.base);
    const dynamic = bonusOn && f.name === bestFormule ? Math.round(f.base * 0.5) : 0;
    return manual + dynamic;
  };

  const pct = Math.min(100, (adminTotal/seuilAdmin)*100);

  const buildOrUpdate = () => {
    if (!canvasRef.current || typeof window.Chart === "undefined") return;
    const bases   = FORMULES_BASE.map(f => f.base);
    const bonuses = FORMULES_BASE.map(f => getBonus(f));
    const maxY    = Math.max(...FORMULES_BASE.map((f,i)=>bases[i]+bonuses[i]));
    const scaleMax = Math.ceil(maxY/300)*300+300;

    if (chartRef.current) {
      chartRef.current.data.datasets[0].data = bases;
      chartRef.current.data.datasets[1].data = bonuses;
      chartRef.current.options.scales.y.max  = scaleMax;
      chartRef.current.update("none");
      return;
    }

    chartRef.current = new window.Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: FORMULES_BASE.map(f=>f.name),
        datasets: [
          { label:"Base",         data:bases,   backgroundColor:"#378ADD", stack:"s", barPercentage:0.5, categoryPercentage:0.65, borderRadius:4, borderSkipped:false },
          { label:"Augmentation", data:bonuses, backgroundColor:"#639922", stack:"s", barPercentage:0.5, categoryPercentage:0.65, borderRadius:4, borderSkipped:false },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            callbacks:{
              label:c => c.parsed.y===0?null:`${c.dataset.label} : ${Math.round(c.parsed.y).toLocaleString("fr-FR")} FCFA`,
              afterBody:items => {
                const i=items[0]?.dataIndex; if(i===undefined)return[];
                const tot = FORMULES_BASE[i].base+getBonus(FORMULES_BASE[i]);
                return["──────────",`Total : ${tot.toLocaleString("fr-FR")} FCFA/opération`];
              }
            }
          }
        },
        scales:{
          x:{ stacked:true, ticks:{font:{size:11},color:"#888780",autoSkip:false}, grid:{display:false}, border:{display:false} },
          y:{
            stacked:true, min:0, max:scaleMax,
            ticks:{ font:{size:11}, color:"#888780", stepSize:300, callback:v=>v===0?"0":Math.round(v).toLocaleString("fr-FR") },
            grid:{color:"rgba(0,0,0,0.06)"}, border:{display:false},
          }
        }
      }
    });
  };

  // Charger Chart.js puis construire
  useEffect(() => {
    if (typeof window.Chart !== "undefined") { buildOrUpdate(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
    s.onload = buildOrUpdate;
    document.head.appendChild(s);
  });

  useEffect(() => () => { if(chartRef.current){chartRef.current.destroy();chartRef.current=null;} }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            {isAdmin?"Vue globale":"Mes performances"}
          </p>
          <h2 className="text-sm font-bold text-gray-900 mt-0.5">Jeu de commissions Canal+</h2>
        </div>
        <span className={`text-[11px] px-3 py-1 rounded-full font-medium border
          ${bonusOn ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
          {bonusOn?"Bonus actif":"Actif"}
        </span>
      </div>

      <div className="px-5 py-4">

        {/* Barre seuil - admin uniquement */}
        {isAdmin && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Commissions admin accumulées</span>
              <span className="font-medium text-gray-700">
                {Math.round(adminTotal).toLocaleString("fr-FR")} / {seuilAdmin.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{width:`${pct}%`}}/>
            </div>
            {bonusOn && (
              <p className="mt-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                Seuil atteint — bonus automatique{bestFormule && <> sur <strong>{bestFormule}</strong></>}
              </p>
            )}
          </div>
        )}

        {/* Légende */}
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            { color:"#378ADD", label:"Commission de base" },
            { color:"#639922", label:isAdmin?"Augmentation (admin ou bonus dynamique)":"Bonus actif" },
          ].map(({color,label})=>(
            <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:color}}/>
              {label}
            </span>
          ))}
        </div>

        {/* Canvas */}
        <div style={{position:"relative",width:"100%",height:"240px",marginBottom:"12px"}}>
          <canvas ref={canvasRef} role="img" aria-label="Commissions Canal+ par formule">Commissions Canal+.</canvas>
        </div>

        {/* Mini stats par formule */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {FORMULES_BASE.map(f => {
            const stat  = statsMap[f.name]||{commissions:0,nbOps:0};
            const total = f.base+getBonus(f);
            const isBest = bonusOn && f.name===bestFormule;
            return (
              <div key={f.name} className={`rounded-xl border p-2.5 text-center transition-all
                ${isBest?"border-green-300 bg-green-50":"border-gray-100 bg-gray-50"}`}>
                <p className="text-[10px] font-medium text-gray-500 mb-0.5">{f.name}</p>
                <p className="text-sm font-bold text-gray-900">{total.toLocaleString("fr-FR")} F</p>
                <p className="text-[10px] text-gray-400">{stat.nbOps} op.</p>
                {isBest && <p className="text-[10px] text-green-600 font-medium mt-0.5">+VENDUE</p>}
              </div>
            );
          })}
        </div>

        {/* Sliders admin */}
        {isAdmin && onUpdate && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-700 mb-3">Ajustement manuel des commissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FORMULES_BASE.map(f => {
                const cur = getCommCourante(f);
                return (
                  <div key={f.name} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                      <span className="font-medium text-gray-700">{f.name}</span>
                      <span>base {f.base.toLocaleString("fr-FR")} F</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="range" min={f.base} max={f.base*3} step={50} value={cur}
                        className="flex-1"
                        onChange={e=>onUpdate(f.code, parseInt(e.target.value))}/>
                      <span className="text-[11px] font-bold text-gray-800 min-w-[60px] text-right">
                        {cur.toLocaleString("fr-FR")} F
                      </span>
                    </div>
                    {cur>f.base && (
                      <p className="text-[10px] text-green-600 mt-1">
                        +{(cur-f.base).toLocaleString("fr-FR")} F au-dessus de la base
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isAdmin && (
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Barres bleues = commission de base. Barres vertes = bonus automatique (formule la plus vendue quand seuil atteint) ou augmentation manuelle. Ordonnées graduées par paliers de 300 FCFA.
          </p>
        )}
      </div>
    </div>
  );
}