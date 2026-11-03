import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_SLUGS,
  categoryGroups,
  displayValue,
  migrationPlatform,
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
  "Category & Priority Distribution",
  "Representative Audited Items",
  "Representative Flagged Items",
  "Migration Readiness",
] as const;

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
  flaggedSample: AuditRow[];
  totalRows: number;
  totalFlagged: number;
  populatedSheets: number;
  migrationSummary: Array<{ platform: string; total: number; flagged: number; ready: number; analysis: number; issue: number; postProject: number; highCritical: number }>;
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
  const migrationRows = audit.rows.filter((row) => row.auditCategory === "migration");
  const migrationSummary = ["Microsoft", "Google", "Other"].map((platform) => {
    const rows = migrationRows.filter((row) => migrationPlatform(row) === platform);
    return {
      platform,
      total: rows.length,
      flagged: rows.filter((row) => row.flagged).length,
      ready: rows.filter((row) => row.status === "READY").length,
      analysis: rows.filter((row) => row.status === "IN_PROGRESS" || row.status === "REMEDIATION_REQUIRED").length,
      issue: rows.filter((row) => row.status === "ISSUE_FOUND").length,
      postProject: rows.filter((row) => row.status === "NOT_CHECKED").length,
      highCritical: rows.filter((row) => row.riskRating === "HIGH" || row.riskRating === "CRITICAL").length,
    };
  }).filter((summary) => summary.total > 0);
  return {
    clientName,
    highLevel: audit.highLevel,
    categorySummary,
    groupSummary,
    inventorySample: balancedSample(inventoryRows, 18, inventoryCategories),
    flaggedSample: prioritySample(audit.rows, 14),
    totalRows: audit.rows.length,
    totalFlagged: audit.rows.filter((row) => row.flagged).length,
    populatedSheets: new Set(audit.sheets.filter((sheet) => sheet.rowsImported > 0).map((sheet) => sheet.sheetName)).size,
    migrationSummary,
  };
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
    config.label,
    compact(row[config.titleField], 40),
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
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB")} · 9-page concise report`, margin, 278);
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

  y = newPage("Category & Priority Distribution", `${clientName} · full counts without item-level dumping`, BRAND.purple);
  autoTable(doc, {
    startY: y,
    head: [["Category", "Subcategory / Platform", "Total", "Flagged", "Flag rate"]],
    body: model.groupSummary.map((group) => [
      group.category,
      group.group,
      group.total,
      group.flagged,
      group.total ? `${Math.round((group.flagged / group.total) * 100)}%` : "0%",
    ]),
    theme: "grid",
    headStyles: { fillColor: BRAND.purple, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.3, cellPadding: 3 },
    margin: { left: margin, right: margin, top: 90 },
  });
  doc.setTextColor(...BRAND.slate);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("These totals use the complete imported workbook; only the example pages below are sampled.", margin, pageHeight - 24);

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

  y = newPage("Representative Flagged Items", `${clientName} · example priority list only`, BRAND.pink);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Representative/example flagged list — refer to the raw workbook for the complete flagged-item detail.", margin, y);
  autoTable(doc, {
    startY: y + 12,
    head: [["Category", "Item", "Status", "Risk", "Reason", "Action / Notes"]],
    body: model.flaggedSample.map(flaggedSampleRow),
    theme: "grid",
    headStyles: { fillColor: BRAND.pink, textColor: 255, fontSize: 7.3 },
    bodyStyles: { fontSize: 6.5, cellPadding: 2.5, valign: "top", overflow: "linebreak" },
    margin: { left: margin, right: margin, top: 100 },
    columnStyles: { 0: { cellWidth: 86 }, 1: { cellWidth: 105 }, 2: { cellWidth: 62 }, 3: { cellWidth: 52 }, 4: { cellWidth: 205 }, 5: { cellWidth: 205 } },
  });
  doc.setTextColor(...BRAND.slate);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(`${model.flaggedSample.length} representative priority items shown from ${model.totalFlagged} flagged records.`, margin, pageHeight - 24);

  y = newPage("Migration Readiness", `${clientName} · Microsoft and Google readiness distribution`, BRAND.pink);
  autoTable(doc, {
    startY: y,
    head: [["Platform", "Total", "Flagged", "Ready", "Analysis / Remediation", "Issue Found", "Post Project", "High / Critical Risk"]],
    body: model.migrationSummary.map((summary) => [
      summary.platform,
      summary.total,
      summary.flagged,
      summary.ready,
      summary.analysis,
      summary.issue,
      summary.postProject,
      summary.highCritical,
    ]),
    theme: "grid",
    headStyles: { fillColor: BRAND.pink, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 8, cellPadding: 4 },
    margin: { left: margin, right: margin },
  });
  y = lastTableY() + 24;
  doc.setFillColor(...BRAND.white);
  doc.setDrawColor(217, 231, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 120, 10, 10, "FD");
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Migration reporting note", margin + 18, y + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.slate);
  doc.text(
    doc.splitTextToSize(
      "All Microsoft and Google readiness checks remain editable in the browser workspace and in the raw workbook. This concise report preserves platform, status, flagged and risk distributions without reproducing the full item-level migration register.",
      pageWidth - margin * 2 - 36,
    ),
    margin + 18,
    y + 52,
  );

  downloadBlob(
    doc.output("blob"),
    `Unleashed-Audit-Report-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
