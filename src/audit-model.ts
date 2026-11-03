export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "date";
export type AssetCategorySlug = "data-infra" | "network" | "client-compute" | "software" | "cyber";

export interface SelectOption {
  value: string;
  label: string;
}

export interface AssetFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly SelectOption[];
  matchKeywords: string[];
  required?: boolean;
}

export interface AssetCategoryConfig {
  slug: AssetCategorySlug;
  label: string;
  titleField: string;
  fields: AssetFieldConfig[];
}

export interface AuditRow {
  id: string;
  auditCategory: AssetCategorySlug;
  sectionTitle: string | null;
  flagged: boolean;
  flagReasons: string[];
  warnReasons: string[];
  [key: string]: unknown;
}

export interface AuditContact {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface HighLevelInfo {
  schoolTrustName: string;
  siteName: string;
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  county: string;
  postcode: string;
  auditDate: string;
  auditor: string;
  staffCount: string;
  studentCount: string;
  deviceCount: string;
  contacts: AuditContact[];
}

export interface SheetImportSummary {
  sheetName: string;
  sectionTitle: string | null;
  matchedCategory: AssetCategorySlug | null;
  rowsImported: number;
  rowsSkipped: number;
}

export interface BrowserAudit {
  highLevel: HighLevelInfo;
  rows: AuditRow[];
  sheets: SheetImportSummary[];
}

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETE", label: "Complete" },
  { value: "BLOCKED", label: "Expired" },
  { value: "NA", label: "N/A" },
] as const;

const SUPPORT_STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "Active" },
  { value: "BLOCKED", label: "Expired" },
  { value: "NA", label: "N/A" },
] as const;

const WARRANTY_STATUS_OPTIONS = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "IN_WARRANTY", label: "In Warranty" },
  { value: "EXPIRED", label: "Expired" },
  { value: "VENDOR_SUPPORT", label: "Limited / Lifetime Warranty" },
  { value: "END_OF_SUPPORT", label: "End of Support" },
  { value: "END_OF_SERVICE_LIFE", label: "End of Service Life" },
] as const;

const CRITICALITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

const RISK_RATING_OPTIONS = [...CRITICALITY_OPTIONS, { value: "NA", label: "N/A" }] as const;

const PHYSICAL_VIRTUAL_OPTIONS = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "VIRTUAL", label: "Virtual" },
] as const;

