export type RegItem = Record<string, string> & { id: string };

export const PILLARS = ["Identity", "Devices", "Apps", "Data", "Infrastructure"] as const;

export const TENANT_FIELDS: { k: string; label: string; area?: boolean }[] = [
  { k: "org", label: "Organisation" },
  { k: "tenant", label: "Tenant name" },
  { k: "domain", label: "Primary domain" },
  { k: "licensed", label: "Number of licensed users" },
  { k: "active", label: "Number of active users" },
  { k: "licences", label: "Microsoft 365 licence types" },
  { k: "secLicences", label: "Microsoft security products / licences" },
  { k: "date", label: "Assessment date" },
  { k: "assessor", label: "Assessor" },
  { k: "contact", label: "Customer contact" },
  { k: "comments", label: "General comments", area: true },
];

export const CONTROL_STATUS = ["Not assessed", "In place", "Partially in place", "Not in place", "Not applicable"] as const;

export type ControlSection = { id: string; title: string; controls: string[] };

export const CONTROL_SECTIONS: ControlSection[] = [
  { id: "identity", title: "Identity Security", controls: ["MFA", "Phishing-resistant MFA for privileged users", "Conditional Access", "Privileged / admin accounts", "PIM", "Legacy authentication", "Risky users / sign-ins", "Guest accounts", "Dormant accounts", "Joiner / mover / leaver controls"] },
  { id: "device", title: "Device Security", controls: ["Intune / MDM", "Device compliance", "Defender for Endpoint", "Endpoint security policies", "BitLocker", "Local administrator control", "OS patching", "Application patching", "Unsupported devices", "Device monitoring"] },
  { id: "email", title: "Email, Apps & Collaboration", controls: ["Exchange Online protection", "Anti-phishing", "Safe Links", "Safe Attachments", "Impersonation protection", "Mail forwarding", "Teams security", "Enterprise applications", "OAuth permissions", "Third-party applications"] },
  { id: "data", title: "Data, SharePoint & OneDrive", controls: ["External sharing", "Anyone links", "SharePoint permissions", "OneDrive permissions", "Guest access", "Sensitive information", "Sensitivity labels", "DLP", "Retention", "Information protection"] },
  { id: "privileged", title: "Privileged Access & Administration", controls: ["Global Administrator membership", "Separate admin accounts", "MFA for admins", "Conditional Access for admins", "PIM", "Break-glass accounts", "Service accounts", "Service principals", "Third-party / MSP administration", "Administrative consent"] },
  { id: "monitoring", title: "Monitoring & Security Operations", controls: ["Audit logging", "Defender alerts", "Incident monitoring", "Risky sign-ins", "Risky users", "Alert ownership", "Escalation", "Incident response", "Security reporting", "Review frequency"] },
];

export type M365State = {
  tenant: Record<string, string>;
  score: Record<string, string>;
  controls: Record<string, { status: string; note: string }>;
  register: RegItem[];
};

export const emptyM365 = (): M365State => ({ tenant: {}, score: {}, controls: {}, register: [] });

export const RISKS = ["Critical", "High", "Medium", "Low"];
export const TIERS = ["Core", "Defence in Depth", "Advanced"];
export const LEVELS = ["Low", "Moderate", "High"];
export const REG_STATUS = ["Not started", "Planned", "In progress", "Complete", "Blocked"];
export const CLASS_OVERRIDES = ["Auto", "Priority Recommendation", "Recommendation", "Optimisation", "Consider", "Risk Accepted"];

export type RegField = { k: string; label: string; t: "text" | "num" | "area" | "date" | "select"; opts?: string[]; group: string };

export const REG_FIELDS: RegField[] = [
  { k: "action", label: "Microsoft Secure Score action", t: "text", group: "Microsoft Secure Score" },
  { k: "category", label: "Secure Score category", t: "select", opts: [...PILLARS], group: "Microsoft Secure Score" },
  { k: "service", label: "Microsoft service", t: "text", group: "Microsoft Secure Score" },
  { k: "curPts", label: "Current points", t: "num", group: "Current position" },
  { k: "maxPts", label: "Maximum points", t: "num", group: "Current position" },
  { k: "expPts", label: "Expected points after improvement", t: "num", group: "Unleashed estimate" },
  { k: "risk", label: "Security risk", t: "select", opts: RISKS, group: "Security assessment" },
  { k: "rank", label: "Microsoft rank", t: "text", group: "Security assessment" },
  { k: "tier", label: "Microsoft tier", t: "select", opts: TIERS, group: "Security assessment" },
  { k: "effort", label: "Implementation effort", t: "select", opts: LEVELS, group: "Security assessment" },
  { k: "impact", label: "User impact", t: "select", opts: LEVELS, group: "Security assessment" },
  { k: "threats", label: "Threats addressed", t: "text", group: "Security assessment" },
  { k: "classOverride", label: "Unleashed classification", t: "select", opts: CLASS_OVERRIDES, group: "Unleashed classification" },
  { k: "currentConfig", label: "Current configuration", t: "area", group: "Assessment" },
  { k: "finding", label: "Finding", t: "area", group: "Assessment" },
  { k: "riskText", label: "Risk (why this matters)", t: "area", group: "Assessment" },
  { k: "recommendation", label: "Recommended improvement", t: "area", group: "Assessment" },
  { k: "implNotes", label: "Implementation notes", t: "area", group: "Assessment" },
  { k: "assumptions", label: "Assumptions", t: "area", group: "Assessment" },
  { k: "assessorComments", label: "Assessor comments", t: "area", group: "Comments" },
  { k: "customerComments", label: "Customer comments", t: "area", group: "Comments" },
  { k: "evidence", label: "Evidence", t: "area", group: "Comments" },
  { k: "owner", label: "Owner", t: "text", group: "Delivery" },
  { k: "status", label: "Status", t: "select", opts: REG_STATUS, group: "Delivery" },
  { k: "target", label: "Target date", t: "date", group: "Delivery" },
  { k: "actualPts", label: "Actual points achieved", t: "num", group: "Delivery" },
];

