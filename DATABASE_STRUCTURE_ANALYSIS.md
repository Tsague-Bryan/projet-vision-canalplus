# Database Structure Analysis - Vision Canal+

**Date**: May 3, 2026  
**Database**: vision_canalplus (MySQL)

---

## EXECUTIVE SUMMARY

### Key Findings:
1. ✅ **Demandes_technicien table** - COMPLETE (9 columns, all exist)
2. ✅ **Commission_rules table** - COMPLETE (21 columns, fully configured)
3. ❌ **Users table** - MISSING `profile_photo` column (18 columns, need +1)
4. ❌ **Reabonnements table** - MISSING `date_debut` and `date_fin` columns (11 columns, need +2)

---

## 1. USERS TABLE STRUCTURE

**Current Columns: 18** | **Need to Add: 1** | **Status: ⚠️ INCOMPLETE**

### Existing Columns:
```
1. id                    INT(11)         PRIMARY KEY AUTO_INCREMENT
2. name                  VARCHAR(100)    NOT NULL
3. prenom                VARCHAR(100)    NOT NULL
4. structure             VARCHAR(150)    NOT NULL
5. pays                  VARCHAR(100)    NOT NULL
6. ville                 VARCHAR(100)    NOT NULL
7. quartier              VARCHAR(100)    NOT NULL
8. telephone             VARCHAR(50)     NOT NULL
9. email                 VARCHAR(100)    NULLABLE
10. password             VARCHAR(255)    NOT NULL
11. role                 ENUM('admin','partner')     NULLABLE
12. status               ENUM('pending','approved','rejected')     NULLABLE
13. created_at           TIMESTAMP       NOT NULL
14. commission_total     DECIMAL(10,2)   NULLABLE
15. commission_balance   DECIMAL(10,2)   NULLABLE
16. codePromo            VARCHAR(50)     NULLABLE
17. wallet_balance       DECIMAL(10,2)   NULLABLE
18. balance_actif        TINYINT(1)      NULLABLE
```

### ❌ MISSING COLUMN:
- **`profile_photo`** - VARCHAR(255) NULLABLE - URL/path to partner profile photo

### SQL to Add:
```sql
ALTER TABLE users ADD COLUMN profile_photo VARCHAR(255) NULLABLE AFTER structure;
```

---

## 2. DEMANDES_TECHNICIEN TABLE STRUCTURE

**Current Columns: 9** | **Need to Add: 0** | **Status: ✅ COMPLETE**

### Existing Columns:
```
1. id           INT(11)         PRIMARY KEY AUTO_INCREMENT
2. user_id      INT(11)         NOT NULL FOREIGN KEY
3. nom_client   VARCHAR(255)    NOT NULL
4. telephone    VARCHAR(50)     NOT NULL
5. ville        VARCHAR(100)    NOT NULL
6. quartier     VARCHAR(100)    NOT NULL
7. probleme     TEXT            NOT NULL
8. statut       ENUM('en_attente','en_cours','terminee','annulee')  NULLABLE
9. created_at   TIMESTAMP       NOT NULL
```

### Notes:
- All required columns exist
- Properly indexed (user_id is foreign key)
- Status enumeration includes all needed states
- Ready for frontend dashboard implementation

---

## 3. REABONNEMENTS TABLE STRUCTURE

**Current Columns: 11** | **Need to Add: 2** | **Status: ⚠️ INCOMPLETE**

### Existing Columns:
```
1. id                   INT(11)         PRIMARY KEY AUTO_INCREMENT
2. users_id             INT(11)         NULLABLE FOREIGN KEY
3. numero_abonne        VARCHAR(20)     NULLABLE
4. formule              VARCHAR(50)     NULLABLE
5. duree                INT(11)         NULLABLE (stores duration in months)
6. montant              INT(11)         NULLABLE
7. telephoneAbonne      VARCHAR(20)     NULLABLE
8. created_at           TIMESTAMP       NOT NULL
9. commission           DECIMAL(10,2)   NULLABLE
10. commission_total    DECIMAL(15,2)   NULLABLE
11. type_operation      VARCHAR(20)     NULLABLE (values: 'reabonnement', 'upgrade')
```

### ❌ MISSING COLUMNS:
1. **`date_debut`** - DATE or TIMESTAMP - Subscription start date
   - Should be preserved for invoice display and historical records
   
2. **`date_fin`** - DATE or TIMESTAMP - Subscription end date
   - Based on: `date_debut` + (duree * 30 days) or end of month logic
   - Referenced in invoice generation code (lines 290-295 in reabonnement.js)

### Current Usage in Code:
- Invoice generation references `dateDebut` and `dateFin` variables
- However, these are calculated ad-hoc, NOT stored in database
- Problem: Cannot generate historical invoices without these stored dates

### SQL to Add:
```sql
ALTER TABLE reabonnements 
  ADD COLUMN date_debut DATE NULLABLE AFTER telephoneAbonne,
  ADD COLUMN date_fin DATE NULLABLE AFTER date_debut;
```

