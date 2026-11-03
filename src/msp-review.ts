import { AI_SECTION_WEIGHTS, type OrganisationField } from "./ai-data-readiness";
import type { BenchmarkQuestion } from "./compliance-benchmarks";

export const MSP_SCORE_RATINGS = [
  { score: 0, label: "Critical / not provided", description: "The requirement is not provided or presents a critical gap." },
  { score: 1, label: "Poor", description: "Provided but with serious weaknesses." },
  { score: 2, label: "Significant improvement required", description: "Partially meets the need with material gaps." },
  { score: 3, label: "Meets requirement", description: "Meets the organisation's requirement." },
  { score: 4, label: "Good", description: "Performs well with minor improvements possible." },
  { score: 5, label: "Excellent", description: "Exceeds the requirement and is proactively improved." },
] as const;

export const MSP_IMPORTANCE = ["Low", "Medium", "High", "Critical"] as const;
export const MSP_POSITIONS = ["Yes", "Partially", "No", "N/A"] as const;

export interface MspQuestionExtras {
  importance: (typeof MSP_IMPORTANCE)[number] | "";
  position: (typeof MSP_POSITIONS)[number] | "";
  risk: string;
  recommendation: string;
  futureRequirement: string;
  customerComments: string;
}

export const EMPTY_MSP_EXTRAS: MspQuestionExtras = {
  importance: "",
  position: "",
  risk: "",
  recommendation: "",
  futureRequirement: "",
  customerComments: "",
};