export const createRegItem = (): RegItem => ({ id: `R${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, category: "Identity", classOverride: "Auto", status: "Not started" });

const n = (v: string | undefined) => {
  const x = parseFloat(v ?? "");
  return Number.isFinite(x) ? x : 0;
};
const has = (v: string | undefined) => (v ?? "").trim() !== "" && Number.isFinite(parseFloat(v ?? ""));

export const PRIORITY = "Priority Recommendation";
export const RECOMMENDATION = "Recommendation";
export const OPTIMISATION = "Optimisation";

export function itemCalc(item: RegItem) {
  const cur = n(item.curPts);
  const max = n(item.maxPts);
  const remaining = Math.max(0, max - cur);
  const gain = has(item.expPts) ? Math.max(0, Math.min(n(item.expPts), max || n(item.expPts)) - cur) : 0;
  return { cur, max, remaining, gain };
}

export function autoClass(item: RegItem): { label: string; reasons: string[] } {
  const { cur, max, remaining, gain } = itemCalc(item);
  const reasons: string[] = [];
  if (item.risk === "Critical") reasons.push("critical security exposure");
  if (item.risk === "High") reasons.push("high security exposure");
  if (item.tier === "Core" && max > 0 && cur === 0) reasons.push("core control absent");
  if (max > 0 && remaining >= 5 && remaining / max >= 0.5) reasons.push("large share of points available");
  if (gain >= 5 && item.effort === "Low") reasons.push("high value for low effort");
  if (reasons.length) return { label: PRIORITY, reasons };
  if (item.risk === "Medium" || item.risk === "") return { label: RECOMMENDATION, reasons: [] };
  return { label: OPTIMISATION, reasons: [] };
}

export function finalClass(item: RegItem): string {
  const o = item.classOverride;
  if (o && o !== "Auto") return o;
  return autoClass(item).label;
}

const riskW: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const effortW: Record<string, number> = { Low: 3, Moderate: 2, High: 1 };
const impactW: Record<string, number> = { Low: 2, Moderate: 1, High: 0 };

// Risk dominates, then points, then ease of delivery; raw points alone never decide order.
export function rankScore(item: RegItem): number {
  const { gain, remaining } = itemCalc(item);
  return (riskW[item.risk] ?? 0) * 10 + Math.min(Math.max(gain, remaining * 0.5), 20) * 0.5 + (effortW[item.effort] ?? 0) * 2 + (impactW[item.impact] ?? 0);
}

export function sortedRegister(items: RegItem[]): RegItem[] {
  return [...items].sort((a, b) => rankScore(b) - rankScore(a));
}

export const pct = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;

export function scenarios(state: M365State) {
  const cur = n(state.score.curPts);
  const max = n(state.score.maxPts);
  const live = state.register.filter((i) => finalClass(i) !== "Risk Accepted");
  const priority = live.filter((i) => finalClass(i) === PRIORITY);
  const gainOf = (items: RegItem[], pillar?: string) => items.filter((i) => !pillar || i.category === pillar).reduce((s, i) => s + itemCalc(i).gain, 0);
  const pointsToPct = (points: number, total: number) => (total > 0 ? Math.min(100, (points / total) * 100) : 0);
  const overall = {
    current: pointsToPct(cur, max),
    priority: pointsToPct(cur + gainOf(priority), max),
    all: pointsToPct(cur + gainOf(live), max),
    priorityGain: gainOf(priority),
    allGain: gainOf(live),
    actual: has(state.score.actualPts) ? pointsToPct(n(state.score.actualPts), max) : null,
  };
  const pillars = PILLARS.map((p) => {
    const pc = n(state.score[`${p}_cur`]);
    const pa = n(state.score[`${p}_avail`]);
    return {
      pillar: p,
      cur: pc,
      avail: pa,
      current: pointsToPct(pc, pa),
      priority: pointsToPct(pc + gainOf(priority, p), pa),
      all: pointsToPct(pc + gainOf(live, p), pa),
    };
  });
  return { overall, pillars, cur, max };
}

export function controlSummary(state: M365State, section: ControlSection) {
  const counts: Record<string, number> = {};
  for (const c of CONTROL_STATUS) counts[c] = 0;
  section.controls.forEach((_, i) => {
    const s = state.controls[`${section.id}:${i}`]?.status || "Not assessed";
    counts[s] = (counts[s] ?? 0) + 1;
  });
  return counts;
}