const DEPLOYMENT_MODEL_OPTIONS = [
  { value: "CLOUD", label: "Cloud" },
  { value: "ON_PREM", label: "On-Prem" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

const NETWORK_ASSET_TYPE_OPTIONS = [
  { value: "CORE_SWITCH", label: "Core Switch" },
  { value: "EDGE_SWITCH", label: "Edge Switch" },
  { value: "FIREWALL", label: "Firewall" },
  { value: "WIFI_AP", label: "Wi-Fi AP" },
] as const;

const COST_FIELDS: AssetFieldConfig[] = [
  { key: "currentHardwareCost", label: "Current Hardware Cost (£)", type: "number", matchKeywords: ["hardware cost", "capex hardware"] },
  { key: "currentSoftwareCost", label: "Current Software Cost (£)", type: "number", matchKeywords: ["software cost", "capex software", "licence cost"] },
  { key: "currentSupportCost", label: "Current Support Cost (£)", type: "number", matchKeywords: ["support cost", "maintenance cost", "capex support"] },
  { key: "currentMonthlyCost", label: "Current Monthly Cost (£)", type: "number", matchKeywords: ["monthly cost", "recurring cost", "opex"] },
  { key: "currentQuantity", label: "Quantity", type: "number", matchKeywords: ["quantity", "qty"] },
  { key: "newHardwareCost", label: "New Hardware Cost (£)", type: "number", matchKeywords: ["new hardware cost", "replacement hardware cost"] },
  { key: "newSoftwareCost", label: "New Software Cost (£)", type: "number", matchKeywords: ["new software cost", "replacement software cost"] },
  { key: "newSupportCost", label: "New Support Cost (£)", type: "number", matchKeywords: ["new support cost", "replacement support cost"] },
  { key: "newMonthlyCost", label: "New Monthly Cost (£)", type: "number", matchKeywords: ["new monthly cost", "replacement monthly cost"] },
  { key: "newQuantity", label: "New Quantity", type: "number", matchKeywords: ["new quantity", "replacement quantity"] },
];

export const ASSET_CATEGORIES: Record<AssetCategorySlug, AssetCategoryConfig> = {
  "data-infra": {
    slug: "data-infra",
    label: "Data Infrastructure",
    titleField: "serverName",
    fields: [
      { key: "assetId", label: "Asset ID", type: "text", matchKeywords: ["asset id", "asset no", "asset tag"] },
      { key: "serverName", label: "Server Name", type: "text", required: true, matchKeywords: ["server name", "hostname", "server"] },
      { key: "physicalVirtual", label: "Physical/Virtual", type: "select", options: PHYSICAL_VIRTUAL_OPTIONS, matchKeywords: ["physical", "virtual", "physical virtual"] },
      { key: "manufacturer", label: "Manufacturer", type: "text", matchKeywords: ["manufacturer", "make", "vendor"] },
      { key: "model", label: "Model", type: "text", matchKeywords: ["model"] },
      { key: "serialNumber", label: "Serial Number", type: "text", matchKeywords: ["serial", "s n"] },
      { key: "osHypervisor", label: "OS/Hypervisor", type: "text", matchKeywords: ["os", "hypervisor", "operating system"] },
      { key: "roleWorkload", label: "Role/Workload", type: "text", matchKeywords: ["role", "workload", "function"] },
      { key: "capacityTb", label: "Capacity TB", type: "number", matchKeywords: ["capacity tb", "capacity"] },
      { key: "usedTb", label: "Used TB", type: "number", matchKeywords: ["used tb", "used"] },
      { key: "location", label: "Location/Host", type: "text", matchKeywords: ["location", "host", "site"] },
      { key: "warrantyStatus", label: "Warranty Status", type: "select", options: WARRANTY_STATUS_OPTIONS, matchKeywords: ["warranty status"] },
      { key: "warrantyExpiry", label: "Warranty Expiry", type: "date", matchKeywords: ["warranty expiry", "warranty end", "warranty date"] },
      { key: "endOfSupport", label: "End of Support", type: "date", matchKeywords: ["end of support", "eos"] },
      { key: "endOfServiceLife", label: "End of Service Life", type: "date", matchKeywords: ["end of service life", "eosl"] },
      ...COST_FIELDS,
    ],
  },
  network: {
    slug: "network",
    label: "Network & WiFi",
    titleField: "name",
    fields: [
      { key: "assetId", label: "Asset ID", type: "text", matchKeywords: ["asset id", "asset no", "asset tag"] },
      { key: "assetType", label: "Type", type: "select", options: NETWORK_ASSET_TYPE_OPTIONS, matchKeywords: ["type", "device type", "asset type"] },
      { key: "name", label: "Name", type: "text", required: true, matchKeywords: ["name", "device name", "hostname", "switch name", "firewall name", "ap name"] },
      { key: "manufacturer", label: "Manufacturer", type: "text", matchKeywords: ["manufacturer", "make", "vendor"] },
      { key: "model", label: "Model", type: "text", matchKeywords: ["model"] },
      { key: "serialNumber", label: "Serial Number", type: "text", matchKeywords: ["serial", "s n"] },
      { key: "firmwareVersion", label: "Firmware Version", type: "text", matchKeywords: ["firmware"] },
      { key: "wifiStandard", label: "Wi-Fi Standard", type: "text", matchKeywords: ["wi fi standard", "wifi standard", "wireless standard", "802 11 standard"] },
      { key: "portCount", label: "Port Count", type: "number", matchKeywords: ["port count", "ports"] },
      { key: "poe", label: "PoE?", type: "boolean", matchKeywords: ["poe"] },
      { key: "location", label: "Location", type: "text", matchKeywords: ["location", "site"] },
      { key: "warrantyStatus", label: "Warranty Status", type: "select", options: WARRANTY_STATUS_OPTIONS, matchKeywords: ["warranty status"] },
      { key: "warrantyExpiry", label: "Warranty Expiry", type: "date", matchKeywords: ["warranty expiry", "warranty end"] },
      { key: "endOfSupport", label: "End of Support", type: "date", matchKeywords: ["end of support", "eos"] },
      { key: "endOfServiceLife", label: "End of Service Life", type: "date", matchKeywords: ["end of service life", "eosl"] },
      ...COST_FIELDS,
    ],
  },
  "client-compute": {
    slug: "client-compute",
    label: "Client Compute",
    titleField: "deviceCategory",
    fields: [
      { key: "deviceCategory", label: "Device Category", type: "text", required: true, matchKeywords: ["device category", "category", "device type"] },
      { key: "manufacturer", label: "Manufacturer", type: "text", matchKeywords: ["manufacturer", "make", "vendor"] },
      { key: "model", label: "Model", type: "text", matchKeywords: ["model"] },
      { key: "operatingSystem", label: "Operating System", type: "text", matchKeywords: ["operating system", "os"] },
      { key: "quantity", label: "Quantity", type: "number", matchKeywords: ["quantity", "qty"] },
      { key: "ownerDepartment", label: "Owner/Department", type: "text", matchKeywords: ["owner", "department"] },
      { key: "location", label: "Location", type: "text", matchKeywords: ["location", "site"] },
      { key: "assetTag", label: "Asset Tag", type: "text", matchKeywords: ["asset tag", "asset id", "asset tag range"] },
      { key: "serialNumber", label: "Serial Number", type: "text", matchKeywords: ["serial", "s n", "serial number range"] },
      { key: "warrantyStatus", label: "Warranty Status", type: "select", options: WARRANTY_STATUS_OPTIONS, matchKeywords: ["warranty status"] },
      { key: "warrantyExpiry", label: "Warranty Expiry", type: "date", matchKeywords: ["warranty expiry", "warranty end"] },
      { key: "endOfSupport", label: "End of Support", type: "date", matchKeywords: ["end of support", "eos"] },
      { key: "endOfServiceLife", label: "End of Service Life", type: "date", matchKeywords: ["end of service life", "eosl"] },
      { key: "replacementPriority", label: "Replacement Priority", type: "select", options: CRITICALITY_OPTIONS, matchKeywords: ["replacement priority", "priority"] },
      ...COST_FIELDS.filter((field) => field.key !== "currentQuantity"),
      { key: "notes", label: "Notes", type: "textarea", matchKeywords: ["notes", "comments"] },
    ],
  },
  software: {
    slug: "software",
    label: "Software",
    titleField: "softwareSystem",
    fields: [
      { key: "softwareSystem", label: "Software/System", type: "text", required: true, matchKeywords: ["software", "system", "application"] },
      { key: "category", label: "Category", type: "text", matchKeywords: ["category"] },
      { key: "supplier", label: "Supplier", type: "text", matchKeywords: ["supplier", "vendor"] },
      { key: "purpose", label: "Purpose", type: "text", matchKeywords: ["purpose", "description"] },
      { key: "deploymentModel", label: "Cloud/On-Prem/Hybrid", type: "select", options: DEPLOYMENT_MODEL_OPTIONS, matchKeywords: ["cloud", "on prem", "deployment", "hosting"] },
      { key: "usersLicences", label: "Users/Licences", type: "text", matchKeywords: ["users", "licences", "licenses"] },
      { key: "owner", label: "Owner", type: "text", matchKeywords: ["owner"] },
      { key: "contractRenewalDate", label: "Contract/Renewal Date", type: "date", matchKeywords: ["renewal", "contract date", "expiry"] },
      { key: "supportStatus", label: "Support Status", type: "select", options: SUPPORT_STATUS_OPTIONS, matchKeywords: ["support status", "status"] },
      ...COST_FIELDS,
      { key: "dataHeld", label: "Data Held", type: "textarea", matchKeywords: ["data held", "data"] },
      { key: "integrationNotes", label: "Integration Notes", type: "textarea", matchKeywords: ["integration"] },
      { key: "risksActions", label: "Risks/Actions", type: "textarea", matchKeywords: ["risks", "actions"] },
    ],
  },
  cyber: {
    slug: "cyber",
    label: "Cyber Security Controls",
    titleField: "controlArea",
    fields: [
      { key: "controlArea", label: "Control Area", type: "text", required: true, matchKeywords: ["control area", "control", "area"] },
      { key: "partOfBrilliantBasics", label: "Part of Brilliant Basics?", type: "boolean", matchKeywords: ["part of brilliant basics", "brilliant basics", "basic control"] },
      { key: "installed", label: "Installed", type: "boolean", matchKeywords: ["installed", "implemented", "in use", "in place", "yes no", "deployed", "operational"] },
      { key: "solutionSupplier", label: "Solution/Supplier", type: "text", matchKeywords: ["solution", "supplier"] },
      { key: "coverage", label: "Coverage", type: "text", matchKeywords: ["coverage"] },
      { key: "mfaEnabled", label: "MFA Enabled?", type: "boolean", matchKeywords: ["mfa"] },
      { key: "adminOwner", label: "Admin Owner", type: "text", matchKeywords: ["admin owner", "owner"] },
      { key: "lastTestedReviewed", label: "Last Tested/Reviewed", type: "date", matchKeywords: ["last tested", "reviewed"] },
      { key: "renewalExpiryDate", label: "Renewal/Expiry Date", type: "date", matchKeywords: ["renewal", "expiry"] },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS, matchKeywords: ["status"] },
      { key: "riskRating", label: "Risk Rating", type: "select", options: RISK_RATING_OPTIONS, matchKeywords: ["risk rating", "risk"] },
      ...COST_FIELDS,
      { key: "evidenceNotes", label: "Evidence/Notes", type: "textarea", matchKeywords: ["evidence", "notes"] },
      { key: "actionsRequired", label: "Actions Required", type: "textarea", matchKeywords: ["actions required", "actions"] },
    ],
  },
};

export const ASSET_CATEGORY_SLUGS: AssetCategorySlug[] = ["data-infra", "network", "client-compute", "software", "cyber"];

const EMPTY_HIGH_LEVEL: HighLevelInfo = {
  schoolTrustName: "",
  siteName: "",
  addressLine1: "",
  addressLine2: "",
  townCity: "",
  county: "",
  postcode: "",
  auditDate: "",
  auditor: "",
  staffCount: "",
  studentCount: "",
  deviceCount: "",
  contacts: [],
};

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[_/–—-]/g, " ").replace(/\s+/g, " ").trim();
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || text(value) === "";
}

