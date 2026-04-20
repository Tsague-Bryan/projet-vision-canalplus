import { useState, useMemo } from "react";
 
// ── Hook ─────────────────────────────────────────────────────────────────────
export function usePagination(items = [], pageSize = 10) {
  const [page, setPage] = useState(1);
 
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage   = Math.min(page, totalPages);
 
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);
 
  // Réinitialiser à la page 1 si les items changent (ex: filtre)
  const reset = () => setPage(1);
 
  const PaginationBar = () => {
    if (items.length <= pageSize) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
        <p className="text-xs text-gray-400">
          {items.length} résultat{items.length !== 1 ? "s" : ""} · page {safePage}/{totalPages}
        </p>
        <div className="flex items-center gap-1.5">
          {/* Prev */}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Préc.
          </button>
 
          {/* Numéros de page */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => {
              // Afficher : 1, totalPages, et les pages proches de la page courante
              return n === 1 || n === totalPages || Math.abs(n - safePage) <= 1;
            })
            .reduce((acc, n, i, arr) => {
              // Ajouter "..." entre pages non consécutives
              if (i > 0 && n - arr[i - 1] > 1) acc.push("...");
              acc.push(n);
              return acc;
            }, [])
            .map((item, i) =>
              item === "..." ? (
                <span key={`dots-${i}`} className="px-1 text-xs text-gray-400">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors
                    ${item === safePage
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {item}
                </button>
              )
            )}
 
          {/* Next */}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Suiv. →
          </button>
        </div>
      </div>
    );
  };
 
  return { paginated, PaginationBar, page: safePage, setPage, totalPages, reset };
}
 