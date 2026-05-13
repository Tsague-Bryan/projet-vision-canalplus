import React from 'react';

/**
 * Composant StatusBadge pour les demandes techniques
 * @param {string} statut - Le code du statut provenant du backend
 */
const StatusBadge = ({ statut }) => {
  // Configuration des styles et labels par statut
  const statusConfig = {
    en_attente: {
      label: "En attente",
      styles: "bg-amber-50 text-amber-700 border-amber-100",
      dot: "bg-amber-500"
    },
    en_cours: {
      label: "En cours",
      styles: "bg-blue-50 text-blue-700 border-blue-100",
      dot: "bg-blue-500"
    },
    terminee: {
      label: "Terminé",
      styles: "bg-emerald-50 text-emerald-700 border-emerald-100",
      dot: "bg-emerald-500"
    },
    annulee: {
      label: "Annulé",
      styles: "bg-red-50 text-red-700 border-red-100",
      dot: "bg-red-500"
    }
  };

  const { label, styles, dot } = statusConfig[statut] || { 
    label: statut, 
    styles: "bg-slate-50 text-slate-700 border-slate-100",
    dot: "bg-slate-500"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      {label}
    </span>
  );
};

export default StatusBadge;