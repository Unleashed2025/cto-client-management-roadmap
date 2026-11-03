import type PptxGenJS from "pptxgenjs";
import { ASSET_CATEGORIES, displayValue, type AssetCategorySlug, type AuditRow, type BrowserAudit } from "./audit-model";
import { downloadBlob } from "./download-file";
import { buildCategoryReportSections, buildReportModel, REPORT_STRUCTURE } from "./full-audit-report";

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

const CATEGORY_COLOR: Record<AssetCategorySlug, string> = {
  "data-infra": COLORS.navy,
  network: COLORS.cyan,
  "client-compute": COLORS.purple,
  software: COLORS.purple,
  cyber: COLORS.orange,
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

function flaggedSampleRow(row: AuditRow): string[] {
  const config = ASSET_CATEGORIES[row.auditCategory];
  return [
    compact(row[config.titleField], 30),
    compact(row.sectionTitle, 24),
    compact(row.status ?? row.warrantyStatus ?? row.supportStatus, 20),
    compact(row.riskRating ?? row.replacementPriority, 16),
    compact(row.flagReasons.join("; ") || row.warnReasons.join("; "), 76),
    compact(row.remediationRequired ?? row.actionsRequired ?? row.risksActions ?? row.notes, 66),
  ];
}

function fieldDisplay(row: AuditRow, key: string): string {
  const field = ASSET_CATEGORIES[row.auditCategory].fields.find((candidate) => candidate.key === key);
  return field ? displayValue(field, row[key]) : text(row[key]);
}

function auditedItemsTable(slug: AssetCategorySlug, rows: AuditRow[]): { headers: string[]; rows: string[][]; widths: number[]; rowHeight: number } {
  if (slug === "data-infra") {
    return {
      headers: ["Item", "Type", "Manufacturer / Model", "OS / Hypervisor", "Role / Workload", "Lifecycle"],
      rows: rows.map((row) => [
        compact(row.serverName, 28),
        compact(fieldDisplay(row, "physicalVirtual"), 14),
        compact([row.manufacturer, row.model].filter(Boolean).join(" · "), 28),
        compact(row.osHypervisor, 24),
        compact(row.roleWorkload, 30),
        compact([fieldDisplay(row, "warrantyStatus"), row.endOfSupport, row.endOfServiceLife].filter((value) => value && value !== "—").join(" · "), 34),
      ]),
      widths: [2.1, 1.0, 2.15, 1.8, 2.55, 2.6],
      rowHeight: 0.33,
    };
  }
  if (slug === "network") {
    return {
      headers: ["Item", "Type", "Manufacturer / Model", "Firmware / Wi-Fi", "Location", "Lifecycle"],
      rows: rows.map((row) => [
        compact(row.name, 28),
        compact(fieldDisplay(row, "assetType"), 18),
        compact([row.manufacturer, row.model].filter(Boolean).join(" · "), 28),
        compact([row.firmwareVersion, row.wifiStandard].filter(Boolean).join(" · "), 26),
        compact(row.location, 24),
        compact([fieldDisplay(row, "warrantyStatus"), row.endOfSupport, row.endOfServiceLife].filter((value) => value && value !== "—").join(" · "), 34),
      ]),
      widths: [2.1, 1.25, 2.25, 2.0, 1.8, 2.8],
      rowHeight: 0.33,
    };
  }
  if (slug === "client-compute") {
    return {
      headers: ["Device category", "Manufacturer / Model", "Operating system", "Qty", "Owner / Location", "Priority / Lifecycle"],
      rows: rows.map((row) => [
        compact(row.deviceCategory, 28),
        compact([row.manufacturer, row.model].filter(Boolean).join(" · "), 28),
        compact(row.operatingSystem, 24),
        compact(row.quantity, 8),
        compact([row.ownerDepartment, row.location].filter(Boolean).join(" · "), 28),
        compact([fieldDisplay(row, "replacementPriority"), fieldDisplay(row, "warrantyStatus"), row.endOfSupport].filter((value) => value && value !== "—").join(" · "), 32),
      ]),
      widths: [2.15, 2.25, 2.0, 0.55, 2.15, 3.1],
      rowHeight: 0.33,
    };
  }
  if (slug === "software") {
    return {
      headers: ["Software / System", "Category", "Supplier", "Purpose", "Deployment", "Owner", "Renewal / Support"],
      rows: rows.map((row) => [
        compact(row.softwareSystem, 34),
        compact(row.category, 20),
        compact(row.supplier, 24),
        compact(row.purpose, 44),
        compact(fieldDisplay(row, "deploymentModel"), 18),
        compact(row.owner, 20),
        compact([row.contractRenewalDate, fieldDisplay(row, "supportStatus")].filter(Boolean).join(" · "), 32),
      ]),
      widths: [2.0, 1.1, 1.3, 2.5, 1.1, 1.2, 3.0],
      rowHeight: 0.36,
    };
  }
  return {
    headers: ["Control", "Brilliant Basics", "Installed", "Solution / Supplier", "Coverage", "Status / Risk", "Evidence / Actions"],
    rows: rows.map((row) => [
      compact(row.controlArea, 34),
      compact(fieldDisplay(row, "partOfBrilliantBasics"), 12),
      compact(fieldDisplay(row, "installed"), 12),
      compact(row.solutionSupplier, 30),
      compact(row.coverage, 30),
      compact([fieldDisplay(row, "status"), fieldDisplay(row, "riskRating")].filter((value) => value !== "—").join(" · "), 24),
      compact([row.evidenceNotes, row.actionsRequired].filter(Boolean).join(" · "), 46),
    ]),
    widths: [2.0, 0.9, 0.8, 1.8, 1.7, 1.35, 3.65],
    rowHeight: 0.29,
  };
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
  const categorySections = buildCategoryReportSections(audit);
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
  const addStrategyCard = (slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number, title: string, body: string | string[], fill = COLORS.white, dark = false) => {
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: dark ? fill : COLORS.line, pt: 1 } });
    slide.addText(title, { x: x + 0.22, y: y + 0.2, w: w - 0.44, h: 0.26, bold: true, fontSize: 13, color: dark ? COLORS.white : COLORS.navy, margin: 0 });
    slide.addText(Array.isArray(body) ? body.map((item) => `• ${item}`).join("\n") : body, {
      x: x + 0.22,
      y: y + 0.62,
      w: w - 0.44,
      h: h - 0.82,
      fontSize: Array.isArray(body) ? 9.2 : 10.2,
      color: dark ? COLORS.white : COLORS.slate,
      breakLine: false,
      valign: "top",
      margin: 0,
    });
  };
  const addBlankSlide = (index: number, title: string, prompt: string, color: string) => {
    const slide = addSlide();
    addHeader(slide, index, title, `${clientName} · manual completion section`, color);
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.62, y: 1.35, w: 12.08, h: 5.45, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1.5 } });
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
  cover.addText(`Generated ${new Date().toLocaleDateString("en-GB")} · full category presentation`, { x: 0.65, y: 3.65, w: 8, h: 0.25, fontSize: 11, color: "D8F3FF", margin: 0 });
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

  const highLevel = addSlide();
  addHeader(highLevel, slideCount, "High Level Information", `${clientName} · organisation, site, audit and estate profile`, COLORS.purple);
  const profileTiles = [
    ["Organisation", model.highLevel.schoolTrustName || "Not recorded", COLORS.navy],
    ["Site", [model.highLevel.siteName, model.highLevel.townCity, model.highLevel.postcode].filter(Boolean).join(" · ") || "Not recorded", COLORS.cyan],
    ["Audit", [model.highLevel.auditDate, model.highLevel.auditor].filter(Boolean).join(" · ") || "Not recorded", COLORS.purple],
    ["Estate size", `${model.highLevel.staffCount || "—"} staff · ${model.highLevel.studentCount || "—"} students · ${model.highLevel.deviceCount || "—"} devices`, COLORS.pink],
  ] as const;
  profileTiles.forEach(([label, value, color], index) => {
    const x = 0.55 + (index % 2) * 6.2;
    const y = 1.28 + Math.floor(index / 2) * 1.35;
    highLevel.addShape(pptx.ShapeType.roundRect, { x, y, w: 5.9, h: 1.08, rectRadius: 0.05, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
    highLevel.addShape(pptx.ShapeType.rect, { x, y, w: 0.12, h: 1.08, fill: { color }, line: { color } });
    highLevel.addText(label.toUpperCase(), { x: x + 0.28, y: y + 0.2, w: 2.2, h: 0.16, fontSize: 8, bold: true, color, margin: 0 });
    highLevel.addText(value, { x: x + 0.28, y: y + 0.5, w: 5.25, h: 0.32, fontSize: 13, bold: true, color: COLORS.navy, margin: 0, breakLine: false });
  });
  highLevel.addTable(tableRows(
    ["Role", "Name", "Email", "Phone"],
    model.highLevel.contacts.length > 0
      ? model.highLevel.contacts.map((contact) => [contact.role || "—", contact.name || "—", contact.email || "—", contact.phone || "—"])
      : [["No contacts recorded", "—", "—", "—"]],
    COLORS.navy,
  ), { x: 0.55, y: 4.2, w: 12.2, h: 2.15, colW: [2.5, 2.6, 4.3, 2.8], rowH: 0.36, fontSize: 8.5, margin: 0.05, border: { color: COLORS.line, pt: 1 }, autoPage: false });
  addFooter(highLevel, "High Level Information remains editable in the browser workspace.");

  for (const section of categorySections) {
    const color = CATEGORY_COLOR[section.slug];
    const highlights = addSlide();
    addHeader(highlights, slideCount, `${section.label} — highlights`, `${clientName} · ${section.total} audited · ${section.flagged} flagged · ${section.warnings} warnings`, color);
    const sectionMetrics = [
      ["Items audited", section.total, color],
      ["Flagged", section.flagged, COLORS.pink],
      ["Warnings", section.warnings, COLORS.orange],
      ["Flag rate", section.total ? `${Math.round((section.flagged / section.total) * 100)}%` : "0%", COLORS.navy],
    ] as const;
    sectionMetrics.forEach(([label, value, tileColor], index) => {
      const x = 0.55 + index * 3.15;
      highlights.addShape(pptx.ShapeType.roundRect, { x, y: 1.25, w: 2.82, h: 0.9, rectRadius: 0.06, fill: { color: tileColor }, line: { color: tileColor } });
      highlights.addText(String(value), { x: x + 0.16, y: 1.43, w: 2.3, h: 0.28, bold: true, fontSize: 24, color: COLORS.white, margin: 0 });
      highlights.addText(label.toUpperCase(), { x: x + 0.16, y: 1.82, w: 2.3, h: 0.16, bold: true, fontSize: 8, color: COLORS.white, margin: 0 });
    });
    highlights.addTable(tableRows(
      ["Breakdown", "Count", "Flagged", "Flag rate"],
      section.groups.length > 0
        ? section.groups.map((group) => [group.label, String(group.total), String(group.flagged), group.total ? `${Math.round((group.flagged / group.total) * 100)}%` : "0%"])
        : [["No imported records", "0", "0", "0%"]],
      color,
    ), { x: 0.55, y: 2.45, w: 7.2, h: 3.5, colW: [4.15, 0.95, 0.95, 1.15], rowH: 0.31, fontSize: 8.5, margin: 0.05, border: { color: COLORS.line, pt: 1 }, autoPage: false });
    highlights.addTable(tableRows(
      ["Flagged category", "Qty"],
      section.flaggedThemes.length > 0
        ? section.flaggedThemes.map((theme) => [theme.label, String(theme.count)])
        : [["No flagged categories", "0"]],
      COLORS.pink,
    ), { x: 8.0, y: 2.45, w: 4.75, h: 2.9, colW: [3.45, 1.3], rowH: 0.39, fontSize: 9.5, margin: 0.06, border: { color: COLORS.line, pt: 1 }, autoPage: false });
    let noteY = 5.55;
    if (section.operatingSystems.length > 0) {
      highlights.addTable(tableRows(
        ["Operating system type", "Qty"],
        section.operatingSystems.map((item) => [item.label, String(item.count)]),
        COLORS.navy,
      ), { x: 0.55, y: 4.42, w: 12.2, h: 1.75, colW: [11.0, 1.2], rowH: 0.25, fontSize: 7.8, margin: 0.035, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
      noteY = 6.24;
    }
    highlights.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: noteY, w: 12.2, h: 0.72, rectRadius: 0.05, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
    highlights.addText("How to read these figures", { x: 0.8, y: noteY + 0.19, w: 2.65, h: 0.2, bold: true, fontSize: 10, color: COLORS.navy, margin: 0 });
    highlights.addText(
      `The ${section.flagged} flagged figure is the number of unique items. Category quantities may total more because one item can have multiple flag reasons.`,
      { x: 3.05, y: noteY + 0.16, w: 9.35, h: 0.3, fontSize: 10, color: COLORS.slate, margin: 0, breakLine: false },
    );
    addFooter(highlights, "Counts and flag-category quantities use the complete imported workbook.");

    {
      const auditedItemsTableData = auditedItemsTable(section.slug, section.auditedRows);
      const listDescription = section.auditedRowsComplete
        ? `Complete audited list — all ${section.total} imported item(s) are shown.`
        : `Representative audited list — ${section.auditedRows.length} examples shown from ${section.total} item(s); see the raw workbook for the complete inventory.`;
      const auditedItems = addSlide();
      addHeader(auditedItems, slideCount, `${section.label} — audited items`, `${clientName} · one-page audited-item list`, color);
      auditedItems.addText(listDescription, {
        x: 0.58,
        y: 1.18,
        w: 12.1,
        h: 0.23,
        bold: true,
        fontSize: 11,
        color: COLORS.navy,
        margin: 0,
      });
      auditedItems.addTable(tableRows(auditedItemsTableData.headers, auditedItemsTableData.rows, color), {
        x: 0.55,
        y: 1.53,
        w: 12.2,
        h: 5.35,
        colW: auditedItemsTableData.widths,
        rowH: auditedItemsTableData.rowHeight,
        fontSize: 6.6,
        margin: 0.035,
        border: { color: COLORS.line, pt: 0.8 },
        autoPage: false,
      });
      addFooter(
        auditedItems,
        section.auditedRowsComplete
          ? `All ${section.total} audited ${section.label.toLowerCase()} item(s) are included on this slide.`
          : `${section.auditedRows.length} representative examples shown from ${section.total} audited item(s); the raw workbook contains the complete list.`,
      );
    }

    const flagged = addSlide();
    addHeader(flagged, slideCount, `${section.label} — example flagged items`, `${clientName} · representative flagged detail limited to one page`, COLORS.pink);
    flagged.addText("Example flagged items limited to one page — see the raw data for the complete flagged-item list.", { x: 0.58, y: 1.18, w: 12.1, h: 0.23, bold: true, fontSize: 11, color: COLORS.navy, margin: 0 });
    if (section.flaggedSample.length > 0) {
      flagged.addTable(tableRows(
        ["Item", "Section", "Status", "Risk", "Flag reason", "Action / Notes"],
        section.flaggedSample.map(flaggedSampleRow),
        COLORS.pink,
      ), { x: 0.55, y: 1.53, w: 12.2, h: 5.35, colW: [1.8, 1.5, 1.0, 0.75, 3.55, 3.6], rowH: 0.37, fontSize: 6.8, margin: 0.035, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    } else {
      flagged.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.75, w: 11.9, h: 1.4, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
      flagged.addText("No flagged items are currently recorded for this section.", { x: 1.0, y: 2.22, w: 11.3, h: 0.28, fontSize: 15, color: COLORS.slate, align: "center", margin: 0 });
    }
    addFooter(flagged, `${section.flaggedSample.length} example item(s) shown from ${section.flagged} flagged record(s).`);

    const strategy = addSlide();
    addHeader(strategy, slideCount, `${section.label} — strategy`, `${clientName} · what this means, what if nothing changes, and the 3 month / 12 month / 2 year roadmap`, color);
    addStrategyCard(strategy, 0.55, 1.3, 6.0, 1.65, "What this means", section.whatThisMeans);
    addStrategyCard(strategy, 6.75, 1.3, 6.0, 1.65, "What if we do nothing", section.whatIfNothing, COLORS.navy, true);
    addStrategyCard(strategy, 0.55, 3.25, 3.93, 3.45, "3 months", section.plan3Months);
    addStrategyCard(strategy, 4.7, 3.25, 3.93, 3.45, "12 months", section.plan12Months);
    addStrategyCard(strategy, 8.82, 3.25, 3.93, 3.45, "2 years", section.plan2Years);
    addFooter(strategy, "Roadmap actions are editable and should be refined with owners, dates and budget.");
  }

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