const SECTIONS: Array<{
  title: string;
  weight: number;
  capture?: string;
  questions: Array<[string, string]>;
}> = [
  {
    title: "IT Services & Supplier Overview",
    weight: 8,
    questions: [
      ["SUP-01", "Are all current IT suppliers documented?"],
      ["SUP-02", "Are all IT services provided by each supplier documented?"],
      ["SUP-03", "Are responsibilities between the organisation and suppliers clearly defined?"],
      ["SUP-04", "Is there an accurate inventory of key technology and systems?"],
      ["SUP-05", "Are business-critical systems identified?"],
      ["SUP-06", "Are service owners identified?"],
      ["SUP-07", "Are contract owners identified?"],
      ["SUP-08", "Are supplier contract and renewal dates known?"],
      ["SUP-09", "Are supplier notice and cancellation periods known?"],
      ["SUP-10", "Are current services still appropriate for the organisation's requirements?"],
    ],
  },
  {
    title: "Support, Service Desk & SLAs",
    weight: 12,
    capture: "Support hours · P1–P4 response · Resolution targets · Onsite SLA · Out-of-hours availability · SLA achievement · CSAT · Ticket volumes · Backlog",
    questions: [
      ["SLA-01", "Are support hours appropriate?"],
      ["SLA-02", "Can users easily access support through appropriate channels?"],
      ["SLA-03", "Are incident priorities such as P1–P4 clearly defined?"],
      ["SLA-04", "Are response SLAs documented?"],
      ["SLA-05", "Are resolution targets documented?"],
      ["SLA-06", "Are users kept informed about open incidents?"],
      ["SLA-07", "Are ageing and overdue tickets actively managed?"],
      ["SLA-08", "Are repeat incidents investigated?"],
      ["SLA-09", "Are SLA performance and customer satisfaction reported?"],
      ["SLA-10", "Is there a clear technical and management escalation process?"],
    ],
  },
  {
    title: "Microsoft 365, Devices & Licensing",
    weight: 10,
    capture: "Per major licence: Product/SKU · Supplier · Quantity · Assigned · Used · Unit cost · Monthly/annual cost · Renewal date · Commitment period (record these in the Service, Product & Cost Register).",
    questions: [
      ["M365-01", "Is Microsoft 365 proactively managed?"],
      ["M365-02", "Are Entra ID identities and access appropriately managed?"],
      ["M365-03", "Are devices centrally managed using Intune or equivalent?"],
      ["M365-04", "Are joiner, mover and leaver processes effective?"],
      ["M365-05", "Are SharePoint, Teams and OneDrive permissions reviewed?"],
      ["M365-06", "Are Microsoft licences regularly reviewed and optimised?"],
      ["M365-07", "Are purchased, assigned and unused licences understood?"],
      ["M365-08", "Are standard device security and configuration policies implemented?"],
      ["M365-09", "Are devices appropriately encrypted and secured?"],
      ["M365-10", "Does the supplier proactively recommend Microsoft 365 improvements?"],
    ],
  },
  {
    title: "Cyber Security & Compliance",
    weight: 14,
    capture: "Cyber Essentials baseline: firewalls · secure configuration · security update management · user access control · malware protection.",
    questions: [
      ["SEC-01", "Is MFA appropriately enforced?"],
      ["SEC-02", "Is Conditional Access appropriately configured?"],
      ["SEC-03", "Is endpoint protection / EDR deployed?"],
      ["SEC-04", "Are security alerts actively monitored?"],
      ["SEC-05", "Are operating systems and applications appropriately patched?"],
      ["SEC-06", "Are vulnerabilities identified and remediated?"],
      ["SEC-07", "Are administrator and privileged accounts controlled?"],
      ["SEC-08", "Are Cyber Essentials or equivalent baseline controls addressed?"],
      ["SEC-09", "Is there a documented cyber incident-response process?"],
      ["SEC-10", "Does the supplier provide proactive security reporting and recommendations?"],
    ],
  },
  {
    title: "Infrastructure, Firewall & Connectivity",
    weight: 10,
    capture: "Per item: Supplier · Manufacturer · Product/model · Quantity · Location · Licence · Monthly/annual/support cost · Renewal · Warranty · End-of-support · Replacement requirement.",
    questions: [
      ["INF-01", "Are firewalls fully supported and appropriately licensed?"],
      ["INF-02", "Are firewall configurations and rules regularly reviewed?"],
      ["INF-03", "Are firewall firmware and security updates maintained?"],
      ["INF-04", "Are switches, access points and network infrastructure supported?"],
      ["INF-05", "Are corporate, guest and sensitive networks appropriately separated?"],
      ["INF-06", "Are internet circuits actively monitored?"],
      ["INF-07", "Is appropriate internet resilience / failover available?"],
      ["INF-08", "Is connectivity capacity sufficient?"],
      ["INF-09", "Are infrastructure components approaching end of support identified?"],
      ["INF-10", "Is an accurate network and infrastructure inventory maintained?"],
    ],
  },
  {
    title: "Backup, Resilience & Business Continuity",
    weight: 12,
    capture: "Backup product · Supplier · Protected users/devices/servers · Retention · Storage · Monthly/annual cost · Renewal · RPO · RTO.",
    questions: [
      ["BCK-01", "Are all critical systems appropriately backed up?"],
      ["BCK-02", "Is Microsoft 365 data appropriately protected?"],
      ["BCK-03", "Are backup failures actively monitored and resolved?"],
      ["BCK-04", "Are backups protected against ransomware and deletion?"],
      ["BCK-05", "Are restores regularly tested?"],
      ["BCK-06", "Are backup retention requirements documented?"],
      ["BCK-07", "Are RPO and RTO requirements agreed?"],
      ["BCK-08", "Is there a documented disaster-recovery plan?"],
      ["BCK-09", "Is disaster recovery regularly tested?"],
      ["BCK-10", "Are appropriate IT business-continuity arrangements in place?"],
    ],
  },
  {
    title: "Telephony & Communications",
    weight: 6,
    capture: "Supplier · Platform · Users · Licence quantity · Telephone numbers · Handsets · Unit cost · Monthly/annual cost · Call charges · Renewal date.",
    questions: [
      ["TEL-01", "Does the telephony platform meet current business requirements?"],
      ["TEL-02", "Are telephone licence/user quantities and costs understood?"],
      ["TEL-03", "Does the organisation retain appropriate control of its telephone numbers?"],
      ["TEL-04", "Are call queues, auto attendants and routing appropriately configured?"],
      ["TEL-05", "Is Teams Phone or another appropriate modern platform being considered or used?"],
      ["TEL-06", "Is telephony resilient to connectivity or site failure?"],
      ["TEL-07", "Is appropriate call reporting available?"],
      ["TEL-08", "Are carrier and platform support arrangements appropriate?"],
      ["TEL-09", "Are contract, renewal and number-porting arrangements understood?"],
      ["TEL-10", "Are telephony costs periodically reviewed?"],
    ],
  },
  {
    title: "Data, AI & Future Technology",
    weight: 8,
    capture: "Where this section identifies problems, the AI Data Readiness assessment can be run as an optional deeper assessment.",
    questions: [
      ["DAT-01", "Does the organisation understand where important organisational data resides?"],
      ["DAT-02", "Are permissions and oversharing appropriately controlled?"],
      ["DAT-03", "Is sensitive information appropriately identified and protected?"],
      ["DAT-04", "Is obsolete, duplicated or poor-quality information managed?"],
      ["DAT-05", "Is there an AI Acceptable Use Policy?"],
      ["DAT-06", "Does the organisation understand which AI platforms staff currently use?"],
      ["DAT-07", "Has AI / Microsoft 365 Copilot data readiness been assessed?"],
      ["DAT-08", "Have valuable AI and automation opportunities been identified?"],
      ["DAT-09", "Are AI applications, agents and data connections appropriately governed?"],
      ["DAT-10", "Does the organisation have a practical AI adoption roadmap?"],
    ],
  },
  {
    title: "Account Management, Strategy & Value",
    weight: 10,
    capture: "This exposes the difference between an MSP that fixes tickets and a genuine technology partner / fractional IT Director capability.",
    questions: [
      ["ACC-01", "Is there a named account / service manager?"],
      ["ACC-02", "Are structured service reviews regularly held?"],
      ["ACC-03", "Does the supplier provide useful management reporting?"],
      ["ACC-04", "Are risks proactively identified?"],
      ["ACC-05", "Are improvements proactively recommended?"],
      ["ACC-06", "Is there a documented technology roadmap?"],
      ["ACC-07", "Does the supplier assist with budgeting and technology lifecycle planning?"],
      ["ACC-08", "Does the supplier proactively identify cost savings and licensing optimisation?"],
      ["ACC-09", "Does the supplier effectively manage and escalate other technology vendors?"],
      ["ACC-10", "Does the overall relationship provide strategic value rather than purely reactive support?"],
    ],
  },
  {
    title: "Commercials, Contracts & Future Supplier",
    weight: 10,
    questions: [
      ["COM-01", "Is the full cost of IT clearly understood?"],
      ["COM-02", "Are recurring, licensing, usage and one-off charges separated?"],
      ["COM-03", "Are additional / chargeable services transparent?"],
      ["COM-04", "Are annual price increases clear?"],
      ["COM-05", "Are contract terms, renewal dates and notice periods known?"],
      ["COM-06", "Does the organisation retain appropriate ownership and control of its tenants, domains, data and telephone numbers?"],
      ["COM-07", "Is supplier exit adequately documented?"],
      ["COM-08", "Can services and licences be transferred if the supplier changes?"],
      ["COM-09", "Does the existing supplier appear capable of meeting future requirements?"],
      ["COM-10", "Should the current arrangement be retained, improved, renegotiated, consolidated or retendered?"],
    ],
  },
];