function isHeaderSpacer(value: unknown): boolean {
  const normalized = normalize(value);
  return !normalized || /^unnamed:?\s*\d*$/.test(normalized) || /^column\d+$/.test(normalized);
}

function looksLikeHeaderCell(value: unknown): boolean {
  const cell = text(value);
  if (!cell) return true;
  return cell.length <= 40 && !/[.!?]\s/.test(cell) && cell.split(/\s+/).length <= 6;
}

function headerMatchesKeyword(header: string, keyword: string): boolean {
  const escaped = normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(normalize(header));
}

function scoreCategory(headers: string[], slug: AssetCategorySlug): number {
  return ASSET_CATEGORIES[slug].fields.filter((field) =>
    field.matchKeywords.some((keyword) => headers.some((header) => headerMatchesKeyword(header, keyword))),
  ).length;
}

const SHEET_CATEGORY_MATCHERS: Array<{ match: RegExp; slug: AssetCategorySlug }> = [
  { match: /data infrastructure/i, slug: "data-infra" },
  { match: /network.*wifi|wifi.*network|network & wifi/i, slug: "network" },
  { match: /client compute/i, slug: "client-compute" },
  { match: /software/i, slug: "software" },
  { match: /cyber/i, slug: "cyber" },
];

function categoryForSheet(sheetName: string): AssetCategorySlug | null {
  return SHEET_CATEGORY_MATCHERS.find((entry) => entry.match.test(sheetName))?.slug ?? null;
}

