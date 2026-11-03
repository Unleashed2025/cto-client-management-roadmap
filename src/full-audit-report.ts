import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_SLUGS,
  categoryGroups,
  displayValue,
  type AssetCategorySlug,
  type AuditRow,
  type BrowserAudit,
  type HighLevelInfo,
} from "./audit-model";
import { downloadBlob } from "./download-file";

const BRAND = {
  navy: [7, 26, 63] as [number, number, number],
  cyan: [0, 212, 255] as [number, number, number],
  purple: [126, 58, 237] as [number, number, number],
  pink: [255, 42, 160] as [number, number, number],
  orange: [248, 140, 34] as [number, number, number],
  slate: [100, 116, 139] as [number, number, number],
  bg: [235, 248, 255] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export const REPORT_STRUCTURE = [
  "Cover",
  "Executive Overview",
  "Executive Summary",
  "CTO Summary",
  "DfE Alignment",
  "High Level Information",
  ...ASSET_CATEGORY_SLUGS.flatMap((slug) => [
    `${ASSET_CATEGORIES[slug].label} — highlights`,
    `${ASSET_CATEGORIES[slug].label} — example flagged items`,
    `${ASSET_CATEGORIES[slug].label} — strategy`,
  ]),
  "Representative Audited Items",
];

const CATEGORY_COLOR: Record<AssetCategorySlug, [number, number, number]> = {
  "data-infra": BRAND.navy,
  network: BRAND.cyan,
  "client-compute": BRAND.purple,
  software: BRAND.purple,
  cyber: BRAND.orange,
};

export interface ReportCategorySummary {
  slug: AssetCategorySlug;
  label: string;
  total: number;
  flagged: number;
  warnings: number;
}

export interface ReportModel {
  clientName: string;
  highLevel: HighLevelInfo;
  categorySummary: ReportCategorySummary[];
  groupSummary: Array<{ category: string; group: string; total: number; flagged: number }>;
  inventorySample: AuditRow[];
  totalRows: number;
  totalFlagged: number;
  populatedSheets: number;
}

export interface CategoryReportSection {
  slug: AssetCategorySlug;
  label: string;
  total: number;
  flagged: number;
  warnings: number;
  groups: Array<{ label: string; total: number; flagged: number }>;
  flaggedThemes: Array<{ label: string; count: number }>;
  flaggedSample: AuditRow[];
  whatThisMeans: string;
  whatIfNothing: string;
  plan3Months: string[];
  plan12Months: string[];
  plan2Years: string[];
}

function text(value: unknown): string {
  return String(value ?? "").trim() || "—";
}

function compact(value: unknown, max = 90): string {
  const valueText = text(value);
  return valueText.length > max ? `${valueText.slice(0, max - 1)}…` : valueText;
}

function balancedSample(rows: AuditRow[], maximum: number, categories = ASSET_CATEGORY_SLUGS): AuditRow[] {
  const buckets = categories.map((category) => rows.filter((row) => row.auditCategory === category));
  const sample: AuditRow[] = [];
  let index = 0;
  while (sample.length < maximum && buckets.some((bucket) => index < bucket.length)) {
    for (const bucket of buckets) {
      if (bucket[index] && sample.length < maximum) sample.push(bucket[index]);
    }
    index += 1;
  }
  return sample;
}

function prioritySample(rows: AuditRow[], maximum: number): AuditRow[] {
  const priority = [...rows]
    .filter((row) => row.flagged || row.warnReasons.length > 0)
    .sort((left, right) => {
      if (left.flagged !== right.flagged) return left.flagged ? -1 : 1;
      const riskOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NA: 0 };
      return (riskOrder[text(right.riskRating) as keyof typeof riskOrder] ?? 0) - (riskOrder[text(left.riskRating) as keyof typeof riskOrder] ?? 0);
    });
  return balancedSample(priority, maximum);
}