const EVIDENCE_PROMPT = "Record assessor notes, evidence reviewed, the risk or issue, recommendation, future requirement and customer comments.";

export const MSP_QUESTIONS: BenchmarkQuestion[] = SECTIONS.flatMap((section) =>
  section.questions.map(([reference, prompt]) => ({
    id: `msp-${reference.toLowerCase()}`,
    reference,
    section: section.title,
    prompt,
    evidencePrompt: EVIDENCE_PROMPT,
    guidance: section.capture ? `Capture supporting information: ${section.capture}` : undefined,
    answerType: "Score 0–5",
  })),
);

export const MSP_PRE_QUESTIONS: BenchmarkQuestion[] = SECTIONS.flatMap((section) =>
  MSP_QUESTIONS.filter((question) => question.section === section.title).slice(0, 3),
);

for (const section of SECTIONS) AI_SECTION_WEIGHTS[section.title] = section.weight;

export const MSP_SECTION_CAPTURE: Record<string, string> = Object.fromEntries(
  SECTIONS.filter((section) => section.capture).map((section) => [section.title, section.capture as string]),
);
export const mspSectionNotesKey = (section: string) => `sec:${section}`;

export const MSP_ORGANISATION_FIELDS: OrganisationField[] = [
  { id: "MORG-01", label: "Organisation name", type: "text" },
  { id: "MORG-02", label: "Assessment date", type: "date" },
  { id: "MORG-03", label: "Assessor", type: "text" },
  { id: "MORG-04", label: "Primary customer contact", type: "text" },
  { id: "MORG-05", label: "Number of users", type: "number" },
  { id: "MORG-06", label: "Number of sites", type: "number" },
  { id: "MORG-07", label: "Current MSP / primary IT supplier", type: "text" },
  { id: "MORG-08", label: "Purpose (supplier review, health check, gap analysis, tender)", type: "text" },
  { id: "MORG-09", label: "Business drivers and known concerns", type: "textarea" },
  { id: "MORG-10", label: "Assessment scope and exclusions", type: "textarea" },
];