interface HeaderSegment {
  startCol: number;
  headers: string[];
}

interface Section {
  sheetName: string;
  sectionTitle: string | null;
  category: AssetCategorySlug;
  startCol: number;
  headers: string[];
  fieldMap: Record<number, string>;
  rows: unknown[][];
}

function splitSegments(row: unknown[]): HeaderSegment[] {
  const segments: HeaderSegment[] = [];
  let start = -1;
  let headers: string[] = [];
  for (let column = 0; column < row.length; column += 1) {
    if (isHeaderSpacer(row[column])) {
      if (headers.length > 0) segments.push({ startCol: start, headers });
      start = -1;
      headers = [];
      continue;
    }
    if (start === -1) start = column;
    headers.push(text(row[column]));
  }
  if (headers.length > 0) segments.push({ startCol: start, headers });
  return segments;
}

function fieldMapFor(headers: string[], category: AssetCategorySlug): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((header, index) => {
    let best: { key: string; length: number } | null = null;
    for (const field of ASSET_CATEGORIES[category].fields) {
      for (const keyword of field.matchKeywords) {
        if (headerMatchesKeyword(header, keyword) && normalize(keyword).length > (best?.length ?? 0)) {
          best = { key: field.key, length: normalize(keyword).length };
        }
      }
    }
    if (best) map[index] = best.key;
  });
  return map;
}

