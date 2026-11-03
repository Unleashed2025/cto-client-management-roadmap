export type FieldType = "text" | "area" | "date" | "num" | "gbp" | "hours" | "yn" | "ynp" | "select" | "size";

export interface BcdrField {
  k: string;
  label: string;
  t: FieldType;
  opts?: readonly string[];
}

export interface BcdrSection {
  id: string;
  title: string;
  intro: string;
  fields: BcdrField[];
}

export type BcdrApp = Record<string, string> & { id: string };

const f = (k: string, label: string, t: FieldType = "text", opts?: readonly string[]): BcdrField => ({ k, label, t, opts });
const notes = (k: string): BcdrField => f(k, "Manual comments / notes", "area");

export const CRITICALITY = ["Critical", "High", "Medium", "Low"] as const;
export const HOSTING_MODELS = ["On-premises", "Private cloud", "Azure", "AWS", "SaaS", "Hybrid", "Other"] as const;
export const BACKUP_TYPES = ["Image", "VM", "Database", "File", "Application-aware", "SaaS", "Other"] as const;
export const RECOVERY_TEMPS = ["Hot", "Warm", "Cold"] as const;
export const RISK_LEVELS = ["Critical", "High", "Medium", "Low"] as const;
export const RECOMMENDED_ACTIONS = [
  "No action", "Improve backup", "Add local backup", "Add offsite/cloud backup", "Increase retention", "Improve RPO", "Improve RTO",
  "Introduce immutable backup", "Introduce DR", "Improve DR", "Create BCP", "Test recovery", "Replace backup solution", "Review supplier", "Further assessment required",
] as const;

export const SAAS_KEY = "hostSaasManaged";
export const SAAS_HIDDEN_PREFIX = ["hostServers", "hostDb", "hostStorage", "hostOs", "hostVmCount", "hostSecondary"];