export const SERVICE_CATEGORIES = [
  "MSP / support",
  "Microsoft licensing",
  "Cybersecurity",
  "Backup",
  "Connectivity",
  "Firewall / network",
  "Telephony",
  "Cloud / Azure",
  "Software / SaaS",
  "Other services",
] as const;

export const SERVICE_OUTCOMES = [
  "Retain",
  "Retain & improve",
  "Renegotiate",
  "Consolidate",
  "Replace",
  "Retender",
  "Bring in-house",
  "Further review required",
] as const;

export const CRITICALITY_LEVELS = ["Low", "Medium", "High", "Critical"] as const;

export interface ServiceRow {
  id: string;
  name: string;
  category: (typeof SERVICE_CATEGORIES)[number];
  description: string;
  supplier: string;
  vendor: string;
  product: string;
  owner: string;
  criticality: (typeof CRITICALITY_LEVELS)[number] | "";
  scale: string;
  licence: string;
  quantityPurchased: string;
  quantityAssigned: string;
  quantityUsed: string;
  unitCost: string;
  monthlyCost: string;
  quarterlyCost: string;
  annualCost: string;
  usageCost: string;
  upfrontCost: string;
  oneOffCost: string;
  optionalCost: string;
  priceIncrease: string;
  contractStart: string;
  contractEnd: string;
  renewalDate: string;
  noticePeriod: string;
  cancellationDeadline: string;
  warrantyEnd: string;
  endOfSupport: string;
  endOfLife: string;
  replacementDate: string;
  outcome: (typeof SERVICE_OUTCOMES)[number] | "";
  notes: string;
}