function detectHeaderSegments(
  sheetName: string,
  row: unknown[],
  titleSegments: HeaderSegment[],
  category: AssetCategorySlug,
): Section[] {
  const sections: Section[] = [];
  for (const segment of splitSegments(row)) {
    if (!segment.headers.every(looksLikeHeaderCell)) continue;
    const score = scoreCategory(segment.headers, category);
    if (score < Math.max(3, Math.ceil(segment.headers.length * 0.6))) continue;
    const end = segment.startCol + segment.headers.length;
    const title = titleSegments.find((candidate) => candidate.startCol >= segment.startCol && candidate.startCol < end);
    sections.push({
      sheetName,
      sectionTitle: title?.headers[0] ?? (titleSegments.length === 1 ? titleSegments[0].headers[0] : null),
      category,
      startCol: segment.startCol,
      headers: segment.headers,
      fieldMap: fieldMapFor(segment.headers, category),
      rows: [],
    });
  }
  return sections;
}

function parseSections(sheetName: string, grid: unknown[][]): Section[] {
  const category = categoryForSheet(sheetName);
  if (!category) return [];
  const sections: Section[] = [];
  let active: Section[] = [];
  let titles: HeaderSegment[] = [];

  for (const row of grid) {
    if (row.every(isBlank)) continue;
    const detected = detectHeaderSegments(sheetName, row, titles, category);
    if (detected.length > 0) {
      sections.push(...detected);
      active = detected;
      continue;
    }

    const segments = splitSegments(row);
    if (
      category === "client-compute" &&
      active.length > 0 &&
      segments.length === 1 &&
      segments[0].startCol === 0 &&
      /^(managed|unmanaged)$/.test(normalize(segments[0].headers[0]))
    ) {
      continue;
    }
    if (segments.length > 0 && segments.every((segment) => segment.headers.length === 1)) {
      titles = segments;
      active = [];
      continue;
    }
    for (const section of active) {
      const slice = row.slice(section.startCol, section.startCol + section.headers.length);
      if (!slice.every(isBlank)) section.rows.push(slice);
    }
  }
  return sections;
}

function parseBoolean(value: unknown): boolean | null {
  const normalized = normalize(value);
  if (!normalized || normalized === "partial" || normalized.includes("being implemented") || normalized === "unknown") return null;
  if (/^(yes|y|true|1|complete|implemented)/.test(normalized)) return true;
  if (/^(no|n|false|0|none|not installed|n a)/.test(normalized)) return false;
  return null;
}

function dateValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = text(value);
  if (!raw) return "";
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function numberValue(value: unknown): number | "" {
  if (isBlank(value)) return "";
  const parsed = Number(text(value).replace(/[£,$]/g, ""));
  return Number.isFinite(parsed) ? parsed : "";
}

function optionValue(value: unknown, options: readonly SelectOption[]): string {
  const normalized = normalize(value);
  if (!normalized) return "";
  const exact = options.find((option) => normalize(option.value) === normalized || normalize(option.label) === normalized);
  if (exact) return exact.value;
  if (options === WARRANTY_STATUS_OPTIONS) {
    if (normalized.includes("expired")) return "EXPIRED";
    if (normalized.includes("lifetime") || normalized.includes("limited")) return "VENDOR_SUPPORT";
    if (normalized.includes("end of service")) return "END_OF_SERVICE_LIFE";
    if (normalized.includes("end of support")) return "END_OF_SUPPORT";
    if (normalized.includes("active") || normalized.includes("warranty")) return "IN_WARRANTY";
    return "UNKNOWN";
  }
  if (options === STATUS_OPTIONS) {
    if (normalized.includes("complete")) return "COMPLETE";
    if (normalized.includes("progress") || normalized.includes("partial")) return "IN_PROGRESS";
    if (normalized.includes("expired") || normalized.includes("blocked")) return "BLOCKED";
    if (normalized === "n a") return "NA";
    return "NOT_STARTED";
  }
  if (options === SUPPORT_STATUS_OPTIONS) {
    if (normalized.includes("active") || normalized.includes("complete")) return "IN_PROGRESS";
    if (normalized.includes("expired") || normalized.includes("blocked")) return "BLOCKED";
    return "NA";
  }
  if (options === PHYSICAL_VIRTUAL_OPTIONS) return normalized.includes("virtual") ? "VIRTUAL" : "PHYSICAL";
  if (options === DEPLOYMENT_MODEL_OPTIONS) {
    if (normalized.includes("hybrid")) return "HYBRID";
    if (normalized.includes("on prem")) return "ON_PREM";
    return "CLOUD";
  }
  return options.find((option) => normalized.includes(normalize(option.label)))?.value ?? text(value).toUpperCase().replace(/\W+/g, "_");
}