function flagTheme(reason: string): string {
  const normalized = reason.toLowerCase();
  if (normalized.includes("operating system")) return "Operating system";
  if (normalized.includes("warranty")) return "Warranty";
  if (normalized.includes("end of support") || normalized.includes("support date")) return "Support life";
  if (normalized.includes("service life")) return "Service life";
  if (normalized.includes("core switch") || normalized.includes("firewall") || normalized.includes("availability") || normalized.includes("resilience")) return "Resilience";
  if (normalized.includes("cyber control") || normalized.includes("installed") || normalized.includes("implemented")) return "Control implementation";
  return "Other flagged condition";
}

function categoryNarrative(slug: AssetCategorySlug, total: number, flagged: number, warnings: number): Pick<CategoryReportSection, "whatThisMeans" | "whatIfNothing" | "plan3Months" | "plan12Months" | "plan2Years"> {
  const position = `${flagged} flagged and ${warnings} warning item${flagged + warnings === 1 ? "" : "s"} from ${total} audited record${total === 1 ? "" : "s"}`;
  switch (slug) {
    case "data-infra":
      return {
        whatThisMeans: `The infrastructure estate has ${position}. Server, virtualisation and storage lifecycle evidence should drive the cloud, support and replacement plan rather than allowing hardware decisions to become reactive.`,
        whatIfNothing: "Unsupported infrastructure, unclear warranty positions and ageing operating systems can turn planned migration work into urgent break/fix activity, increasing outage risk and weakening budget control.",
        plan3Months: ["Validate warranty, support and operating-system evidence for every flagged infrastructure item.", "Confirm service owners and identify quick fixes, temporary mitigations and migration candidates."],
        plan12Months: ["Convert priority remediation into budgeted server, storage or cloud migration projects.", "Move suitable workloads toward SaaS or Azure while keeping retained on-premises services fully supported."],
        plan2Years: ["Operate a cloud-first, evidence-led infrastructure lifecycle with only justified services retained on premises.", "Re-baseline the service catalogue and infrastructure roadmap annually."],
      };
    case "network":
      return {
        whatThisMeans: `The network and Wi-Fi estate has ${position}. Lifecycle, firmware, resilience and wireless-standard evidence should be reviewed together so replacements and configuration improvements are correctly separated.`,
        whatIfNothing: "Known lifecycle gaps or incomplete support evidence can become outages, security exposure or rushed replacement decisions, particularly around firewalls, core switching and wireless coverage.",
        plan3Months: ["Verify warranty, support-life, service-life and firmware evidence for flagged or unknown devices.", "Prioritise internet-facing, core and single-point-of-failure risks."],
        plan12Months: ["Deliver evidence-backed firewall, switching and wireless remediation in planned phases.", "Standardise firmware, resilience and Wi-Fi capability across the estate."],
        plan2Years: ["Maintain a rolling network lifecycle and capacity plan, including Wi-Fi readiness and resilience.", "Re-survey coverage and revalidate support status as part of the annual audit cycle."],
      };
    case "client-compute":
      return {
        whatThisMeans: `The endpoint estate has ${position}. The priority is to keep operating systems supported, records accurate and refresh activity predictable without replacing healthy devices unnecessarily.`,
        whatIfNothing: "Unsupported or poorly recorded devices create hidden patch, reliability and user-experience risk. Delayed action can produce a large refresh backlog and unplanned capital pressure.",
        plan3Months: ["Confirm operating-system and ownership data for flagged or incomplete endpoint records.", "Agree the replacement order for genuinely unsupported devices and protect teaching and operational continuity."],
        plan12Months: ["Complete priority OS and device refresh work through budgeted deployment waves.", "Keep asset records, patching and standard-build controls aligned to the refreshed estate."],
        plan2Years: ["Run a rolling endpoint lifecycle so supported operating systems and standard builds are maintained.", "Review endpoint health annually to prevent another unsupported-device backlog."],
      };
    case "software":
      return {
        whatThisMeans: `The software register has ${position}. Ownership, supplier, support, renewal and overlap information should be kept current so commercial and technical decisions can be made before deadlines.`,
        whatIfNothing: "Unclear ownership and renewal visibility can lead to duplicated spend, surprise renewals, unmanaged applications and rushed migration decisions.",
        plan3Months: ["Confirm owners, renewal dates, support positions and data held for incomplete or flagged systems.", "Review near-term renewals and obvious duplicate tools while there is time to compare options."],
        plan12Months: ["Maintain a rolling contract calendar and consolidate overlapping tools where the business case is clear.", "Resolve support and governance gaps before they become urgent commercial decisions."],
        plan2Years: ["Keep a controlled application estate with named ownership, known data and planned renewals.", "Repeat the consolidation and supplier-risk review as services and requirements change."],
      };
    case "cyber":
      return {
        whatThisMeans: `The cyber-control baseline has ${position}. Missing, partial or weakly evidenced controls should be closed before additional tools are layered onto the environment.`,
        whatIfNothing: "Control gaps and weak evidence can leave the organisation exposed while making assurance difficult to prove. Tool sprawl without disciplined operation can add cost without reducing risk.",
        plan3Months: ["Assign owners and dates to every missing or partial baseline control.", "Evidence MFA, endpoint protection, backup, email security, privileged access and recovery testing."],
        plan12Months: ["Close the highest-risk control gaps and align the evidence set to Cyber Essentials and DfE expectations.", "Establish repeatable testing and reporting for backup, recovery and security operations."],
        plan2Years: ["Maintain an assured, measured cyber baseline with clear control ownership and testing cadence.", "Review tool overlap and mature toward independently validated assurance."],
      };
  }
}

