import type PptxGenJS from "pptxgenjs";
import { ASSET_CATEGORIES, type AuditRow, type BrowserAudit } from "./audit-model";
import { downloadBlob } from "./download-file";
import { buildReportModel, REPORT_STRUCTURE } from "./full-audit-report";

const COLORS = {
  navy: "071A3F",
  cyan: "00D4FF",
  purple: "7E3AED",
  pink: "FF2AA0",
  orange: "F88C22",
  slate: "64748B",
  bg: "EBF8FF",
  white: "FFFFFF",
  line: "D9E7F5",
  pale: "F8FCFF",
};

function text(value: unknown): string {
  return String(value ?? "").trim() || "—";
}

function compact(value: unknown, maximum = 80): string {
  const valueText = text(value);
  return valueText.length > maximum ? `${valueText.slice(0, maximum - 1)}…` : valueText;
}

function tableRows(headers: string[], rows: string[][], headerColor = COLORS.navy): PptxGenJS.TableRow[] {
  return [
    headers.map((header) => ({
      text: header,
      options: { bold: true, color: COLORS.white, fill: { color: headerColor }, valign: "middle" },
    })),
    ...rows.map((row) => row.map((cell) => ({ text: cell, options: { color: "1E293B", fill: { color: COLORS.white } } }))),
  ];
}

function inventorySampleRow(row: AuditRow): string[] {
  const config = ASSET_CATEGORIES[row.auditCategory];
  const detail =
    row.auditCategory === "data-infra"
      ? [row.manufacturer, row.model, row.osHypervisor, row.roleWorkload]
      : row.auditCategory === "network"
        ? [row.assetType, row.manufacturer, row.model, row.location]
        : [row.manufacturer, row.model, row.operatingSystem, row.location];
  return [
    config.label,
    compact(row[config.titleField], 34),
    compact(row.sectionTitle, 28),
    compact(detail.filter(Boolean).join(" · "), 62),
    compact(row.warrantyStatus ?? row.replacementPriority ?? row.status, 22),
  ];
}