function networkTypeFromTitle(title: string | null): string {
  const normalized = normalize(title);
  if (normalized.includes("core")) return "CORE_SWITCH";
  if (normalized.includes("edge")) return "EDGE_SWITCH";
  if (normalized.includes("firewall")) return "FIREWALL";
  if (normalized.includes("wifi") || normalized.includes("wi fi") || normalized.includes("access point")) return "WIFI_AP";
  return "";
}

function prepareField(field: AssetFieldConfig, value: unknown): unknown {
  if (field.type === "boolean") return parseBoolean(value);
  if (field.type === "number") return numberValue(value);
  if (field.type === "date") return dateValue(value);
  if (field.type === "select") return optionValue(value, field.options ?? []);
  return text(value);
}

function buildRow(section: Section, values: unknown[], index: number): AuditRow | null {
  const config = ASSET_CATEGORIES[section.category];
  const row: AuditRow = {
    id: crypto.randomUUID(),
    auditCategory: section.category,
    sectionTitle: section.sectionTitle,
    flagged: false,
    flagReasons: [],
    warnReasons: [],
  };
  for (const [column, key] of Object.entries(section.fieldMap)) {
    const field = config.fields.find((candidate) => candidate.key === key);
    if (field) row[key] = prepareField(field, values[Number(column)]);
  }
  const meaningful = config.fields.some((field) => !isBlank(row[field.key]));
  if (!meaningful) return null;

  if (section.category === "data-infra") {
    if (!text(row.serverName)) row.serverName = text(row.roleWorkload) || text(row.model) || text(row.serialNumber) || section.sectionTitle || `Imported item ${index + 1}`;
    if (!text(row.roleWorkload) && section.sectionTitle) row.roleWorkload = section.sectionTitle;
    row.sourceSection = section.sectionTitle;
    const identityKeys = ["assetId", "serverName", "physicalVirtual", "manufacturer", "model", "serialNumber", "osHypervisor", "roleWorkload", "capacityTb", "usedTb", "location", "warrantyStatus", "warrantyExpiry"];
    if (!identityKeys.some((key) => !isBlank(row[key])) && [row.endOfSupport, row.endOfServiceLife].some((value) => !isBlank(value))) return null;
  }
  if (section.category === "network") {
    row.assetType = networkTypeFromTitle(section.sectionTitle) || row.assetType || "";
    if (!text(row.name)) row.name = text(row.model) || text(row.serialNumber) || section.sectionTitle || `Imported item ${index + 1}`;
  }
  if (section.category === "cyber") {
    if (row.installed === null && row.status === "COMPLETE") row.installed = true;
    if (row.installed === null && ["BLOCKED", "NOT_STARTED"].includes(text(row.status))) row.installed = false;
    if (row.installed === null && text(row.solutionSupplier) && !/^(n\/a|no|none)$/i.test(text(row.solutionSupplier))) row.installed = true;
  }
  if (!text(row[config.titleField])) row[config.titleField] = `Imported item ${index + 1}`;
  return row;
}

function parseHighLevel(grid: unknown[][]): HighLevelInfo {
  const find = (label: string) => grid.find((row) => normalize(row[0]) === normalize(label))?.[1];
  const contactHeaderIndex = grid.findIndex((row) => normalize(row[3]) === "role" && normalize(row[4]) === "name");
  const contactTail = contactHeaderIndex >= 0 ? grid.slice(contactHeaderIndex + 1) : [];
  const contactEndIndex = contactTail.findIndex((row) => row.slice(3, 8).every(isBlank));
  const contactRows = contactEndIndex >= 0 ? contactTail.slice(0, contactEndIndex) : contactTail;
  const contacts = contactRows
    .filter((row) => text(row[3]))
    .map((row) => ({
      id: crypto.randomUUID(),
      role: text(row[3]),
      name: text(row[4]),
      email: text(row[5]),
      phone: text(row[6]),
      notes: text(row[7]),
    }))
    .filter((contact) => Object.values(contact).some((value) => value && value !== contact.id));
  return {
    schoolTrustName: text(find("School / Trust Name")),
    siteName: text(find("Site Name")),
    addressLine1: text(find("Site Address Line 1")),
    addressLine2: text(find("Site Address Line 2")),
    townCity: text(find("Town / City")),
    county: text(find("County")),
    postcode: text(find("Postcode")),
    auditDate: dateValue(find("Audit Date")),
    auditor: text(find("Auditor")),
    staffCount: text(find("Number of Staff")),
    studentCount: text(find("Number of Students")),
    deviceCount: text(find("Number of Devices")),
    contacts,
  };
}

