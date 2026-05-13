import { useState, useMemo } from "react";

export function usePagination(items = [], pageSize = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage   = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const reset = () => setPage(1);

  const PaginationBar = () => {
    if (items.length <= pageSize) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
        <p className="text-xs text-muted-foreground">
          {items.length} résultat{items.length !== 1 ? "s" : ""} · page {safePage}/{totalPages}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Préc.
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
            .reduce((acc, n, i, arr) => {
              if (i > 0 && n - arr[i - 1] > 1) acc.push("...");
              acc.push(n);
              return acc;
            }, [])
            .map((item, i) =>
              item === "..." ? (
                <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors
                    ${item === safePage
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-muted/30"}`}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Suiv. →
          </button>
        </div>
      </div>
    );
  };

  return { paginated, PaginationBar, page: safePage, setPage, totalPages, reset };
}