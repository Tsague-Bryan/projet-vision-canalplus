

import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const offres = [
  { name: "Access",      price: 5000  },
  { name: "Evasion",     price: 10500 },
  { name: "Access+",     price: 15000 },
  { name: "Evasion+",    price: 20000 },
  { name: "Tout Canal+", price: 28000 },
];

const optionsList = [
  { code: "CHARME",           name: "CHARME",                  price: 7000 },
  { code: "ENGLISH PLUS DD",  name: "ENGLISH PLUS DD",         price: 5000 },
  { code: "NETFLIX",          name: "NETFLIX BASIC ( 1S )",    price: 3000 },
  { code: "NETFLIX STANDARD", name: "NETFLIX STANDARD ( 2S )", price: 5500 },
  { code: "NETFLIX PREMIUM",  name: "NETFLIX PREMIUM ( 4S )",  price: 7000 },
];

export default function Reabonnement() {
  const navigate = useNavigate();
  const [step, setStep]                       = useState(1);
  const [isUpgradeMode, setIsUpgradeMode]     = useState(false);
  const [isAddOptionMode, setIsAddOptionMode] = useState(false);
  const [operationType, setOperationType]     = useState("reabonnement");
  const [searchType, setSearchType]           = useState("numabo");
  const [searchValue, setSearchValue]         = useState("");
  const [client, setClient]                   = useState(null);
  const [searchResults, setSearchResults]     = useState([]);
  const [formule, setFormule]                 = useState("");
  const [duree, setDuree]                     = useState(1);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [optionsOpen, setOptionsOpen]         = useState(false);
  const [montant, setMontant]                 = useState(0);
  const [loading, setLoading]                 = useState(false);

  const mapFormule = (name) => {
    switch (name) {
      case "Access":      return "ACDD";
      case "Evasion":     return "EVDD";
      case "Access+":     return "ACPDD";
      case "Evasion+":    return "EVPDD";
      case "Tout Canal+": return "TCADD";
      default: return name;
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith("237") && clean.length === 12) clean = "00" + clean;
    if (clean.startsWith("00237") && clean.length === 14) return clean;
    if (clean.length === 9) return "00237" + clean;
    return "";
  };

  // Mapping étendu : tous les codes possibles retournés par l'API Fujisat → nom affichable
  const getFormulePrice = (formuleName) => {
    if (!formuleName) return 0;
    const codeToName = {
      "ACDD":        "Access",
      "EVDD":        "Evasion",
      "ACPDD":       "Access+",
      "EVPDD":       "Evasion+",
      "TCADD":       "Tout Canal+",
      "ACCESS":      "Access",
      "ACCES":       "Access",
      "EVASION":     "Evasion",
      "ACCESS+":     "Access+",
      "ACCES+":      "Access+",
      "EVASION+":    "Evasion+",
      "TOUT CANAL+": "Tout Canal+",
      "TOUTCANAL+":  "Tout Canal+",
      "TOUT_CANAL+": "Tout Canal+",
      "TOUT CANAL":  "Tout Canal+",
      "Access":      "Access",
      "Evasion":     "Evasion",
      "Access+":     "Access+",
      "Evasion+":    "Evasion+",
      "Tout Canal+": "Tout Canal+",
    };
    const resolved = codeToName[formuleName] ?? codeToName[formuleName?.toUpperCase()] ?? formuleName;
    return offres.find((o) => o.name === resolved)?.price || 0;
  };

  const getOptionsTotal = (codes) =>
    optionsList.reduce((sum, o) => (codes.includes(o.code) ? sum + o.price : sum), 0);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const [day, month, year] = dateString.split("/");
    return `${day}/${month}/${year}`;
  };

  const currentClientFormule = client?.bouquet || client?.previousFormule || "";

  // ✅ NOUVELLE LOGIQUE UPGRADE :
  // montant = (prix nouvelle formule − prix formule actuelle) + options
  const recalcMontant = ({
    nextFormule     = formule,
    nextDuree       = duree,
    nextOptions     = selectedOptions,
    nextIsUpgrade   = isUpgradeMode,
    nextIsAddOption = isAddOptionMode,
  } = {}) => {
    const optionsTotal = getOptionsTotal(nextOptions);
    const d = Number(nextDuree) || 1;

    if (nextIsUpgrade) {
      const prixNouvelle = getFormulePrice(nextFormule);
      const prixActuelle = getFormulePrice(currentClientFormule);
      const delta = Math.max(0, prixNouvelle - prixActuelle);
      return delta + optionsTotal;
    }

    if (nextIsAddOption) {
      return optionsTotal;
    }

    // Réabonnement classique
    return (getFormulePrice(nextFormule) + optionsTotal) * d;
  };

  const handleOptionToggle = (code) => {
    const next = selectedOptions.includes(code)
      ? selectedOptions.filter((c) => c !== code)
      : [...selectedOptions, code];
    setSelectedOptions(next);
    setMontant(recalcMontant({ nextOptions: next }));
    setOptionsOpen(false);
  };

  const handleFormuleChange = (value) => {
    setFormule(value);
    setMontant(recalcMontant({ nextFormule: value }));
  };

  const handleDureeChange = (value) => {
    setDuree(value);
    setMontant(recalcMontant({ nextDuree: value }));
  };

  const handleOperationTypeChange = (type) => {
    const upgrade   = type === "upgrade";
    const addOption = type === "addOption";
    setOperationType(type);
    setIsUpgradeMode(upgrade);
    setIsAddOptionMode(addOption);

    if (addOption) setFormule(currentClientFormule);

    setMontant(recalcMontant({
      nextIsUpgrade:   upgrade,
      nextIsAddOption: addOption,
      nextFormule:     addOption ? currentClientFormule : formule,
    }));
  };

  const searchClient = async () => {
    if (!searchValue.trim()) { alert("Entrez une valeur de recherche"); return; }
    setLoading(true);
    try {
      const payload = {};
      if (searchType === "numabo")    payload.numabo    = searchValue.trim();
      if (searchType === "decodeur")  payload.numdecabo = searchValue.trim();
      if (searchType === "telephone") payload.telephone = searchValue.trim();
      if (searchType === "email")     payload.email     = searchValue.trim();

      const res = await axios.post("http://localhost:5000/api/abonne/search", payload);
      const results = res.data?.abonnes || (res.data?.abonne ? [res.data.abonne] : []);

      if (results.length > 0) {
        setSearchResults(results);
        setClient(results.length === 1 ? results[0] : null);
      } else {
        alert("Abonné introuvable");
        setClient(null);
        setSearchResults([]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la recherche.");
      setClient(null);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectSearchResult = (result) => {
    console.log("📋 Bouquet reçu :", result?.bouquet, "| previousFormule :", result?.previousFormule);
    const bouquet     = result?.bouquet || result?.previousFormule || "";
    const prixFormule = getFormulePrice(bouquet);
    console.log("💰 Prix résolu pour", bouquet, ":", prixFormule, "FCFA");

    setClient(result);
    setStep(2);
    setOperationType("reabonnement");
    setIsUpgradeMode(false);
    setIsAddOptionMode(false);
    setFormule(bouquet);
    setSelectedOptions([]);
    setDuree(1);
    setMontant(prixFormule);
  };

  const resetAll = () => {
    setSearchValue(""); setClient(null); setSearchResults([]);
    setFormule(""); setSelectedOptions([]); setDuree(1); setMontant(0);
    setIsUpgradeMode(false); setIsAddOptionMode(false);
    setOperationType("reabonnement"); setStep(1);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) { alert("Utilisateur non connecté"); return; }

    const numeroContrat = client?.numeroContrat || 1;
    let payload;
    let url;

    if (isUpgradeMode) {
      if (!formule) { alert("Veuillez sélectionner la nouvelle formule"); return; }
      payload = {
        numero_abonne:  client?.numabo || "",
        formule:        mapFormule(formule),
        materialNumber: client?.numdecabo,
        numeroContrat:  Number(numeroContrat),
        montant,
        options:        selectedOptions,
      };
      url = "http://localhost:5000/api/reabonnement/upgrade";

    } else if (isAddOptionMode) {
      payload = {
        numero_abonne:  client?.numabo || "",
        formule:        mapFormule(currentClientFormule),
        materialNumber: client?.numdecabo,
        numeroContrat:  Number(numeroContrat),
        montant,
        options:        selectedOptions,
      };
      url = "http://localhost:5000/api/reabonnement/upgrade";

    } else {
      if (!formule) { alert("Veuillez sélectionner une formule"); return; }
      const tel = formatPhone(client?.manualPhone || client?.telephone || "");
      if (!tel || tel.length !== 14) {
        alert("Téléphone invalide. Format attendu: 00237xxxxxxxxx");
        return;
      }
      payload = {
        userId:          localStorage.getItem("userId"),
        numero_abonne:   client?.numabo || "",
        formule:         mapFormule(formule),
        duree:           Number(duree),
        montant,
        telephoneAbonne: tel,
        materialNumber:  client?.numdecabo,
        numeroContrat:   Number(numeroContrat),
        options:         selectedOptions,
      };
      url = "http://localhost:5000/api/reabonnement";
    }

    try {
      const res = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        if (res.data.invoiceUrl) window.open(res.data.invoiceUrl, "_blank");
        const label = isUpgradeMode ? "Upgrade" : isAddOptionMode ? "Ajout d'options" : "Réabonnement";
        alert(`${label} effectué avec succès ✅\nLa facture a été générée et ouverte automatiquement.`);
        if (res.data.whatsappLink) window.open(res.data.whatsappLink, "_blank");
        resetAll();
      } else {
        alert(res.data.message || res.data.error || "Erreur lors de l'opération");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Session expirée, veuillez vous reconnecter.");
        navigate("/login");
      } else {
        alert(err.response?.data?.error || err.response?.data?.message || "Erreur lors de l'opération");
      }
    }
  };

  // Valeurs calculées pour l'affichage
  const prixActuelle = getFormulePrice(currentClientFormule);
  const prixNouvelle = getFormulePrice(formule);
  const deltaUpgrade = Math.max(0, prixNouvelle - prixActuelle);
  const optionsTotal = getOptionsTotal(selectedOptions);

  return (
    <div className="min-h-screen flex justify-center items-start p-6 bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-lg">

        <h2 className="text-2xl font-bold mb-4 text-center">Réabonnement Canal+ Cameroun</h2>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Étape {step} sur 2</span>
            <span className="text-sm text-gray-600">{Math.round((step / 2) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* ── ÉTAPE 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Étape 1 : Rechercher l'abonné</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Chercher par :</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "numabo",    label: "Nº Abonné"   },
                  { id: "decodeur",  label: "Nº Décodeur" },
                  { id: "telephone", label: "Téléphone"   },
                  { id: "email",     label: "Email"       },
                ].map(({ id, label }) => (
                  <button key={id}
                    onClick={() => { setSearchType(id); setSearchValue(""); }}
                    className={`p-2 rounded border-2 text-sm font-medium transition
                      ${searchType === id
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"}`}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={{ numabo: "Nº abonné", decodeur: "Nº décodeur", telephone: "Téléphone", email: "Email" }[searchType]}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchClient()}
                className="flex-1 p-2 border rounded"
              />
              <button onClick={searchClient} disabled={loading || !searchValue.trim()}
                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                {loading ? "..." : "Chercher"}
              </button>
            </div>

            {loading && <p className="text-blue-600 text-center">Recherche en cours…</p>}

            {searchResults.length > 1 && (
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Plusieurs décodeurs trouvés</p>
                <p className="text-sm text-gray-600 mb-3">Choisissez le décodeur à réabonner :</p>
                <div className="space-y-2">
                  {searchResults.map((r, i) => (
                    <button key={`${r.numabo}-${r.numdecabo}-${i}`} type="button"
                      onClick={() => selectSearchResult(r)}
                      className={`w-full text-left p-3 rounded border transition
                        ${client?.numdecabo === r.numdecabo
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-400"}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-sm text-gray-600">Nº abonné : {r.numabo}</p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>Décodeur : {r.numdecabo || "-"}</p>
                          <p>Status : {r.status}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {client && (
              <div className="bg-green-50 p-4 rounded border-l-4 border-green-600">
                <p className="font-semibold text-green-700">Abonné sélectionné</p>
                <p className="text-sm mt-2"><strong>Nom :</strong> {client.name}</p>
                <p className="text-sm"><strong>Nº abonné :</strong> {client.numabo}</p>
                <p className="text-sm"><strong>Nº décodeur :</strong> {client.numdecabo}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button disabled className="flex-1 bg-gray-300 text-gray-600 py-2 rounded cursor-not-allowed">Précédent</button>
              <button onClick={() => setStep(2)} disabled={!client}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 ── */}
        {step === 2 && client && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Étape 2 : Vérifier les informations et valider</h3>

            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
              <p><strong>Nom :</strong> {client.name}</p>
              <p><strong>Statut :</strong> {String(client.status)}</p>
              <p><strong>Nº abonné :</strong> {client.numabo}</p>
              <p><strong>Nº décodeur :</strong> {client.numdecabo}</p>
              <p><strong>Adresse :</strong> {client.address}</p>
              <p><strong>Email :</strong> {client.email}</p>
              <p><strong>Téléphone :</strong> {client.telephone || "Non renseigné"}</p>
              <p><strong>Formule actuelle :</strong> {currentClientFormule || "Non renseigné"}</p>
              <p><strong>Début abonnement :</strong> {formatDate(client.debutAbonnement)}</p>
              <p><strong>Fin abonnement :</strong> {formatDate(client.finAbonnement)}</p>
              <p><strong>Nº de contrat :</strong> {client.numeroContrat || "1"}</p>
            </div>

            <form onSubmit={handleFinalSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-6">

              {/* Type d'opération */}
              <div>
                <label className="block text-sm font-medium mb-2">Type d'opération</label>
                <select value={operationType} onChange={(e) => handleOperationTypeChange(e.target.value)}
                  className="w-full p-2 border rounded">
                  <option value="reabonnement">Réabonnement</option>
                  <option value="upgrade">Upgrade formule</option>
                  <option value="addOption">Ajouter des options</option>
                </select>
              </div>

              {/* Formule */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isUpgradeMode ? "Nouvelle formule (upgrade vers)" : "Formule"}
                </label>

                {isAddOptionMode ? (
                  <input type="text"
                    value={currentClientFormule || "Non spécifiée"}
                    disabled className="w-full p-2 border rounded bg-gray-100" />
                ) : (
                  <select value={formule} onChange={(e) => handleFormuleChange(e.target.value)}
                    className="w-full p-2 border rounded" required>
                    <option value="">-- Sélectionner une formule --</option>
                    {offres.map((o) => (
                      <option key={o.name} value={o.name}>
                        {o.name} – {o.price.toLocaleString()} FCFA/mois
                      </option>
                    ))}
                  </select>
                )}

                {/* ✅ Détail visuel du calcul upgrade */}
                {isUpgradeMode && formule && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 space-y-1">
                    <p>📦 Formule actuelle : <strong>{currentClientFormule}</strong> — {prixActuelle.toLocaleString()} FCFA</p>
                    <p>🎯 Nouvelle formule : <strong>{formule}</strong> — {prixNouvelle.toLocaleString()} FCFA</p>
                    <p className="border-t border-blue-200 pt-1">
                      💳 Complément à payer : {prixNouvelle.toLocaleString()} − {prixActuelle.toLocaleString()} = <strong>{deltaUpgrade.toLocaleString()} FCFA</strong>
                    </p>
                    {selectedOptions.length > 0 && (
                      <p>🔧 Options : +{optionsTotal.toLocaleString()} FCFA</p>
                    )}
                  </div>
                )}
              </div>

              {/* Durée (réabonnement uniquement) */}
              {!isUpgradeMode && !isAddOptionMode && (
                <div>
                  <label className="block text-sm font-medium mb-2">Durée (mois)</label>
                  <input type="number" min="1" max="12" value={duree}
                    onChange={(e) => handleDureeChange(e.target.value)}
                    className="w-full p-2 border rounded" placeholder="Durée en mois" />
                </div>
              )}

              {/* Options */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">Options Canal+ additionnelles</label>
                <button type="button" onClick={() => setOptionsOpen((o) => !o)}
                  className="w-full flex justify-between items-center p-3 border rounded bg-white text-left text-gray-700 hover:border-blue-400">
                  <span>
                    {selectedOptions.length > 0
                      ? `${selectedOptions.length} option${selectedOptions.length > 1 ? "s" : ""} sélectionnée${selectedOptions.length > 1 ? "s" : ""}`
                      : "Choisir des options"}
                  </span>
                  <span className="text-sm text-gray-500">{optionsOpen ? "▲" : "▼"}</span>
                </button>
                {optionsOpen && (
                  <div className="absolute left-0 right-0 mt-2 border rounded bg-white shadow-lg z-20 max-h-64 overflow-y-auto p-3">
                    {optionsList.map((option) => (
                      <label key={option.code} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedOptions.includes(option.code)}
                          onChange={() => handleOptionToggle(option.code)} className="h-4 w-4 text-blue-600" />
                        <span className="flex-1 text-sm text-gray-800">{option.name}</span>
                        <span className="text-sm text-gray-500">+{option.price.toLocaleString()} FCFA/mois</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Montant total */}
              <div className="bg-gray-100 p-4 rounded border border-gray-300">
                <p className="text-sm text-gray-600">Montant à facturer</p>
                <p className="text-2xl font-semibold">{montant.toLocaleString()} FCFA</p>

                {isUpgradeMode && formule && (
                  <p className="text-xs text-gray-500 mt-1">
                    = complément upgrade ({deltaUpgrade.toLocaleString()} FCFA)
                    {selectedOptions.length > 0 && ` + options (${optionsTotal.toLocaleString()} FCFA)`}
                  </p>
                )}
                {isAddOptionMode && selectedOptions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">= total options sélectionnées</p>
                )}
                {!isUpgradeMode && !isAddOptionMode && formule && (
                  <p className="text-xs text-gray-500 mt-1">
                    = {getFormulePrice(formule).toLocaleString()} FCFA
                    {selectedOptions.length > 0 && ` + options (${optionsTotal.toLocaleString()} FCFA)`}
                    {` × ${duree} mois`}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">
                  Précédent
                </button>
                <button type="submit"
                  disabled={(!formule && !isAddOptionMode) || (!isUpgradeMode && !isAddOptionMode && duree < 1)}
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500">
                  {isUpgradeMode
                    ? "Valider l'upgrade"
                    : isAddOptionMode
                    ? "Valider l'ajout d'option"
                    : "Valider réabonnement"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}