### Calculated Values Logic:
```javascript
// Start date: today
const date_debut = new Date();

// End date: 3rd of next month (or as per business rule)
const date_fin = new Date();
date_fin.setMonth(date_fin.getMonth() + Math.ceil(duree));
date_fin.setDate(3);
```

---

## 4. COMMISSION_RULES TABLE STRUCTURE

**Current Columns: 21** | **Need to Add: 0** | **Status: ✅ COMPLETE**

### Existing Columns:
```
1. id                     INT(11)                 PRIMARY KEY AUTO_INCREMENT
2. formule_code           VARCHAR(20)             UNIQUE NOT NULL
3. formule_name           VARCHAR(50)             NOT NULL
4. commission_base        DECIMAL(10,2)           NOT NULL
5. commission_actuelle    DECIMAL(10,2)           NOT NULL
6. updated_by             ENUM('auto','admin')    NULLABLE
7. updated_at             TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP
8. rule_type              VARCHAR(20)             NOT NULL (values: 'formule', 'option')
9. price                  DECIMAL(12,2)           NOT NULL
10. base_rate             DECIMAL(5,2)            NOT NULL (default: 4.00%)
11. current_rate          DECIMAL(5,2)            NOT NULL (default: 4.00%)
12. cashbox_amount        DECIMAL(14,2)           NOT NULL (accumulator)
13. activation_count      INT(11)                 NOT NULL (counter)
14. in_chart              TINYINT(1)              NOT NULL (display flag)
15. display_order         INT(11)                 NOT NULL
16. fixed_commission      DECIMAL(12,2)           NULLABLE
17. business_day_key      VARCHAR(10)             NULLABLE
18. base_progress_count   INT(11)                 NOT NULL
19. required_base_count   INT(11)                 NOT NULL
20. bonus_step            INT(11)                 NOT NULL
21. trend_direction       VARCHAR(12)             NOT NULL (values: 'up', 'down', 'base')
```

### Default Rules Seeded:
```
• ACDD (Access)                  - 5,000 FCFA
• ENGLISH PLUS DD               - 5,000 FCFA  ⭐ (has commission bug - 2x applied)
• CHARME                         - 7,000 FCFA  ⭐ (has commission bug - 2x applied)
• EVDD (Évasion)                 - 10,500 FCFA
• ACPDD (Access+)                - 15,000 FCFA
• TCADD (Tout Canal+)            - 28,000 FCFA
• EVPDD (Évasion+)               - 20,000 FCFA
• NETFLIX (Basic)                - 3,000 FCFA (Fixed: 120 FCFA commission)
• NETFLIX PREMIUM                - 7,000 FCFA (Fixed: 280 FCFA commission)
```

### Notes:
- System tracks daily commission state changes
- Bonus system with multi-step progression
- Related history tables: `commission_daily_history`, `commission_operation_history`

---

## ACTION ITEMS

### Immediate Changes Required:

#### Task 1: Add profile_photo to users table
```sql
ALTER TABLE users 
  ADD COLUMN profile_photo VARCHAR(255) NULLABLE AFTER structure;
```
**Impact**: Enables Task 2 (partner photo upload)

#### Task 2: Add date_debut & date_fin to reabonnements
```sql
ALTER TABLE reabonnements 
  ADD COLUMN date_debut DATE NULLABLE AFTER telephoneAbonne,
  ADD COLUMN date_fin DATE NULLABLE AFTER date_debut;
```
**Impact**: Enables Task 5 (persistent invoice date tracking)

### Secondary Issues to Address:

#### Bug: Commission 2x on English+/Charme options
**Location**: `backend/utils/commissionEngine.js` - `calculateAndApplyCommissions()`
**Issue**: Options incorrectly receive both base rate + option rate commissions
**Fix Needed**: Review option commission calculation logic

#### Invoice Date Display
**Current**: Dates calculated ad-hoc during invoice generation
**Future**: Use stored `date_debut`/`date_fin` from reabonnements table

---

## Summary Table

| Table Name | Current Cols | Needed Cols | Complete? | Priority |
|------------|-------------|------------|-----------|----------|
| users | 18 | +1 (profile_photo) | ❌ | HIGH |
| demandes_technicien | 9 | 0 | ✅ | — |
| reabonnements | 11 | +2 (date_debut, date_fin) | ❌ | HIGH |
| commission_rules | 21 | 0 | ✅ | — |

---

## Database Queries for Verification

```sql
-- Check if profile_photo column exists
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' 
AND COLUMN_NAME='profile_photo';

-- Check if date columns exist in reabonnements
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reabonnements' 
AND COLUMN_NAME IN ('date_debut', 'date_fin');

-- Count total records in each table
SELECT 'users' as `table`, COUNT(*) as count FROM users
UNION ALL
SELECT 'demandes_technicien', COUNT(*) FROM demandes_technicien
UNION ALL
SELECT 'reabonnements', COUNT(*) FROM reabonnements
UNION ALL
SELECT 'commission_rules', COUNT(*) FROM commission_rules;
```

---

Generated: 2026-05-03 | Vision Canal+ Database Analysis