export function buildReportModel(audit: BrowserAudit, clientName: string): ReportModel {
  const categorySummary = ASSET_CATEGORY_SLUGS.map((slug) => {
    const rows = audit.rows.filter((row) => row.auditCategory === slug);
    return {
      slug,
      label: ASSET_CATEGORIES[slug].label,
      total: rows.length,
      flagged: rows.filter((row) => row.flagged).length,
      warnings: rows.filter((row) => !row.flagged && row.warnReasons.length > 0).length,
    };
  });
  const groupSummary = ASSET_CATEGORY_SLUGS.flatMap((slug) => {
    const rows = audit.rows.filter((row) => row.auditCategory === slug);
    return categoryGroups(slug, rows).map((group) => ({
      category: ASSET_CATEGORIES[slug].label,
      group: group.label,
      total: group.rows.length,
      flagged: group.rows.filter((row) => row.flagged).length,
    }));
  });
  const inventoryCategories: AssetCategorySlug[] = ["data-infra", "network", "client-compute"];
  const inventoryRows = audit.rows.filter((row) => inventoryCategories.includes(row.auditCategory));
  return {
    clientName,
    highLevel: audit.highLevel,
    categorySummary,
    groupSummary,
    inventorySample: balancedSample(inventoryRows, 18, inventoryCategories),
    totalRows: audit.rows.length,
    totalFlagged: audit.rows.filter((row) => row.flagged).length,
    populatedSheets: new Set(audit.sheets.filter((sheet) => sheet.rowsImported > 0).map((sheet) => sheet.sheetName)).size,
  };
}