function dateState(value: unknown): "past" | "soon" | "future" | "unknown" {
  const raw = normalize(value);
  if (!raw || raw.includes("unknown") || raw.includes("not announced")) return "unknown";
  if (raw.includes("expired")) return "past";
  const parsed = new Date(text(value));
  if (Number.isNaN(parsed.getTime())) return "unknown";
  if (parsed.getTime() < Date.now()) return "past";
  if (parsed.getTime() < Date.now() + 90 * 86400000) return "soon";
  return "future";
}

export function classifyDataInfra(row: AuditRow): "Physical servers" | "Virtual machines" | "SAN switching" | "SAN storage" {
  const section = normalize(row.sourceSection);
  const combined = normalize([row.serverName, row.manufacturer, row.model, row.roleWorkload].join(" "));
  if (/san switch|san switching|fibre channel|fiber channel/.test(section) || /san switch|brocade|fibre channel|fiber channel/.test(combined)) return "SAN switching";
  if (section.includes("san") || /powerstore|powervault|equallogic|unity|nimble|\bmsa\b/.test(combined)) return "SAN storage";
  if (normalize(row.physicalVirtual).includes("virtual") || /virtual machine|\bvm\b/.test(combined)) return "Virtual machines";
  return "Physical servers";
}

export function classifyNetwork(row: AuditRow): string {
  return {
    CORE_SWITCH: "Core switches",
    EDGE_SWITCH: "Edge switches",
    FIREWALL: "Firewalls",
    WIFI_AP: "Wi-Fi access points",
  }[text(row.assetType)] ?? "Other network assets";
}

export function classifyClientCompute(row: AuditRow): string {
  const value = normalize(row.deviceCategory);
  if (value.includes("unmanaged")) return "Unmanaged";
  if (value.includes("chromebook")) return "Chromebooks";
  if (value.includes("ipad")) return "iPads";
  if (value.includes("tablet")) return "Tablets";
  if (value.includes("desktop") || value.includes(" pc")) return "Desktops";
  if (value.includes("managed") && value.includes("laptop")) return "Managed laptops";
  if (value.includes("laptop") || value.includes("notebook")) return "Laptops";
  return "Other client compute";
}

export function assessRows(rows: AuditRow[]): AuditRow[] {
  const coreCount = rows.filter((row) => row.auditCategory === "network" && row.assetType === "CORE_SWITCH").reduce((sum, row) => sum + (Number(row.currentQuantity) || 1), 0);
  const firewallCount = rows.filter((row) => row.auditCategory === "network" && row.assetType === "FIREWALL").reduce((sum, row) => sum + (Number(row.currentQuantity) || 1), 0);

  return rows.map((row) => {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const assessLifecycle = () => {
      if (row.warrantyStatus === "UNKNOWN" && !row.warrantyExpiry) reasons.push("Warranty status unknown");
      if (row.warrantyStatus === "EXPIRED" || dateState(row.warrantyExpiry) === "past") reasons.push("Warranty expired");
      else if (dateState(row.warrantyExpiry) === "soon") warnings.push("Warranty expires within 90 days");
      if (row.warrantyStatus === "END_OF_SUPPORT" || dateState(row.endOfSupport) === "past") reasons.push("End of Support date has passed");
      else if (dateState(row.endOfSupport) === "soon") warnings.push("End of Support within 90 days");
      if (row.warrantyStatus === "END_OF_SERVICE_LIFE" || dateState(row.endOfServiceLife) === "past") reasons.push("End of Service Life date has passed");
      else if (dateState(row.endOfServiceLife) === "soon") warnings.push("End of Service Life within 90 days");
    };

    if (row.auditCategory === "data-infra") {
      if (classifyDataInfra(row) === "Virtual machines") {
        if (/(server\s+(2008|2012)|esxi\s*[67]|vsphere\s*[67]|centos\s*7|debian\s*(10|11))/i.test(text(row.osHypervisor))) {
          reasons.push("Operating system is end-of-life");
        }
      } else {
        assessLifecycle();
      }
    } else if (row.auditCategory === "network") {
      assessLifecycle();
      if (row.assetType === "CORE_SWITCH" && coreCount === 1) reasons.push("Only one core switch listed; resilience should be reviewed");
      if (row.assetType === "FIREWALL" && firewallCount === 1) reasons.push("Only one firewall listed; high availability should be reviewed");
    } else if (row.auditCategory === "client-compute") {
      if (/\bwindows\s*10\b/i.test(text(row.operatingSystem))) reasons.push("Operating system is end-of-life (Windows 10)");
    } else if (row.auditCategory === "cyber") {
      if (row.installed === false) reasons.push("Cyber control not installed");
      else if (row.status === "IN_PROGRESS") reasons.push("Cyber control partially implemented");
      else if (row.installed === null || row.installed === "") warnings.push("Cyber control installation status unconfirmed");
    }
    return { ...row, flagged: reasons.length > 0, flagReasons: reasons, warnReasons: warnings };
  });
}

