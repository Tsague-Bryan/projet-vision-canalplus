const RATE_LEVELS = [0, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const BASE_RATE = 4;
const MAX_RATE = 10;
const RATE_INCREMENT = 0.5;

const DEFAULT_RULES = [
  { code: "ACDD",            name: "Access",        type: "formule", price: 5000,  inChart: 1, order: 1 },
  { code: "ENGLISH PLUS DD", name: "English +",     type: "option",  price: 5000,  inChart: 1, order: 2 },
  { code: "CHARME",          name: "Charme",        type: "option",  price: 7000,  inChart: 1, order: 3 },
  { code: "EVDD",            name: "Évasion",       type: "formule", price: 10500, inChart: 1, order: 4 },
  { code: "ACPDD",           name: "Acces+",        type: "formule", price: 15000, inChart: 1, order: 5 },
  { code: "EVPDD",           name: "Evasion+",      type: "formule", price: 20000, inChart: 1, order: 6 },
  { code: "TCADD",           name: "Tout Canal+",   type: "formule", price: 28000, inChart: 1, order: 7 },
  { code: "NETFLIX",         name: "Netflix Basic", type: "option",  price: 3000,  fixed: 120, inChart: 0, order: 8 },
  { code: "NETFLIX PREMIUM", name: "Netflix Premium",type:"option",  price: 7000,  fixed: 280, inChart: 0, order: 9 },
];

// ✅ FIX : mapping exhaustif incluant toutes les variantes possibles d'English+ et Charme
const OPTION_CODE_MAP = {
  "Access":            "ACDD",
  "Evasion":           "EVDD",
  "Évasion":           "EVDD",
  "Access+":           "ACPDD",
  "Acces+":            "ACPDD",
  "Evasion+":          "EVPDD",
  "Évasion+":          "EVPDD",
  "Tout Canal+":       "TCADD",
  "Charme":            "CHARME",
  "CHARME":            "CHARME",
  "charme":            "CHARME",
  "English Basic":     "ENGLISH PLUS DD",
  "English+":          "ENGLISH PLUS DD",
  "English +":         "ENGLISH PLUS DD",
  "ENGLISH+":          "ENGLISH PLUS DD",
  "ENGLISH PLUS DD":   "ENGLISH PLUS DD",
  "english plus dd":   "ENGLISH PLUS DD",
  "ENGLISHPLUSDD":     "ENGLISH PLUS DD",
};

const normalizeCode = (raw) => {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  return OPTION_CODE_MAP[trimmed] || trimmed;
};

const getBusinessDayKey = (date = new Date()) => {
  const shifted = new Date(date.getTime() - 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

const commissionFromRate = (price, rate) =>
  Math.round((Number(price) || 0) * (Number(rate) || 0) / 100);

const bonusRateForStep    = (step) => Math.min(MAX_RATE, BASE_RATE + RATE_INCREMENT + (Number(step) || 0) * RATE_INCREMENT);
const requiredCountForStep = (step) => 1 + (Number(step) || 0) * 2;
const baseCommissionForPrice = (price, baseRate = BASE_RATE) => commissionFromRate(price, baseRate);
const commissionCap = (price) => commissionFromRate(price, MAX_RATE);
const maxCashboxBonus = (price, baseRate = BASE_RATE) =>
  Math.max(0, commissionCap(price) - baseCommissionForPrice(price, baseRate));
const cashboxRate = (price, cashbox, baseRate = BASE_RATE) => {
  const base = baseCommissionForPrice(price, baseRate);
  const bonus = Math.min(maxCashboxBonus(price, baseRate), Math.max(0, Number(cashbox) || 0));
  return Math.min(MAX_RATE, ((base + bonus) / Math.max(Number(price) || 1, 1)) * 100);
};
const trendForRates = (previous, next, baseRate = BASE_RATE) => {
  if (Number(next) < Number(previous)) return "down";
  if (Number(next) > Number(previous)) return "up";
  return Number(next) > Number(baseRate) ? "up" : "base";
};
const visibleTrend = (row) => {
  const trend = row.trend_direction || "base";
  const rate = Number(row.current_rate) || BASE_RATE;
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  if (trend === "up") return "up";
  if (trend === "down" && rate === BASE_RATE && updatedAt && Date.now() - updatedAt >= 30 * 60 * 1000) return "base";
  if (trend === "down") return "down";
  return "base";
};

const ensureColumn = async (connection, table, column, ddl) => {
  const [rows] = await connection.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
    [table, column]
  );
  if (rows.length === 0) await connection.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
};

const ensureCommissionTables = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS commission_rules (
      formule_code VARCHAR(80) PRIMARY KEY,
      formule_name VARCHAR(120) NOT NULL,
      rule_type VARCHAR(20) NOT NULL DEFAULT 'formule',
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      commission_base DECIMAL(12,2) NOT NULL DEFAULT 0,
      commission_actuelle DECIMAL(12,2) NOT NULL DEFAULT 0,
      base_rate DECIMAL(5,2) NOT NULL DEFAULT 4.00,
      current_rate DECIMAL(5,2) NOT NULL DEFAULT 4.00,
      cashbox_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      activation_count INT NOT NULL DEFAULT 0,
      base_progress_count INT NOT NULL DEFAULT 0,
      required_base_count INT NOT NULL DEFAULT 1,
      bonus_step INT NOT NULL DEFAULT 0,
      trend_direction VARCHAR(12) NOT NULL DEFAULT 'base',
      in_chart TINYINT(1) NOT NULL DEFAULT 1,
      display_order INT NOT NULL DEFAULT 0,
      fixed_commission DECIMAL(12,2) NULL,
      business_day_key VARCHAR(10) NULL,
      updated_by VARCHAR(80) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn(connection, "commission_rules", "rule_type",           "rule_type VARCHAR(20) NOT NULL DEFAULT 'formule'");
  await ensureColumn(connection, "commission_rules", "price",               "price DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_rules", "base_rate",           "base_rate DECIMAL(5,2) NOT NULL DEFAULT 4.00");
  await ensureColumn(connection, "commission_rules", "current_rate",        "current_rate DECIMAL(5,2) NOT NULL DEFAULT 4.00");
  await ensureColumn(connection, "commission_rules", "cashbox_amount",      "cashbox_amount DECIMAL(14,2) NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_rules", "activation_count",    "activation_count INT NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_rules", "base_progress_count", "base_progress_count INT NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_rules", "required_base_count", "required_base_count INT NOT NULL DEFAULT 1");
  await ensureColumn(connection, "commission_rules", "bonus_step",          "bonus_step INT NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_rules", "trend_direction",     "trend_direction VARCHAR(12) NOT NULL DEFAULT 'base'");
  await ensureColumn(connection, "commission_rules", "in_chart",            "in_chart TINYINT(1) NOT NULL DEFAULT 1");
  await ensureColumn(connection, "commission_rules", "display_order",       "display_order INT NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_rules", "fixed_commission",    "fixed_commission DECIMAL(12,2) NULL");
  await ensureColumn(connection, "commission_rules", "business_day_key",    "business_day_key VARCHAR(10) NULL");
  await ensureColumn(connection, "commission_rules", "updated_by",          "updated_by VARCHAR(80) NULL");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS commission_daily_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_day_key VARCHAR(10) NOT NULL,
      formule_code VARCHAR(80) NOT NULL,
      formule_name VARCHAR(120) NOT NULL,
      current_rate DECIMAL(5,2) NOT NULL DEFAULT 4.00,
      cashbox_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      activation_count INT NOT NULL DEFAULT 0,
      base_progress_count INT NOT NULL DEFAULT 0,
      required_base_count INT NOT NULL DEFAULT 1,
      bonus_step INT NOT NULL DEFAULT 0,
      trend_direction VARCHAR(12) NOT NULL DEFAULT 'base',
      commission_actuelle DECIMAL(12,2) NOT NULL DEFAULT 0,
      archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn(connection, "commission_daily_history", "base_progress_count", "base_progress_count INT NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_daily_history", "required_base_count",  "required_base_count INT NOT NULL DEFAULT 1");
  await ensureColumn(connection, "commission_daily_history", "bonus_step",           "bonus_step INT NOT NULL DEFAULT 0");
  await ensureColumn(connection, "commission_daily_history", "trend_direction",      "trend_direction VARCHAR(12) NOT NULL DEFAULT 'base'");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS commission_operation_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_day_key VARCHAR(10) NOT NULL,
      user_id INT NULL,
      numero_abonne VARCHAR(80) NULL,
      formule_code VARCHAR(80) NOT NULL,
      formule_name VARCHAR(120) NOT NULL,
      operation_type VARCHAR(40) NOT NULL DEFAULT 'reabonnement',
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      rate_applied DECIMAL(5,2) NOT NULL DEFAULT 4.00,
      commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      is_bonus TINYINT(1) NOT NULL DEFAULT 0,
      trend_after VARCHAR(12) NOT NULL DEFAULT 'base',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ✅ Table pour commissions admin (6% sur chaque réabonnement)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS admin_commissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reabonnement_id INT NULL,
      user_id INT NULL,
      numero_abonne VARCHAR(80) NULL,
      formule_code VARCHAR(80) NOT NULL,
      formule_name VARCHAR(120) NOT NULL,
      montant_reabonnement DECIMAL(14,2) NOT NULL DEFAULT 0,
      taux_admin DECIMAL(5,2) NOT NULL DEFAULT 6.00,
      commission_admin DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const today = getBusinessDayKey();
  for (const rule of DEFAULT_RULES) {
    const baseRate       = BASE_RATE;
    const baseCommission = rule.fixed ?? commissionFromRate(rule.price, baseRate);
    await connection.query(
      `INSERT INTO commission_rules
       (formule_code, formule_name, rule_type, price, commission_base, commission_actuelle, base_rate, current_rate,
        cashbox_amount, activation_count, base_progress_count, required_base_count, bonus_step, trend_direction,
        in_chart, display_order, fixed_commission, business_day_key, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 0, 'base', ?, ?, ?, ?, 'system')
       ON DUPLICATE KEY UPDATE
        formule_name=VALUES(formule_name),
        rule_type=VALUES(rule_type),
        price=IF(price=0, VALUES(price), price),
        commission_base=IF(commission_base=0, VALUES(commission_base), commission_base),
        in_chart=VALUES(in_chart),
        display_order=VALUES(display_order),
        fixed_commission=VALUES(fixed_commission)`,
      [rule.code, rule.name, rule.type, rule.price, baseCommission, baseCommission,
       baseRate, baseRate, rule.inChart, rule.order, rule.fixed ?? null, today]
    );
  }

  await resetExpiredBusinessDays(connection);
};

const resetExpiredBusinessDays = async (connection) => {
  const today = getBusinessDayKey();
  const [expired] = await connection.query(
    "SELECT * FROM commission_rules WHERE COALESCE(business_day_key, '') <> ?",
    [today]
  );
  for (const row of expired) {
    await connection.query(
      `INSERT INTO commission_daily_history
       (business_day_key, formule_code, formule_name, current_rate, cashbox_amount, activation_count,
        base_progress_count, required_base_count, bonus_step, trend_direction, commission_actuelle)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.business_day_key || today, row.formule_code, row.formule_name,
       row.current_rate, row.cashbox_amount, row.activation_count,
       row.base_progress_count, row.required_base_count, row.bonus_step,
       row.trend_direction, row.commission_actuelle]
    );
  }
  if (expired.length > 0) {
    await connection.query(
      `UPDATE commission_rules
       SET current_rate=base_rate,
           cashbox_amount=cashbox_amount,
           activation_count=0,
           base_progress_count=0,
           required_base_count=1,
           bonus_step=0,
           trend_direction='base',
           commission_actuelle=CASE
             WHEN fixed_commission IS NOT NULL THEN fixed_commission
             ELSE ROUND(price * base_rate / 100)
           END,
           business_day_key=?`,
      [today]
    );
  }
};

const getCommissionRules = async (connection, { chartOnly = false } = {}) => {
  await ensureCommissionTables(connection);
  const where = chartOnly ? "WHERE in_chart = 1" : "";
  const [rows] = await connection.query(
    `SELECT formule_code, formule_name, rule_type, price, commission_base, commission_actuelle,
            base_rate, current_rate, cashbox_amount, activation_count, in_chart, display_order,
            fixed_commission, business_day_key, base_progress_count, required_base_count,
            bonus_step, trend_direction, updated_at
     FROM commission_rules ${where}
     ORDER BY display_order ASC, formule_name ASC`
  );
  return rows.map((r) => {
    const price = Number(r.price);
    const baseRate = Number(r.base_rate);
    const cashbox = Number(r.cashbox_amount);
    const displayRate = cashbox > 0 ? cashboxRate(price, cashbox, baseRate) : Number(r.current_rate);
    const displayCommission = cashbox > 0
      ? Math.min(commissionCap(price), baseCommissionForPrice(price, baseRate) + Math.min(maxCashboxBonus(price, baseRate), cashbox))
      : Number(r.commission_actuelle);
    const displayRow = { ...r, current_rate: displayRate };
    return {
      ...r,
      price,
      commission_base:     Number(r.commission_base),
      commission_actuelle: displayCommission,
      base_rate:           baseRate,
      current_rate:        displayRate,
      cashbox_amount:      cashbox,
      activation_count:    Number(r.activation_count),
      base_progress_count: Number(r.base_progress_count),
      required_base_count: Number(r.required_base_count),
      bonus_step:          Number(r.bonus_step),
      trend_direction:     r.trend_direction || "base",
      fixed_commission:    r.fixed_commission === null ? null : Number(r.fixed_commission),
      max_commission:      commissionCap(price),
      visible_trend:       visibleTrend(displayRow),
      updated_at:          r.updated_at,
    };
  });
};

const updateCommissionRule = async (connection, code, patch) => {
  await ensureCommissionTables(connection);
  const normalized = normalizeCode(code);
  const [rows] = await connection.query("SELECT * FROM commission_rules WHERE formule_code=?", [normalized]);
  if (rows.length === 0) throw new Error("Règle introuvable");
  const current      = rows[0];
  const price        = patch.price !== undefined ? Number(patch.price) : Number(current.price);
  const fixed        = current.fixed_commission;
  const previousRate = Number(current.current_rate);
  const cashboxPatch = patch.cashbox_amount ?? patch.commission_actuelle;
  const addToCashbox = cashboxPatch !== undefined && cashboxPatch !== "" ? Math.max(0, Number(cashboxPatch)) : null;
  const cashboxAfter = addToCashbox === null ? Number(current.cashbox_amount || 0) : Number(current.cashbox_amount || 0) + addToCashbox;
  const rate         = addToCashbox !== null
    ? cashboxRate(price, cashboxAfter, Number(current.base_rate) || BASE_RATE)
    : patch.current_rate !== undefined && patch.current_rate !== ""
    ? Math.max(0, Math.min(MAX_RATE, Number(patch.current_rate)))
      : Number(current.current_rate);
  const commission   = Math.min(commissionFromRate(price, rate), commissionCap(price));
  const manualBonusStep = rate > (Number(current.base_rate) || BASE_RATE)
    ? Math.max(0, Math.min(12, Math.round((rate - (Number(current.base_rate) || BASE_RATE) - RATE_INCREMENT) / RATE_INCREMENT)))
    : Number(current.bonus_step) || 0;

  await connection.query(
    `UPDATE commission_rules
     SET price=?,
         current_rate=?,
         commission_actuelle=?,
         fixed_commission=?,
         cashbox_amount=CASE WHEN ? IS NULL THEN cashbox_amount ELSE cashbox_amount + ? END,
         bonus_step=?,
         trend_direction=?,
         updated_by='admin'
     WHERE formule_code=?`,
    [price, rate, commission, fixed, addToCashbox, addToCashbox, manualBonusStep,
     addToCashbox !== null ? "up" : trendForRates(previousRate, rate, Number(current.base_rate) || BASE_RATE), normalized]
  );
  const [updated] = await connection.query("SELECT * FROM commission_rules WHERE formule_code=?", [normalized]);
  return updated[0];
};

// ✅ FIX PRINCIPAL : calculateAndApplyCommissions corrigé pour English+ et Charme
// Le bug était que pour les OPTIONS (English+, Charme), le saleAmount utilisait le montant
// du réabonnement principal au lieu du prix de l'option elle-même.
const calculateAndApplyCommissions = async (connection, {
  formule,
  options = [],
  montant = 0,
  userId = null,
  numeroAbonne = "",
  operationType = "reabonnement",
} = {}) => {
  await ensureCommissionTables(connection);
  const businessDay = getBusinessDayKey();
  const normalizedFormule = normalizeCode(formule);

  // On sépare la formule principale des options
  const allItems = [
    { code: normalizedFormule, isMainFormule: true },
    ...options.map(o => ({ code: normalizeCode(o), isMainFormule: false })),
  ].filter(item => Boolean(item.code));

  let total = 0;
  const details = [];

  for (const { code, isMainFormule } of allItems) {
    const [rows] = await connection.query(
      "SELECT * FROM commission_rules WHERE formule_code=? FOR UPDATE", [code]
    );
    if (rows.length === 0) {
      console.warn(`⚠ Commission rule introuvable pour le code: "${code}"`);
      continue;
    }
    const rule       = rows[0];
    const baseRate   = Number(rule.base_rate) || BASE_RATE;
    const currentRate = Number(rule.current_rate) || baseRate;

    // ✅ FIX : pour la formule principale on utilise montant, pour les options on utilise rule.price
    const saleAmount = isMainFormule
      ? (Number(montant) || Number(rule.price))
      : Number(rule.price); // <- c'était le bug : les options prenaient le montant du réabo

    const cap = commissionCap(Number(rule.price));
    const cashbox = Number(rule.cashbox_amount) || 0;
    const baseCommission = baseCommissionForPrice(Number(rule.price), baseRate);
    const maxBonus = maxCashboxBonus(Number(rule.price), baseRate);
    const cashboxBonus = Math.min(maxBonus, cashbox);
    const commission = cashbox > 0
      ? Math.min(cap, baseCommission + cashboxBonus)
      : rule.fixed_commission !== null
        ? Math.min(Number(rule.fixed_commission), cap)
        : Math.min(commissionFromRate(saleAmount, currentRate), cap);

    const isBonus = currentRate > baseRate;

    total += commission;
    details.push({ code, name: rule.formule_name, commission, rate: currentRate, amount: saleAmount, is_bonus: isBonus });

    // Mise à jour progressive du taux (uniquement pour les règles sans commission fixe)
    if (rule.fixed_commission === null) {
      if (cashbox > 0) {
        const remainingCashbox = Math.max(0, cashbox - cashboxBonus);
        const depleted = remainingCashbox <= 0;
        const nextRate = depleted ? baseRate : cashboxRate(Number(rule.price), remainingCashbox, baseRate);
        const nextBonus = depleted ? 0 : Math.min(maxBonus, remainingCashbox);
        const nextCommission = Math.min(cap, baseCommission + nextBonus);
        const nextTrend = depleted ? "down" : remainingCashbox >= maxBonus ? "up" : "down";

        await connection.query(
          `UPDATE commission_rules
           SET cashbox_amount=?,
               activation_count=activation_count+1,
               base_progress_count=CASE WHEN ? THEN 0 ELSE base_progress_count END,
               required_base_count=CASE WHEN ? THEN 1 ELSE required_base_count END,
               bonus_step=CASE WHEN ? THEN 0 ELSE bonus_step END,
               current_rate=?,
               commission_actuelle=?,
               trend_direction=?
           WHERE formule_code=?`,
          [remainingCashbox, depleted, depleted, depleted, nextRate, nextCommission, nextTrend, code]
        );

        await connection.query(
          `INSERT INTO commission_operation_history
           (business_day_key, user_id, numero_abonne, formule_code, formule_name, operation_type,
            amount, rate_applied, commission_amount, is_bonus, trend_after)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [businessDay, userId, numeroAbonne, code, rule.formule_name, operationType,
           saleAmount, (commission / Math.max(Number(rule.price) || 1, 1)) * 100, commission, 1, nextTrend]
        );
        continue;
      }

      let newRate       = currentRate;
      let newProgress   = Number(rule.base_progress_count) || 0;
      let newRequired   = Number(rule.required_base_count) || 1;
      let newStep       = Number(rule.bonus_step) || 0;

      if (isBonus) {
        const reachedMax = currentRate >= MAX_RATE;
        newStep    = reachedMax ? 0 : newStep + 1;
        newRequired = requiredCountForStep(newStep);
        newProgress = 0;
        newRate     = baseRate;
      } else {
        newProgress += 1;
        if (newProgress >= newRequired) {
          newRate     = bonusRateForStep(newStep);
          newProgress = 0;
        }
      }

      const newCommission = Math.min(commissionFromRate(Number(rule.price), newRate), cap);
      const trend = trendForRates(currentRate, newRate, baseRate);

      await connection.query(
        `UPDATE commission_rules
         SET activation_count=activation_count+1,
             base_progress_count=?,
             required_base_count=?,
             bonus_step=?,
             current_rate=?,
             commission_actuelle=?,
             trend_direction=?
         WHERE formule_code=?`,
        [newProgress, newRequired, newStep, newRate, newCommission, trend, code]
      );

      await connection.query(
        `INSERT INTO commission_operation_history
         (business_day_key, user_id, numero_abonne, formule_code, formule_name, operation_type,
          amount, rate_applied, commission_amount, is_bonus, trend_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [businessDay, userId, numeroAbonne, code, rule.formule_name, operationType,
         saleAmount, currentRate, commission, isBonus ? 1 : 0, trend]
      );
    }
  }

  return { total, details };
};

// ✅ NOUVEAU : calculer et enregistrer la commission admin à 6%
const calculateAdminCommission = async (connection, {
  reabonnementId = null,
  userId = null,
  numeroAbonne = "",
  formuleCode = "",
  formuleName = "",
  montant = 0,
  tauxAdmin = 6,
} = {}) => {
  const commissionAdmin = Math.round((Number(montant) || 0) * (Number(tauxAdmin) || 6) / 100);
  if (commissionAdmin <= 0) return 0;

  try {
    await connection.query(
      `INSERT INTO admin_commissions
       (reabonnement_id, user_id, numero_abonne, formule_code, formule_name,
        montant_reabonnement, taux_admin, commission_admin, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [reabonnementId, userId, numeroAbonne, formuleCode, formuleName,
       montant, tauxAdmin, commissionAdmin]
    );
  } catch (e) {
    console.error("Erreur enregistrement commission admin:", e.message);
  }

  return commissionAdmin;
};

// ✅ NOUVEAU : récupérer le total des commissions admin (6%)
const getAdminCommissionTotal = async (connection) => {
  try {
    const [[{ total }]] = await connection.query(
      "SELECT COALESCE(SUM(commission_admin), 0) AS total FROM admin_commissions"
    );
    return Number(total);
  } catch (e) {
    return 0;
  }
};

module.exports = {
  RATE_LEVELS,
  BASE_RATE,
  MAX_RATE,
  RATE_INCREMENT,
  DEFAULT_RULES,
  normalizeCode,
  getBusinessDayKey,
  ensureCommissionTables,
  getCommissionRules,
  updateCommissionRule,
  calculateAndApplyCommissions,
  calculateAdminCommission,
  getAdminCommissionTotal,
};