export function buildCategoryReportSections(audit: BrowserAudit): CategoryReportSection[] {
  return ASSET_CATEGORY_SLUGS.map((slug) => {
    const rows = audit.rows.filter((row) => row.auditCategory === slug);
    const flagged = rows.filter((row) => row.flagged).length;
    const warnings = rows.filter((row) => !row.flagged && row.warnReasons.length > 0).length;
    return {
      slug,
      label: ASSET_CATEGORIES[slug].label,
      total: rows.length,
      flagged,
      warnings,
      groups: categoryGroups(slug, rows).map((group) => ({
        label: group.label,
        total: group.rows.length,
        flagged: group.rows.filter((row) => row.flagged).length,
      })),
      flaggedThemes: [...rows.reduce((themes, row) => {
        if (!row.flagged) return themes;
        for (const reason of row.flagReasons) {
          const label = flagTheme(reason);
          if (!themes.has(label)) themes.set(label, new Set<string>());
          themes.get(label)?.add(row.id);
        }
        return themes;
      }, new Map<string, Set<string>>())]
        .map(([label, rowIds]) => ({ label, count: rowIds.size }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
      flaggedSample: prioritySample(rows.filter((row) => row.flagged), 12),
      ...categoryNarrative(slug, rows.length, flagged, warnings),
    };
  });
}

function profileRows(info: HighLevelInfo): string[][] {
  return [
    ["School / Trust", info.schoolTrustName || "—", "Site", info.siteName || "—"],
    ["Address", [info.addressLine1, info.addressLine2, info.townCity, info.county, info.postcode].filter(Boolean).join(", ") || "—", "Audit date", info.auditDate || "—"],
    ["Auditor", info.auditor || "—", "Staff / Students / Devices", [info.staffCount, info.studentCount, info.deviceCount].map((value) => value || "—").join(" / ")],
    ["Primary contact", info.contacts[0]?.name || "—", "Contact details", [info.contacts[0]?.email, info.contacts[0]?.phone].filter(Boolean).join(" · ") || "—"],
  ];
}

function inventorySampleRow(row: AuditRow): string[] {
  const config = ASSET_CATEGORIES[row.auditCategory];
  const detail =
    row.auditCategory === "data-infra"
      ? [row.manufacturer, row.model, row.osHypervisor, row.roleWorkload]
      : row.auditCategory === "network"
        ? [displayValue(config.fields.find((field) => field.key === "assetType")!, row.assetType), row.manufacturer, row.model, row.location]
        : [row.manufacturer, row.model, row.operatingSystem, row.location];
  return [
    config.label,
    compact(row[config.titleField], 42),
    compact(row.sectionTitle, 34),
    compact(detail.filter(Boolean).join(" · "), 80),
    compact(row.warrantyStatus ?? row.replacementPriority ?? row.status, 28),
  ];
}

function flaggedSampleRow(row: AuditRow): string[] {
  const config = ASSET_CATEGORIES[row.auditCategory];
  return [
    compact(row[config.titleField], 40),
    compact(row.sectionTitle, 30),
    compact(row.status ?? row.warrantyStatus ?? row.supportStatus, 24),
    compact(row.riskRating ?? row.replacementPriority, 18),
    compact(row.flagReasons.join("; ") || row.warnReasons.join("; "), 100),
    compact(row.remediationRequired ?? row.actionsRequired ?? row.risksActions ?? row.notes, 90),
  ];
}

export async function exportFullAuditReport(audit: BrowserAudit, clientName: string) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
  const model = buildReportModel(audit, clientName);
  const categorySections = buildCategoryReportSections(audit);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let pageNumber = 1;
  let logoDataUrl: string | null = null;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}unleashed-logo-white.png`);
    if (!response.ok) throw new Error(`Logo returned ${response.status}`);
    const blob = await response.blob();
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Unable to load report logo", error);
  }

  const drawLogo = (x: number, y: number, width: number) => {
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", x, y, width, width * (397 / 1822));
  };
  const addHeader = (title: string, subtitle: string, color = BRAND.purple) => {
    doc.setFillColor(...BRAND.bg);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setFillColor(...BRAND.navy);
    doc.roundedRect(18, 14, pageWidth - 36, 58, 7, 7, "F");
    doc.setFillColor(...color);
    doc.rect(34, 29, 48, 28, "F");
    doc.setTextColor(...BRAND.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(String(pageNumber).padStart(2, "0"), 58, 47, { align: "center" });
    doc.setTextColor(...BRAND.white);
    doc.setFontSize(18);
    doc.text(title, 96, 43, { maxWidth: pageWidth - 390 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(216, 243, 255);
    doc.text(subtitle, 96, 58, { maxWidth: pageWidth - 390 });
    drawLogo(pageWidth - 242, 27, 190);
    doc.setFillColor(...BRAND.cyan);
    doc.rect(18, 72, (pageWidth - 36) / 3, 4, "F");
    doc.setFillColor(...BRAND.purple);
    doc.rect(18 + (pageWidth - 36) / 3, 72, (pageWidth - 36) / 3, 4, "F");
    doc.setFillColor(...BRAND.pink);
    doc.rect(18 + ((pageWidth - 36) / 3) * 2, 72, (pageWidth - 36) / 3, 4, "F");
  };
  const newPage = (title: string, subtitle: string, color?: [number, number, number]) => {
    doc.addPage();
    pageNumber += 1;
    addHeader(title, subtitle, color);
    return 106;
  };
  const lastTableY = () => {
    const tableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
    return tableDoc.lastAutoTable?.finalY ?? 110;
  };
  const addBlankPanel = (title: string, prompt: string, color: [number, number, number]) => {
    const y = newPage(title, `${clientName} · manual completion section`, color);
    doc.setFillColor(...BRAND.white);
    doc.setDrawColor(180, 198, 218);
    doc.roundedRect(margin, y, pageWidth - margin * 2, pageHeight - y - margin, 12, 12, "FD");
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(prompt, margin + 22, y + 32);
    doc.setTextColor(...BRAND.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Blank writing space for manual completion. No narrative has been auto-generated.", margin + 22, y + 54);
    doc.setDrawColor(217, 231, 245);
    for (let lineY = y + 92; lineY < pageHeight - margin - 12; lineY += 32) {
      doc.line(margin + 22, lineY, pageWidth - margin - 22, lineY);
    }
  };
  const drawStrategyCard = (
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    body: string | string[],
    fill: [number, number, number],
    dark = false,
  ) => {
    doc.setFillColor(...fill);
    doc.setDrawColor(217, 231, 245);
    doc.roundedRect(x, y, width, height, 12, 12, dark ? "F" : "FD");
    doc.setTextColor(...(dark ? BRAND.white : BRAND.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, x + 18, y + 27);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.7);
    const content = Array.isArray(body) ? body.map((item) => `- ${item}`).join("\n") : body;
    doc.text(doc.splitTextToSize(content, width - 36), x + 18, y + 49, { lineHeightFactor: 1.25 });
  };

  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(10, 92, 174);
  doc.ellipse(pageWidth - 100, -12, 118, 118, "F");
  doc.setFillColor(...BRAND.pink);
  doc.ellipse(55, pageHeight + 6, 96, 96, "F");
  drawLogo(pageWidth - 300, 58, 240);
  doc.setFillColor(...BRAND.cyan);
  doc.roundedRect(margin, 92, 164, 28, 5, 5, "F");
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FULL AUDIT REPORT", margin + 82, 110, { align: "center" });
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(31);
  doc.text("Full Lifecycle, Risk & Roadmap Report", margin, 200);
  doc.setFontSize(17);
  doc.text(clientName, margin, 244, { maxWidth: pageWidth - margin * 2 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(216, 243, 255);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB")} · full category report`, margin, 278);
  doc.setTextColor(...BRAND.cyan);
  doc.text("The raw workbook remains the complete item-level audit record.", margin, pageHeight - 40);

  let y = newPage("Executive Overview", `${clientName} · full imported audit scope`, BRAND.navy);
  const kpis = [
    ["Assets tracked", model.totalRows, BRAND.navy],
    ["Flagged items", model.totalFlagged, BRAND.pink],
    ["Categories", model.categorySummary.filter((item) => item.total > 0).length, BRAND.purple],
    ["Populated sheets", model.populatedSheets, BRAND.orange],
  ] as const;
  const tileWidth = (pageWidth - margin * 2 - 48) / 4;
  kpis.forEach(([label, value, color], index) => {
    const x = margin + index * (tileWidth + 16);
    doc.setFillColor(...color);
    doc.roundedRect(x, y, tileWidth, 66, 8, 8, "F");
    doc.setTextColor(...BRAND.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(String(value), x + 12, y + 31);
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x + 12, y + 53);
  });
  y += 82;
  autoTable(doc, {
    startY: y,
    head: [["Category", "Total", "Flagged", "Warnings", "Health"]],
    body: model.categorySummary.map((item) => {
      const ratio = item.total ? item.flagged / item.total : 0;
      return [item.label, item.total, item.flagged, item.warnings, ratio === 0 ? "Healthy" : ratio < 0.3 ? "Watch" : ratio < 0.6 ? "At Risk" : "Critical"];
    }),
    theme: "grid",
    headStyles: { fillColor: BRAND.navy, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });
  y = lastTableY() + 12;
  autoTable(doc, {
    startY: y,
    head: [["Profile", "Value", "Profile", "Value"]],
    body: profileRows(model.highLevel),
    theme: "grid",
    headStyles: { fillColor: BRAND.purple, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellPadding: 3 },
    margin: { left: margin, right: margin },
  });

  addBlankPanel("Executive Summary", "Executive Summary — complete manually", BRAND.navy);
  addBlankPanel("CTO Summary", "CTO Summary — complete manually", BRAND.purple);
  addBlankPanel("DfE Alignment", "DfE Alignment — complete manually", BRAND.orange);

  y = newPage("High Level Information", `${clientName} · site profile and audit contacts`, BRAND.purple);
  autoTable(doc, {
    startY: y,
    head: [["Profile", "Value", "Profile", "Value"]],
    body: profileRows(model.highLevel),
    theme: "grid",
    headStyles: { fillColor: BRAND.purple, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 4 },
    margin: { left: margin, right: margin },
  });
  y = lastTableY() + 18;
  autoTable(doc, {
    startY: y,
    head: [["Role", "Name", "Email", "Phone", "Notes"]],
    body: model.highLevel.contacts.length > 0
      ? model.highLevel.contacts.map((contact) => [contact.role, contact.name, contact.email, contact.phone, contact.notes])
      : [["No contacts recorded", "—", "—", "—", "Add contacts in High Level Info"]],
    theme: "grid",
    headStyles: { fillColor: BRAND.navy, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellPadding: 4, valign: "top" },
    margin: { left: margin, right: margin },
  });

  for (const section of categorySections) {
    const color = CATEGORY_COLOR[section.slug];
    y = newPage(`${section.label} — highlights`, `${clientName} · ${section.total} audited · ${section.flagged} flagged · ${section.warnings} warnings`, color);
    const metrics = [
      ["Items audited", section.total, color],
      ["Flagged", section.flagged, BRAND.pink],
      ["Warnings", section.warnings, BRAND.orange],
      ["Flag rate", section.total ? `${Math.round((section.flagged / section.total) * 100)}%` : "0%", BRAND.navy],
    ] as const;
    metrics.forEach(([label, value, tileColor], index) => {
      const x = margin + index * (tileWidth + 16);
      doc.setFillColor(...tileColor);
      doc.roundedRect(x, y, tileWidth, 66, 8, 8, "F");
      doc.setTextColor(...BRAND.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text(String(value), x + 12, y + 30);
      doc.setFontSize(7.5);
      doc.text(label.toUpperCase(), x + 12, y + 52);
    });
    y += 84;
    autoTable(doc, {
      startY: y,
      head: [["Breakdown", "Count", "Flagged", "Flag rate"]],
      body: section.groups.length > 0
        ? section.groups.map((group) => [group.label, group.total, group.flagged, group.total ? `${Math.round((group.flagged / group.total) * 100)}%` : "0%"])
        : [["No imported records", 0, 0, "0%"]],
      theme: "grid",
      headStyles: { fillColor: color, textColor: section.slug === "network" ? BRAND.navy : BRAND.white, fontSize: 8.5 },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });
    y = lastTableY() + 16;
    autoTable(doc, {
      startY: y,
      head: [["Flagged category", "Quantity of items flagged"]],
      body: section.flaggedThemes.length > 0
        ? section.flaggedThemes.map((theme) => [theme.label, theme.count])
        : [["No flagged categories", 0]],
      theme: "grid",
      headStyles: { fillColor: BRAND.pink, textColor: BRAND.white, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, cellPadding: 4 },
      margin: { left: margin, right: margin },
      columnStyles: { 0: { cellWidth: pageWidth - margin * 2 - 180 }, 1: { cellWidth: 180, halign: "center" } },
    });

    y = newPage(`${section.label} — example flagged items`, `${clientName} · representative flagged detail limited to one page`, BRAND.pink);
    doc.setTextColor(...BRAND.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Example flagged items limited to one page — see the raw data for the complete flagged-item list.", margin, y);
    if (section.flaggedSample.length > 0) {
      autoTable(doc, {
        startY: y + 12,
        head: [["Item", "Section", "Status", "Risk", "Flag reason", "Action / Notes"]],
        body: section.flaggedSample.map(flaggedSampleRow),
        theme: "grid",
        headStyles: { fillColor: BRAND.pink, textColor: BRAND.white, fontSize: 7.3 },
        bodyStyles: { fontSize: 6.5, cellPadding: 2.5, valign: "top", overflow: "linebreak" },
        margin: { left: margin, right: margin, top: 100 },
        columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 92 }, 2: { cellWidth: 65 }, 3: { cellWidth: 52 }, 4: { cellWidth: 205 }, 5: { cellWidth: 205 } },
      });
    } else {
      doc.setFillColor(...BRAND.white);
      doc.setDrawColor(217, 231, 245);
      doc.roundedRect(margin, y + 32, pageWidth - margin * 2, 90, 10, 10, "FD");
      doc.setTextColor(...BRAND.slate);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("No flagged items are currently recorded for this section.", margin + 18, y + 70);
    }
    doc.setTextColor(...BRAND.slate);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(`${section.flaggedSample.length} example item(s) shown from ${section.flagged} flagged record(s).`, margin, pageHeight - 24);

    newPage(`${section.label} — strategy`, `${clientName} · what this means, what if nothing changes, and the 3 month / 12 month / 2 year roadmap`, color);
    const cardWidth = (pageWidth - margin * 2 - 22) / 2;
    drawStrategyCard(margin, 108, cardWidth, 132, "What this means", section.whatThisMeans, BRAND.white);
    drawStrategyCard(margin + cardWidth + 22, 108, cardWidth, 132, "What if we do nothing", section.whatIfNothing, BRAND.navy, true);
    const roadmapWidth = (pageWidth - margin * 2 - 36) / 3;
    drawStrategyCard(margin, 266, roadmapWidth, 205, "3 months", section.plan3Months, BRAND.white);
    drawStrategyCard(margin + roadmapWidth + 18, 266, roadmapWidth, 205, "12 months", section.plan12Months, BRAND.white);
    drawStrategyCard(margin + (roadmapWidth + 18) * 2, 266, roadmapWidth, 205, "2 years", section.plan2Years, BRAND.white);
  }

  y = newPage("Representative Audited Items", `${clientName} · example inventory only`, BRAND.cyan);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Representative/example list — the raw workbook contains the complete audited inventory.", margin, y);
  autoTable(doc, {
    startY: y + 12,
    head: [["Category", "Item", "Workbook section", "Representative detail", "Lifecycle / priority"]],
    body: model.inventorySample.map(inventorySampleRow),
    theme: "grid",
    headStyles: { fillColor: BRAND.cyan, textColor: BRAND.navy, fontSize: 7.5 },
    bodyStyles: { fontSize: 6.7, cellPadding: 2.6, valign: "top", overflow: "linebreak" },
    margin: { left: margin, right: margin, top: 100 },
    columnStyles: { 0: { cellWidth: 92 }, 1: { cellWidth: 120 }, 2: { cellWidth: 95 }, 3: { cellWidth: 260 }, 4: { cellWidth: 105 } },
  });
  doc.setTextColor(...BRAND.slate);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(`${model.inventorySample.length} examples shown from the Data Infrastructure, Network and Client Compute inventories.`, margin, pageHeight - 24);

  downloadBlob(
    doc.output("blob"),
    `Unleashed-Audit-Report-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