export function createEmptyRow(category: AssetCategorySlug): AuditRow {
  const config = ASSET_CATEGORIES[category];
  return assessRows([{
    id: crypto.randomUUID(),
    auditCategory: category,
    sectionTitle: null,
    flagged: false,
    flagReasons: [],
    warnReasons: [],
    [config.titleField]: "",
  }])[0];
}

export function createBlankAudit(): BrowserAudit {
  return {
    highLevel: { ...EMPTY_HIGH_LEVEL, contacts: [] },
    rows: [],
    sheets: [],
  };
}

export async function parseAuditWorkbook(buffer: ArrayBuffer): Promise<BrowserAudit> {
  const XLSXModule = await import("xlsx");
  const workbook = XLSXModule.read(buffer, { type: "array", cellDates: true });
  let highLevel: HighLevelInfo = { ...EMPTY_HIGH_LEVEL, contacts: [] };
  const rows: AuditRow[] = [];
  const summaries: SheetImportSummary[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const grid = XLSXModule.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: null, raw: true });
    if (/migration\s*readiness/i.test(sheetName)) continue;
    if (/high\s*level/i.test(sheetName)) {
      highLevel = parseHighLevel(grid);
      summaries.push({ sheetName, sectionTitle: null, matchedCategory: null, rowsImported: 0, rowsSkipped: 0 });
      continue;
    }
    const sections = parseSections(sheetName, grid);
    if (sections.length === 0) {
      summaries.push({ sheetName, sectionTitle: null, matchedCategory: null, rowsImported: 0, rowsSkipped: grid.every((row) => row.every(isBlank)) ? 0 : grid.length });
      continue;
    }
    for (const section of sections) {
      const built = section.rows.map((row, index) => buildRow(section, row, index)).filter((row): row is AuditRow => row !== null);
      rows.push(...built);
      summaries.push({
        sheetName,
        sectionTitle: section.sectionTitle,
        matchedCategory: section.category,
        rowsImported: built.length,
        rowsSkipped: section.rows.length - built.length,
      });
    }
  }

  return { highLevel, rows: assessRows(rows), sheets: summaries };
}

export function displayValue(field: AssetFieldConfig, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "boolean") return value === true ? "Yes" : value === false ? "No" : "Partial / Unknown";
  if (field.type === "select") return field.options?.find((option) => option.value === value)?.label ?? text(value);
  return text(value);
}

export function categoryGroups(category: AssetCategorySlug, rows: AuditRow[]): Array<{ label: string; rows: AuditRow[] }> {
  if (category === "data-infra") {
    return ["Physical servers", "Virtual machines", "SAN switching", "SAN storage"].map((label) => ({ label, rows: rows.filter((row) => classifyDataInfra(row) === label) })).filter((group) => group.rows.length > 0);
  }
  if (category === "network") {
    return ["Core switches", "Edge switches", "Firewalls", "Wi-Fi access points", "Other network assets"].map((label) => ({ label, rows: rows.filter((row) => classifyNetwork(row) === label) })).filter((group) => group.rows.length > 0);
  }
  if (category === "client-compute") {
    return ["Chromebooks", "iPads", "Tablets", "Desktops", "Laptops", "Managed laptops", "Unmanaged", "Other client compute"].map((label) => ({ label, rows: rows.filter((row) => classifyClientCompute(row) === label) })).filter((group) => group.rows.length > 0);
  }
  return [{ label: ASSET_CATEGORIES[category].label, rows }];
}
