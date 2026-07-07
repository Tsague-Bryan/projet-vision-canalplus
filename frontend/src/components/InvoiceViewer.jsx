import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Printer, X } from "lucide-react";
import { apiUrl } from "../lib/api";
import { getToken } from "../lib/session";

const invoiceApiUrl = (invoicePath = "") => {
  const file = String(invoicePath).split("/").pop();
  if (!file) return "";
  return apiUrl(`/invoice-html/${encodeURIComponent(file)}`);
};

export default function InvoiceViewer({ invoiceUrl, onClose, autoPrint = false }) {
  const iframeRef = useRef(null);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endpoint = useMemo(() => invoiceApiUrl(invoiceUrl), [invoiceUrl]);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(endpoint, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error("Facture introuvable ou session expiree.");
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Impossible de charger la facture.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  useEffect(() => {
    if (!html || !autoPrint) return;
    const timer = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [html, autoPrint]);

  const printInvoice = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  if (!invoiceUrl) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col">
      <div className="h-14 border-b border-border bg-card flex items-center gap-2 px-3 sm:px-5 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-lg border border-border bg-background text-foreground hover:bg-muted/70 active:scale-95 transition-all flex items-center justify-center"
          title="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">Facture</p>
          <p className="text-[11px] text-muted-foreground truncate">{String(invoiceUrl).split("/").pop()}</p>
        </div>
        <button
          type="button"
          onClick={printInvoice}
          disabled={!html || loading}
          className="h-10 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-95 transition-all flex items-center gap-2 text-xs font-semibold"
        >
          <Printer size={15} />
          Imprimer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-lg border border-border bg-background text-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all flex items-center justify-center"
          title="Fermer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 bg-muted/30">
        {loading && <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Chargement de la facture...</div>}
        {error && !loading && <div className="h-full flex items-center justify-center text-sm text-destructive px-6 text-center">{error}</div>}
        {!loading && !error && html && (
          <iframe
            ref={iframeRef}
            title="Facture"
            srcDoc={html}
            className="w-full h-full bg-white"
            sandbox="allow-same-origin allow-modals"
          />
        )}
      </div>
    </div>
  );
}