function flaggedSampleRow(row: AuditRow): string[] {
  const config = ASSET_CATEGORIES[row.auditCategory];
  return [
    config.label,
    compact(row[config.titleField], 30),
    compact(row.status ?? row.warrantyStatus ?? row.supportStatus, 20),
    compact(row.riskRating ?? row.replacementPriority, 16),
    compact(row.flagReasons.join("; ") || row.warnReasons.join("; "), 76),
    compact(row.remediationRequired ?? row.actionsRequired ?? row.risksActions ?? row.notes, 66),
  ];
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}unleashed-logo-white.png`);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Unable to load PowerPoint logo", error);
    return null;
  }
}

export async function exportPowerPointReport(audit: BrowserAudit, clientName: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const model = buildReportModel(audit, clientName);
  const logo = await logoDataUrl();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Unleashed";
  pptx.company = "Unleashed";
  pptx.subject = "Editable client audit report";
  pptx.title = `Full Lifecycle, Risk & Roadmap Report — ${clientName}`;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
  };
  let slideCount = 0;
  const addSlide = () => {
    slideCount += 1;
    return pptx.addSlide();
  };

  const addLogo = (slide: PptxGenJS.Slide, x = 10.65, y = 0.27, w = 2.15) => {
    if (logo) slide.addImage({ data: logo, x, y, w, h: w * (397 / 1822) });
    else slide.addText("UNLEASHED", { x, y, w, h: 0.32, color: COLORS.white, bold: true, fontSize: 17, align: "right" });
  };
  const addHeader = (slide: PptxGenJS.Slide, index: number, title: string, subtitle: string, color = COLORS.purple) => {
    slide.background = { color: COLORS.bg };
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.28, y: 0.18, w: 12.77, h: 0.78, rectRadius: 0.08, fill: { color: COLORS.navy }, line: { color: COLORS.navy } });
    slide.addShape(pptx.ShapeType.rect, { x: 0.52, y: 0.38, w: 0.68, h: 0.37, fill: { color }, line: { color } });
    slide.addText(String(index).padStart(2, "0"), { x: 0.52, y: 0.42, w: 0.68, h: 0.2, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
    slide.addText(title, { x: 1.42, y: 0.31, w: 7.8, h: 0.3, bold: true, fontSize: 20, color: COLORS.white, margin: 0 });
    slide.addText(subtitle, { x: 1.42, y: 0.65, w: 8.2, h: 0.16, fontSize: 8, color: "D8F3FF", margin: 0 });
    addLogo(slide);
    slide.addShape(pptx.ShapeType.rect, { x: 0.28, y: 0.96, w: 4.26, h: 0.05, fill: { color: COLORS.cyan }, line: { color: COLORS.cyan } });
    slide.addShape(pptx.ShapeType.rect, { x: 4.54, y: 0.96, w: 4.26, h: 0.05, fill: { color: COLORS.purple }, line: { color: COLORS.purple } });
    slide.addShape(pptx.ShapeType.rect, { x: 8.8, y: 0.96, w: 4.25, h: 0.05, fill: { color: COLORS.pink }, line: { color: COLORS.pink } });
  };
  const addFooter = (slide: PptxGenJS.Slide, message: string) => {
    slide.addText(message, { x: 0.55, y: 7.16, w: 12.2, h: 0.16, fontSize: 7.5, italic: true, color: COLORS.slate, margin: 0 });
  };
  const addBlankSlide = (index: number, title: string, prompt: string, color: string) => {
    const slide = addSlide();
    addHeader(slide, index, title, `${clientName} · manual completion section`, color);
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.62, y: 1.35, w: 12.08, h: 5.45, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 1.5 } });
    slide.addText(prompt, { x: 0.92, y: 1.72, w: 11.45, h: 0.42, bold: true, fontSize: 19, color, margin: 0 });
    slide.addText("Click here to add the manually prepared narrative.", {
      x: 0.92,
      y: 2.25,
      w: 11.45,
      h: 3.9,
      fontSize: 17,
      color: "94A3B8",
      italic: true,
      valign: "top",
      margin: 0.1,
      breakLine: false,
    });
    slide.addText("This text box is intentionally editable and contains no auto-generated content.", { x: 0.92, y: 6.35, w: 11.45, h: 0.24, fontSize: 9, color: COLORS.slate, margin: 0 });
  };

  const cover = addSlide();
  cover.background = { color: COLORS.navy };
  cover.addShape(pptx.ShapeType.ellipse, { x: 11.35, y: -0.65, w: 2.5, h: 2.5, fill: { color: "0A5CAE" }, line: { color: "0A5CAE" } });
  cover.addShape(pptx.ShapeType.ellipse, { x: -0.62, y: 6.28, w: 2.1, h: 2.1, fill: { color: COLORS.pink }, line: { color: COLORS.pink } });
  addLogo(cover, 10.25, 0.62, 2.45);
  cover.addShape(pptx.ShapeType.roundRect, { x: 0.65, y: 1.1, w: 2.08, h: 0.42, rectRadius: 0.05, fill: { color: COLORS.cyan }, line: { color: COLORS.cyan } });
  cover.addText("FULL AUDIT REPORT", { x: 0.65, y: 1.22, w: 2.08, h: 0.16, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
  cover.addText("Full Lifecycle, Risk & Roadmap Report", { x: 0.65, y: 2.05, w: 10.7, h: 0.62, bold: true, fontSize: 31, color: COLORS.white, margin: 0 });
  cover.addText(clientName, { x: 0.65, y: 3.08, w: 10.7, h: 0.4, fontSize: 20, bold: true, color: COLORS.white, margin: 0 });
  cover.addText(`Generated ${new Date().toLocaleDateString("en-GB")} · 9-slide editable presentation`, { x: 0.65, y: 3.65, w: 8, h: 0.25, fontSize: 11, color: "D8F3FF", margin: 0 });
  cover.addText("The raw workbook remains the complete item-level audit record.", { x: 0.65, y: 6.9, w: 8.5, h: 0.22, fontSize: 10, color: COLORS.cyan, margin: 0 });

  const overview = addSlide();
  addHeader(overview, 2, "Executive Overview", `${clientName} · full imported audit scope`, COLORS.navy);
  const metricValues = [
    ["Assets tracked", model.totalRows, COLORS.navy],
    ["Flagged items", model.totalFlagged, COLORS.pink],
    ["Categories", model.categorySummary.filter((item) => item.total > 0).length, COLORS.purple],
    ["Populated sheets", model.populatedSheets, COLORS.orange],
  ] as const;
  metricValues.forEach(([label, value, color], index) => {
    const x = 0.55 + index * 3.15;
    overview.addShape(pptx.ShapeType.roundRect, { x, y: 1.25, w: 2.82, h: 0.9, rectRadius: 0.06, fill: { color }, line: { color } });
    overview.addText(String(value), { x: x + 0.16, y: 1.43, w: 2.3, h: 0.28, bold: true, fontSize: 24, color: COLORS.white, margin: 0 });
    overview.addText(label.toUpperCase(), { x: x + 0.16, y: 1.82, w: 2.3, h: 0.16, bold: true, fontSize: 8, color: COLORS.white, margin: 0 });
  });
  overview.addTable(tableRows(
    ["Category", "Total", "Flagged", "Warnings", "Health"],
    model.categorySummary.map((item) => {
      const ratio = item.total ? item.flagged / item.total : 0;
      return [item.label, String(item.total), String(item.flagged), String(item.warnings), ratio === 0 ? "Healthy" : ratio < 0.3 ? "Watch" : ratio < 0.6 ? "At Risk" : "Critical"];
    }),
  ), { x: 0.55, y: 2.42, w: 6.05, h: 2.75, colW: [2.4, 0.72, 0.72, 0.72, 1.49], rowH: 0.32, fontSize: 9, margin: 0.05, border: { color: COLORS.line, pt: 1 } });
  const profile = [
    ["School / Trust", model.highLevel.schoolTrustName || "—"],
    ["Site", model.highLevel.siteName || "—"],
    ["Audit date", model.highLevel.auditDate || "—"],
    ["Auditor", model.highLevel.auditor || "—"],
    ["Staff / Students / Devices", [model.highLevel.staffCount, model.highLevel.studentCount, model.highLevel.deviceCount].map((value) => value || "—").join(" / ")],
    ["Primary contact", model.highLevel.contacts[0]?.name || "—"],
    ["Contact details", [model.highLevel.contacts[0]?.email, model.highLevel.contacts[0]?.phone].filter(Boolean).join(" · ") || "—"],
  ];
  overview.addTable(tableRows(["Profile", "Value"], profile, COLORS.purple), { x: 6.85, y: 2.42, w: 5.9, h: 2.75, colW: [1.85, 4.05], rowH: 0.32, fontSize: 8.7, margin: 0.05, border: { color: COLORS.line, pt: 1 } });
  addFooter(overview, "Overview metrics and profile use the complete imported workbook.");

  addBlankSlide(3, "Executive Summary", "Executive Summary — complete manually", COLORS.navy);
  addBlankSlide(4, "CTO Summary", "CTO Summary — complete manually", COLORS.purple);
  addBlankSlide(5, "DfE Alignment", "DfE Alignment — complete manually", COLORS.orange);

  const distribution = addSlide();
  addHeader(distribution, 6, "Category & Priority Distribution", `${clientName} · full counts without item-level dumping`, COLORS.purple);
  distribution.addTable(tableRows(
    ["Category", "Subcategory / Platform", "Total", "Flagged", "Flag rate"],
    model.groupSummary.map((group) => [group.category, group.group, String(group.total), String(group.flagged), group.total ? `${Math.round((group.flagged / group.total) * 100)}%` : "0%"]),
    COLORS.purple,
  ), { x: 0.55, y: 1.28, w: 12.2, h: 5.55, colW: [2.6, 4.65, 1.1, 1.1, 1.3], rowH: 0.23, fontSize: 7.8, margin: 0.035, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
  addFooter(distribution, "Complete category and priority distributions are shown here; item examples are intentionally limited on the next two slides.");

  const inventory = addSlide();
  addHeader(inventory, 7, "Representative Audited Items", `${clientName} · example inventory only`, COLORS.cyan);
  inventory.addText("Representative/example list — the raw workbook contains the complete audited inventory.", { x: 0.58, y: 1.18, w: 12.1, h: 0.23, bold: true, fontSize: 11, color: COLORS.navy, margin: 0 });
  inventory.addTable(tableRows(
    ["Category", "Item", "Workbook section", "Representative detail", "Lifecycle / priority"],
    model.inventorySample.map(inventorySampleRow),
    COLORS.cyan,
  ), { x: 0.55, y: 1.53, w: 12.2, h: 5.35, colW: [1.8, 2.15, 1.8, 4.65, 1.8], rowH: 0.265, fontSize: 7.2, margin: 0.04, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
  addFooter(inventory, `${model.inventorySample.length} examples shown from Data Infrastructure, Network and Client Compute.`);

  const flagged = addSlide();
  addHeader(flagged, 8, "Representative Flagged Items", `${clientName} · example priority list only`, COLORS.pink);
  flagged.addText("Representative/example flagged list — refer to the raw workbook for the complete flagged-item detail.", { x: 0.58, y: 1.18, w: 12.1, h: 0.23, bold: true, fontSize: 11, color: COLORS.navy, margin: 0 });
  flagged.addTable(tableRows(
    ["Category", "Item", "Status", "Risk", "Reason", "Action / Notes"],
    model.flaggedSample.map(flaggedSampleRow),
    COLORS.pink,
  ), { x: 0.55, y: 1.53, w: 12.2, h: 5.35, colW: [1.55, 1.75, 1.05, 0.8, 3.55, 3.5], rowH: 0.31, fontSize: 6.8, margin: 0.035, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
  addFooter(flagged, `${model.flaggedSample.length} representative priority items shown from ${model.totalFlagged} flagged records.`);

  const migration = addSlide();
  addHeader(migration, 9, "Migration Readiness", `${clientName} · Microsoft and Google readiness distribution`, COLORS.pink);
  migration.addTable(tableRows(
    ["Platform", "Total", "Flagged", "Ready", "Analysis / Remediation", "Issue Found", "Post Project", "High / Critical"],
    model.migrationSummary.map((summary) => [
      summary.platform,
      String(summary.total),
      String(summary.flagged),
      String(summary.ready),
      String(summary.analysis),
      String(summary.issue),
      String(summary.postProject),
      String(summary.highCritical),
    ]),
    COLORS.pink,
  ), { x: 0.55, y: 1.35, w: 12.2, h: 1.75, colW: [1.45, 0.75, 0.8, 0.75, 2.4, 1.2, 1.2, 1.45], rowH: 0.42, fontSize: 8.5, margin: 0.055, border: { color: COLORS.line, pt: 1 } });
  migration.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 3.55, w: 11.8, h: 2.2, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 1.2 } });
  migration.addText("Migration reporting note", { x: 1.02, y: 3.88, w: 4.2, h: 0.3, bold: true, fontSize: 17, color: COLORS.navy, margin: 0 });
  migration.addText(
    "All Microsoft and Google readiness checks remain editable in the browser workspace and in the raw workbook. This concise presentation preserves platform, status, flagged and risk distributions without reproducing the full item-level migration register.",
    { x: 1.02, y: 4.35, w: 11.05, h: 0.9, fontSize: 13, color: COLORS.slate, breakLine: false, margin: 0 },
  );
  addFooter(migration, "Complete migration checks remain available in the browser workspace and raw workbook.");

  if (slideCount !== REPORT_STRUCTURE.length) {
    throw new Error(`Expected ${REPORT_STRUCTURE.length} slides but generated ${slideCount}`);
  }
  const output = await pptx.write({
    outputType: "blob",
    compression: true,
  });
  if (!(output instanceof Blob)) throw new Error("PowerPoint generation did not return a downloadable file.");
  downloadBlob(
    output,
    `Unleashed-Audit-Report-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pptx`,
  );
}