export function createServiceRow(): ServiceRow {
  return {
    id: `svc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: "", category: "MSP / support", description: "", supplier: "", vendor: "", product: "", owner: "",
    criticality: "", scale: "", licence: "", quantityPurchased: "", quantityAssigned: "", quantityUsed: "",
    unitCost: "", monthlyCost: "", quarterlyCost: "", annualCost: "", usageCost: "", upfrontCost: "",
    oneOffCost: "", optionalCost: "", priceIncrease: "", contractStart: "", contractEnd: "", renewalDate: "",
    noticePeriod: "", cancellationDeadline: "", warrantyEnd: "", endOfSupport: "", endOfLife: "",
    replacementDate: "", outcome: "", notes: "",
  };
}

const num = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function termYears(row: ServiceRow): number {
  const start = Date.parse(row.contractStart);
  const end = Date.parse(row.contractEnd);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return (end - start) / (365.25 * 24 * 3600 * 1000);
}

export interface ServiceCosts {
  monthlyRecurring: number;
  annualRecurring: number;
  usage: number;
  upfront: number;
  oneOff: number;
  optional: number;
  firstYear: number;
  threeYear: number;
  contractValue: number;
  unusedLicenceCost: number;
}

export function serviceCosts(row: ServiceRow): ServiceCosts {
  const annualRecurring = num(row.monthlyCost) * 12 + num(row.quarterlyCost) * 4 + num(row.annualCost);
  const usage = num(row.usageCost);
  const optional = num(row.optionalCost);
  const upfront = num(row.upfrontCost);
  const oneOff = num(row.oneOffCost);
  const uplift = 1 + num(row.priceIncrease) / 100;
  const yearly = annualRecurring + usage + optional;
  const firstYear = yearly + upfront + oneOff;
  const threeYear = yearly * (1 + uplift + uplift ** 2) + upfront + oneOff;
  const years = termYears(row);
  const unused = Math.max(0, num(row.quantityPurchased) - num(row.quantityUsed));
  return {
    monthlyRecurring: annualRecurring / 12,
    annualRecurring,
    usage,
    upfront,
    oneOff,
    optional,
    firstYear,
    threeYear,
    contractValue: yearly * years + upfront + oneOff,
    unusedLicenceCost: row.quantityPurchased ? unused * num(row.unitCost) * 12 : 0,
  };
}

const DAY = 24 * 3600 * 1000;

export interface CommercialSummary {
  byCategory: Array<{ category: string; annual: number; monthly: number; count: number }>;
  totals: ServiceCosts;
  unusedLicences: ServiceRow[];
  duplicates: string[];
  unknownCosts: ServiceRow[];
  unknownRenewals: ServiceRow[];
  renewingSoon: ServiceRow[];
  endOfSupport: ServiceRow[];
}

export function summariseServices(rows: ServiceRow[], now = Date.now()): CommercialSummary {
  const filled = rows.filter((row) => row.name.trim() || row.product.trim());
  const costs = filled.map((row) => [row, serviceCosts(row)] as const);
  const totals = costs.reduce<ServiceCosts>((sum, [, cost]) => ({
    monthlyRecurring: sum.monthlyRecurring + cost.monthlyRecurring,
    annualRecurring: sum.annualRecurring + cost.annualRecurring,
    usage: sum.usage + cost.usage,
    upfront: sum.upfront + cost.upfront,
    oneOff: sum.oneOff + cost.oneOff,
    optional: sum.optional + cost.optional,
    firstYear: sum.firstYear + cost.firstYear,
    threeYear: sum.threeYear + cost.threeYear,
    contractValue: sum.contractValue + cost.contractValue,
    unusedLicenceCost: sum.unusedLicenceCost + cost.unusedLicenceCost,
  }), { monthlyRecurring: 0, annualRecurring: 0, usage: 0, upfront: 0, oneOff: 0, optional: 0, firstYear: 0, threeYear: 0, contractValue: 0, unusedLicenceCost: 0 });
  const byCategory = SERVICE_CATEGORIES.map((category) => {
    const inCategory = costs.filter(([row]) => row.category === category);
    const annual = inCategory.reduce((sum, [, cost]) => sum + cost.annualRecurring, 0);
    return { category, annual, monthly: annual / 12, count: inCategory.length };
  });
  const seen = new Map<string, number>();
  for (const row of filled) {
    const key = (row.product || row.name).trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const renewal = (row: ServiceRow) => Date.parse(row.renewalDate || row.contractEnd);
  return {
    byCategory,
    totals,
    unusedLicences: costs.filter(([, cost]) => cost.unusedLicenceCost > 0).map(([row]) => row),
    duplicates: [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key),
    unknownCosts: costs.filter(([, cost]) => cost.firstYear === 0).map(([row]) => row),
    unknownRenewals: filled.filter((row) => Number.isNaN(renewal(row))),
    renewingSoon: filled.filter((row) => {
      const date = renewal(row);
      return !Number.isNaN(date) && date >= now - DAY && date <= now + 180 * DAY;
    }),
    endOfSupport: filled.filter((row) => {
      const date = Date.parse(row.endOfSupport);
      return !Number.isNaN(date) && date <= now + 365 * DAY;
    }),
  };
}

export const formatGbp = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