export const BCDR_SECTIONS: BcdrSection[] = [
  {
    id: "overview", title: "1. Application / Service Overview", intro: "Basic identification.",
    fields: [
      f("name", "Application / service name"), f("description", "Application description"), f("does", "What does the application do?", "area"),
      f("function", "Business function supported"), f("bizOwner", "Business owner"), f("techOwner", "Technical owner"),
      f("vendor", "Primary supplier / vendor"), f("supportProvider", "Support provider"), f("version", "Version"),
      f("users", "Number of users", "num"), f("sites", "Number of sites using it", "num"), f("hours", "Operating hours"),
      f("critical", "Is it business critical?", "select", ["Yes", "No"]), f("criticality", "Criticality", "select", CRITICALITY), notes("overviewNotes"),
    ],
  },
  {
    id: "impact", title: "2. Business Impact", intro: "Why we are protecting it.",
    fields: [
      f("processes", "Business processes that depend on this application", "area"), f("unavailable", "What happens if the application is unavailable?", "area"),
      f("manualWork", "Can staff continue working manually?", "select", ["Yes", "Partially", "No"]), f("workaround", "Is there a documented workaround?", "select", ["Yes", "No"]),
      f("mtd", "Maximum tolerable downtime (hours)", "hours"),
      f("impactFinancial", "Financial impact of downtime", "area"), f("impactOps", "Operational impact", "area"), f("impactCustomer", "Customer impact", "area"),
      f("impactReg", "Regulatory / compliance impact", "area"), f("impactRep", "Reputational impact", "area"),
      f("dependents", "Is another critical application dependent upon this service?", "area"),
      f("costMin", "Estimated cost per minute (£)", "gbp"), f("costHour", "Estimated cost per hour (£)", "gbp"), f("costDay", "Estimated cost per day (£)", "gbp"),
      f("costOther", "Other financial impact (£)", "gbp"), f("costBasis", "Basis / assumptions for calculation", "area"), notes("impactNotes"),
    ],
  },
  {
    id: "hosting", title: "3. Hosting & Infrastructure", intro: "Where the application actually lives.",
    fields: [
      f("hostModel", "Hosting model", "select", HOSTING_MODELS),
      f(SAAS_KEY, "Infrastructure managed entirely by application provider", "yn"),
      f("hostPrimary", "Primary hosting location"), f("hostSecondary", "Secondary hosting location"), f("hostProvider", "Hosting provider"),
      f("hostServers", "Server / VM names"), f("hostDb", "Database platform"), f("hostStorage", "Storage platform"), f("hostOs", "Operating system"),
      f("hostVmCount", "Number of servers / VMs", "num"), f("hostDeps", "Infrastructure dependencies", "area"),
      f("hostInternet", "Internet dependency", "select", ["Yes", "No"]), f("hostIdentity", "Identity / Microsoft 365 dependency", "select", ["Yes", "No"]), notes("hostNotes"),
    ],
  },
  {
    id: "data", title: "4. Data Profile", intro: "What we are actually trying to protect.",
    fields: [
      f("dataTotal", "Approximate data size", "size"), f("dataDb", "Database size", "size"), f("dataFiles", "File / document size", "size"),
      f("dataGrowth", "Current data growth", "size"), f("dataAnnualGrowth", "Estimated annual growth", "size"), f("dataDbCount", "Number of databases", "num"),
      f("dataLocation", "Data location"), f("dataPersonal", "Contains personal data?", "yn"), f("dataSensitive", "Contains sensitive / confidential data?", "yn"),
      f("dataFinancial", "Contains financial data?", "yn"), f("dataRegRetention", "Regulatory retention requirements", "area"), f("dataRetention", "Required retention period"), notes("dataNotes"),
    ],
  },
  {
    id: "backup", title: "5. Backup Service", intro: "The overall backup provision.",
    fields: [
      f("bkProtected", "Is the application backed up?", "select", ["Yes", "No", "Partially"]), f("bkProvider", "Backup provider"), f("bkProduct", "Backup product"),
      f("bkManagedBy", "Backup managed by"), f("bkType", "Backup type", "select", BACKUP_TYPES), f("bkFreq", "Backup frequency"), f("bkSchedule", "Backup schedule"),
      f("bkRetention", "Retention period"), f("bkEncrypted", "Is encryption enabled?", "yn"), f("bkMonitored", "Are backups monitored?", "yn"),
      f("bkResponder", "Who responds to failures?"), notes("bkNotes"),
    ],
  },
  {
    id: "local", title: "6. Local Backup Copy", intro: "Local copy: backup exists vs. we know how quickly we can restore.",
    fields: [
      f("locAvail", "Local backup available?", "yn"), f("locLocation", "Location"), f("locTech", "Backup technology"), f("locFreq", "Backup frequency"),
      f("locRetention", "Retention"), f("locSize", "Data size", "size"), f("locEncrypted", "Local copy encrypted?", "yn"),
      f("locRpo", "Local backup RPO (hours)", "hours"), f("locRto", "Local backup RTO (hours)", "hours"),
      f("locLastBackup", "Last successful backup", "date"), f("locLastRestore", "Last successful restore test", "date"), notes("locNotes"),
    ],
  },
  {
    id: "cloud", title: "7. Cloud / Offsite Backup Copy", intro: "Separate from the local backup.",
    fields: [
      f("cldAvail", "Cloud / offsite backup available?", "yn"), f("cldBackupProvider", "Backup provider"), f("cldProvider", "Cloud provider"), f("cldGeo", "Geographic location"),
      f("cldFreq", "Backup frequency"), f("cldRetention", "Retention"), f("cldSize", "Data size", "size"),
      f("cldImmutable", "Immutable?", "yn"), f("cldEncrypted", "Encrypted?", "yn"), f("cldMfa", "MFA protecting backup administration?", "yn"),
      f("cldRpo", "Cloud backup RPO (hours)", "hours"), f("cldRto", "Cloud restore RTO (hours)", "hours"),
      f("cldLastBackup", "Last successful backup", "date"), f("cldLastRestore", "Last restore test", "date"), notes("cldNotes"),
    ],
  },
  {
    id: "dr", title: "8. Disaster Recovery Capability", intro: "Different from simply having another backup copy.",
    fields: [
      f("drAvail", "Offsite DR capability?", "yn"), f("drProvider", "DR provider"), f("drPlatform", "DR platform"), f("drLocation", "DR location"),
      f("drTemp", "Warm / hot / cold recovery", "select", RECOVERY_TEMPS), f("drReplication", "Replication used?", "yn"), f("drReplFreq", "Replication frequency"),
      f("drRpo", "DR RPO (hours)", "hours"), f("drRto", "DR RTO (hours)", "hours"),
      f("drFullApp", "Can the complete application run from DR?", "select", ["Yes", "No", "Partially"]), f("drAuto", "Is automatic failover available?", "yn"),
      f("drManual", "Is manual intervention required?", "yn"), f("drWhoInvokes", "Who invokes DR?"), f("drHow", "How is DR invoked?", "area"),
      f("drRunbook", "Is there a DR runbook?", "yn"), f("drLastTest", "Date DR last tested", "date"), f("drLastResult", "Result of last DR test", "area"), notes("drNotes"),
    ],
  },
  {
    id: "bc", title: "9. Business Continuity", intro: "Not every outage is solved by restoring a server.",
    fields: [
      f("bcPlan", "Business continuity plan exists?", "yn"), f("bcIncluded", "Application included in BCP?", "yn"), f("bcWorkaround", "Manual workaround available?", "yn"),
      f("bcWorkaroundHours", "Maximum time manual workaround can operate (hours)", "hours"), f("bcAlt", "Alternative system available?", "yn"),
      f("bcSite", "Alternative site required?", "yn"), f("bcRemote", "Remote working possible during outage?", "yn"),
      f("bcSupplier", "Supplier continuity arrangement?", "yn"), f("bcComms", "Communications plan?", "yn"), f("bcContacts", "Key contacts identified?", "yn"),
      f("bcLastTest", "Business continuity last tested", "date"), f("bcOutcome", "Test outcome", "area"), notes("bcNotes"),
    ],
  },
  {
    id: "test", title: "10. Testing & Assurance", intro: "A backup isn't proven until something has been restored.",
    fields: [
      f("tsMonitored", "Backup success monitored?", "yn"), f("tsAlerted", "Failed backups alerted?", "yn"), f("tsInvestigated", "Failed backups investigated?", "yn"),
      f("tsRestores", "Test restores performed?", "yn"), f("tsFreq", "Restore test frequency"), f("tsLastRestore", "Date of last restore test", "date"),
      f("tsRestoreOk", "Was the restore successful?", "yn"), f("tsRtoMet", "Was the RTO achieved?", "yn"), f("tsRpoMet", "Was the RPO achieved?", "yn"),
      f("tsDr", "DR tested?", "yn"), f("tsDrDate", "Date of last DR test", "date"), f("tsDrRto", "Was DR RTO achieved?", "yn"), f("tsDrRpo", "Was DR RPO achieved?", "yn"),
      f("tsEvidence", "Evidence available?", "yn"), f("tsNotes", "Manual test / evidence comments", "area"),
    ],
  },
  {
    id: "cost", title: "11. Cost & Licensing", intro: "Enter monthly figures per month; all other recurring figures per year.",
    fields: [
      f("bkLicQty", "Backup licence quantity", "num"), f("bkUnit", "Backup unit cost (£)", "gbp"), f("bkMonthly", "Backup monthly cost (£)", "gbp"), f("bkAnnual", "Backup annual cost (£)", "gbp"),
      f("bkStorage", "Backup storage cost per year (£)", "gbp"), f("bkExtraStorage", "Additional storage cost per year (£)", "gbp"), f("bkUpfront", "Backup implementation / upfront cost (£)", "gbp"),
      f("drLicQty", "DR licence quantity", "num"), f("drUnit", "DR unit cost (£)", "gbp"), f("drMonthly", "DR monthly cost (£)", "gbp"), f("drAnnual", "DR annual cost (£)", "gbp"),
      f("drCompute", "DR infrastructure / compute cost per year (£)", "gbp"), f("drStorage", "DR storage cost per year (£)", "gbp"),
      f("drUsage", "DR usage / invocation cost (£)", "gbp"), f("drUpfront", "DR implementation / upfront cost (£)", "gbp"),
      f("supProvider", "Support provider"), f("supMonthly", "Monthly support cost (£)", "gbp"), f("supAnnual", "Annual support cost (£)", "gbp"),
      f("ctStart", "Contract start date", "date"), f("ctRenewal", "Renewal date", "date"), f("ctEnd", "Contract end date", "date"),
      f("ctNotice", "Notice period"), f("ctEos", "End-of-support date", "date"),
    ],
  },
  {
    id: "assess", title: "12. Assessment, Gaps & Recommendation", intro: "Make sense of it. Business requirement vs. technical reality.",
    fields: [
      f("asAdequate", "Current protection adequate?", "select", ["Yes", "Partially", "No"]),
      f("reqRpo", "Business RPO requirement (hours)", "hours"), f("achRpo", "Current achievable RPO (hours)", "hours"),
      f("reqRto", "Business RTO requirement (hours)", "hours"), f("achRto", "Current achievable RTO (hours)", "hours"),
      f("asBackup", "Backup adequate?", "ynp"), f("asOffsite", "Offsite backup adequate?", "ynp"), f("asDr", "DR adequate?", "ynp"),
      f("asBc", "Business continuity adequate?", "ynp"), f("asTesting", "Testing adequate?", "ynp"), f("asCost", "Cost appropriate?", "ynp"),
      f("risk", "Risk", "select", RISK_LEVELS),
      f("findings", "Key findings", "area"), f("risks", "Risks", "area"), f("limitations", "Current limitations", "area"), f("issues", "Known issues", "area"),
      f("assumptions", "Assumptions", "area"), f("recommendations", "Recommendations", "area"), f("improvements", "Required improvements", "area"),
      f("assessorComments", "Assessor comments", "area"), f("customerComments", "Customer comments", "area"),
      f("action", "Recommended action", "select", RECOMMENDED_ACTIONS),
    ],
  },
];

