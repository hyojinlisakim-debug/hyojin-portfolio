// Example queries for the two sample files (tested against them in SQLite).
import type { Lang } from './types'

export type SqlExample = { id: string; label: Record<Lang, string>; sql: string }

export const SQL_EXAMPLES: Record<'utility' | 'sap', SqlExample[]> = {
  utility: [
    {
      id: "revenue",
      label: { en: "Revenue by rate class", ko: "요금 유형별 매출", fr: "Revenus par catégorie" },
      sql: "SELECT\n  CASE WHEN UPPER(TRIM(Rate_Class)) IN ('RES', 'RESIDENTIAL') THEN 'RES'\n       ELSE UPPER(TRIM(Rate_Class)) END AS rate_class,\n  COUNT(DISTINCT Customer_ID) AS customers,\n  SUM(kWh) AS kwh,\n  ROUND(SUM(Billed_Amount), 2) AS billed\nFROM Billing\nGROUP BY 1\nORDER BY billed DESC;",
    },
    {
      id: "tariff",
      label: { en: "Bills that don't match the tariff (JOIN)", ko: "요금표와 안 맞는 청구 (JOIN)", fr: "Factures non conformes au tarif (JOIN)" },
      sql: "SELECT\n  b.Customer_ID,\n  b.Bill_Month,\n  t.Rate_Class,\n  b.Billed_Amount,\n  ROUND((t.Fixed_Charge_per_Month\n    + b.kWh * t.Energy_Rate_per_kWh\n    + b.kW * t.Demand_Rate_per_kW) * (1 + t.Rider_Pct), 2) AS expected,\n  ROUND(b.Billed_Amount / ((t.Fixed_Charge_per_Month\n    + b.kWh * t.Energy_Rate_per_kWh\n    + b.kW * t.Demand_Rate_per_kW) * (1 + t.Rider_Pct)) - 1, 4) AS variance_pct\nFROM Billing AS b\nJOIN Tariff AS t\n  ON t.Rate_Class = CASE\n    WHEN UPPER(TRIM(b.Rate_Class)) IN ('RES', 'RESIDENTIAL') THEN 'RES'\n    ELSE UPPER(TRIM(b.Rate_Class)) END\nWHERE b.kWh IS NOT NULL\n  AND ABS(variance_pct) > 0.005\nORDER BY ABS(variance_pct) DESC\nLIMIT 500;",
    },
    {
      id: "recon",
      label: { en: "Billing vs ledger by month (CTE)", ko: "월별 청구 vs 장부 대사 (CTE)", fr: "Facturation vs grand livre par mois (CTE)" },
      sql: "WITH billed AS (\n  SELECT\n    Bill_Month,\n    CASE WHEN UPPER(TRIM(Rate_Class)) IN ('RES', 'RESIDENTIAL') THEN 'RES'\n         ELSE UPPER(TRIM(Rate_Class)) END AS rate_class,\n    SUM(Billed_Amount) AS billed\n  FROM (SELECT DISTINCT * FROM Billing)\n  GROUP BY 1, 2\n)\nSELECT\n  b.Bill_Month,\n  b.rate_class,\n  ROUND(b.billed, 2) AS billed,\n  g.GL_Revenue AS ledger,\n  ROUND(g.GL_Revenue - b.billed, 2) AS difference\nFROM billed AS b\nLEFT JOIN Finance_GL AS g\n  ON g.GL_Month = b.Bill_Month AND g.Rate_Class = b.rate_class\nORDER BY ABS(difference) DESC;",
    },
    {
      id: "dupes",
      label: { en: "Duplicate bills (HAVING)", ko: "중복 청구 (HAVING)", fr: "Factures en double (HAVING)" },
      sql: "SELECT\n  Customer_ID,\n  Bill_Month,\n  COUNT(*) AS copies,\n  ROUND(SUM(Billed_Amount), 2) AS total_billed\nFROM Billing\nGROUP BY Customer_ID, Bill_Month\nHAVING COUNT(*) > 1\nORDER BY copies DESC, Customer_ID;",
    },
  ],
  sap: [
    {
      id: "net",
      label: { en: "Net amount by rate category, cleaned in SQL", ko: "요금 유형별 순금액 (SQL로 정리)", fr: "Montant net par catégorie, nettoyé en SQL" },
      sql: "-- Raw SAP text: \"1,234.56-\" means -1234.56\nWITH lines AS (\n  SELECT\n    UPPER(TRIM(\"Rate Category\")) AS rate_category,\n    \"Billing Doc.\" AS doc,\n    CASE WHEN Amount LIKE '%-'\n      THEN -CAST(REPLACE(REPLACE(Amount, ',', ''), '-', '') AS REAL)\n      ELSE CAST(REPLACE(Amount, ',', '') AS REAL) END AS amount\n  FROM SAP_Billing_Export\n  WHERE \"Contract Account\" NOT LIKE '*%'\n    AND \"Contract Account\" <> 'Contract Account'\n)\nSELECT\n  rate_category,\n  COUNT(DISTINCT doc) AS documents,\n  ROUND(SUM(amount), 2) AS net_amount\nFROM (SELECT DISTINCT * FROM lines)\nGROUP BY rate_category\nORDER BY net_amount DESC;",
    },
    {
      id: "reversals",
      label: { en: "Reversed billing documents", ko: "취소된 청구 문서", fr: "Documents de facturation annulés" },
      sql: "SELECT\n  \"Contract Account\",\n  \"Rate Category\",\n  \"Billing Doc.\",\n  \"Posting Date\",\n  Amount\nFROM SAP_Billing_Export\nWHERE Amount LIKE '%-'\n  AND \"Contract Account\" NOT LIKE '*%'\nORDER BY \"Contract Account\";",
    },
    {
      id: "report",
      label: { en: "Subtotal and repeated header lines", ko: "소계 줄과 반복된 머리글", fr: "Sous-totaux et en-têtes répétés" },
      sql: "SELECT *\nFROM SAP_Billing_Export\nWHERE \"Contract Account\" LIKE '*%'\n   OR \"Contract Account\" = 'Contract Account';",
    },
  ],
}