export function createBcdrApp(): BcdrApp {
  return { id: `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, hostModel: "" };
}

const n = (value: string | undefined) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};
const has = (value: string | undefined) => (value ?? "").trim() !== "" && Number.isFinite(Number.parseFloat(value ?? ""));

export const sizeUnitKey = (key: string) => `${key}_u`;
export function sizeToGb(app: BcdrApp, key: string): number {
  const unit = app[sizeUnitKey(key)] || "GB";
  const value = n(app[key]);
  return unit === "MB" ? value / 1024 : unit === "TB" ? value * 1024 : value;
}

export function formatSize(gb: number): string {
  if (gb <= 0) return "—";
  return gb >= 1024 ? `${(gb / 1024).toFixed(1)} TB` : gb >= 1 ? `${Math.round(gb)} GB` : `${Math.round(gb * 1024)} MB`;
}

export const hoursLabel = (value: string | undefined) => (has(value) ? `${n(value)}h` : "—");

export function formatGbp(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export interface BcdrCalc {
  costPerHour: number;
  costPerDay: number;
  outageCost: number;
  monthlyProtection: number;
  annualProtection: number;
  upfront: number;
  firstYear: number;
  annualVsHour: number | null;
  annualVsDay: number | null;
  rtoGap: number | null;
  rpoGap: number | null;
  gapRisk: "Within requirement" | "Medium" | "High" | "Not assessed";
  dataGb: number;
}

export function calcApp(app: BcdrApp): BcdrCalc {
  const costPerHour = has(app.costHour) ? n(app.costHour) : has(app.costMin) ? n(app.costMin) * 60 : has(app.costDay) ? n(app.costDay) / 24 : 0;
  const costPerDay = has(app.costDay) ? n(app.costDay) : costPerHour * 24;
  const outageCost = n(app.mtd) * costPerHour + n(app.costOther);
  const annualBackup = n(app.bkMonthly) * 12 + n(app.bkAnnual) + n(app.bkStorage) + n(app.bkExtraStorage);
  const annualDr = n(app.drMonthly) * 12 + n(app.drAnnual) + n(app.drCompute) + n(app.drStorage) + n(app.drUsage);
  const annualSupport = n(app.supMonthly) * 12 + n(app.supAnnual);
  const annualProtection = annualBackup + annualDr + annualSupport;
  const upfront = n(app.bkUpfront) + n(app.drUpfront);
  const gap = (req: string | undefined, ach: string | undefined) => (has(req) && has(ach) ? n(ach) - n(req) : null);
  const rtoGap = gap(app.reqRto, app.achRto);
  const rpoGap = gap(app.reqRpo, app.achRpo);
  const gaps: Array<[number | null, string | undefined]> = [[rtoGap, app.reqRto], [rpoGap, app.reqRpo]];
  const known = gaps.filter(([g]) => g !== null);
  let gapRisk: BcdrCalc["gapRisk"] = "Not assessed";
  if (known.length > 0) {
    const breached = known.filter(([g]) => (g as number) > 0);
    gapRisk = breached.length === 0 ? "Within requirement" : breached.some(([g, req]) => n(req) === 0 || (g as number) >= n(req)) ? "High" : "Medium";
  }
  return {
    costPerHour, costPerDay, outageCost,
    monthlyProtection: annualProtection / 12, annualProtection, upfront, firstYear: annualProtection + upfront,
    annualVsHour: costPerHour > 0 ? annualProtection / costPerHour : null,
    annualVsDay: costPerDay > 0 ? annualProtection / costPerDay : null,
    rtoGap, rpoGap, gapRisk,
    dataGb: sizeToGb(app, "dataTotal") || sizeToGb(app, "dataDb") + sizeToGb(app, "dataFiles"),
  };
}

export const gapText = (gap: number | null) => (gap === null ? "—" : gap > 0 ? `+${gap}h over` : "met");
export const rtoRpo = (rto: string | undefined, rpo: string | undefined) => (has(rto) || has(rpo) ? `${hoursLabel(rto)} / ${hoursLabel(rpo)}` : "N/A");

export interface CatalogueRow {
  name: string;
  critical: string;
  users: string;
  downtime: string;
  data: string;
  local: string;
  localRtoRpo: string;
  cloud: string;
  cloudRtoRpo: string;
  dr: string;
  drRtoRpo: string;
  annualCost: string;
  risk: string;
}

export function catalogueRow(app: BcdrApp): CatalogueRow {
  const calc = calcApp(app);
  const yn = (value: string | undefined) => value || "—";
  return {
    name: app.name || "(unnamed)",
    critical: yn(app.critical),
    users: app.users || "—",
    downtime: calc.costPerHour > 0 ? `${formatGbp(calc.costPerHour)}/hr` : "—",
    data: formatSize(calc.dataGb),
    local: yn(app.locAvail),
    localRtoRpo: rtoRpo(app.locRto, app.locRpo),
    cloud: yn(app.cldAvail),
    cloudRtoRpo: rtoRpo(app.cldRto, app.cldRpo),
    dr: yn(app.drAvail),
    drRtoRpo: rtoRpo(app.drRto, app.drRpo),
    annualCost: calc.annualProtection > 0 ? formatGbp(calc.annualProtection) : "—",
    risk: app.risk || (calc.gapRisk === "Not assessed" ? "—" : calc.gapRisk),
  };
}

export const CATALOGUE_HEADERS = ["Application", "Critical?", "Users", "Downtime cost", "Data", "Local backup", "Local RTO/RPO", "Cloud copy", "Cloud RTO/RPO", "DR", "DR RTO/RPO", "Annual cost", "Risk"];
export const catalogueCells = (row: CatalogueRow) => [row.name, row.critical, row.users, row.downtime, row.data, row.local, row.localRtoRpo, row.cloud, row.cloudRtoRpo, row.dr, row.drRtoRpo, row.annualCost, row.risk];
