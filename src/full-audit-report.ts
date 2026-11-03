import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_SLUGS,
  categoryGroups,
  displayValue,
  migrationPlatform,
  type AssetCategorySlug,
  type BrowserAudit,
  type HighLevelInfo,
} from "./audit-model";

const BRAND = {
  navy: [7, 26, 63] as [number, number, number],
  cyan: [0, 212, 255] as [number, number, number],
  purple: [126, 58, 237] as [number, number, number],
  pink: [255, 42, 160] as [number, number, number],
  orange: [248, 140, 34] as [number, number, number],
  slate: [100, 116, 139] as [number, number, number],
  bg: [235, 248, 255] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  line: [217, 231, 245] as [number, number, number],
};

const CATEGORY_COLOR: Record<AssetCategorySlug, [number, number, number]> = {
  "data-infra": BRAND.navy,
  network: BRAND.cyan,
  "client-compute": BRAND.purple,
  software: BRAND.purple,
  cyber: BRAND.orange,
  migration: BRAND.pink,
};

function text(value: unknown): string {
  return String(value ?? "").trim() || "—";
}

function profileRows(info: HighLevelInfo): string[][] {
  return [
    ["School / Trust", info.schoolTrustName || "—", "Site", info.siteName || "—"],
    ["Address", [info.addressLine1, info.addressLine2, info.townCity, info.county, info.postcode].filter(Boolean).join(", ") || "—", "Audit date", info.auditDate || "—"],
    ["Auditor", info.auditor || "—", "Staff / Students / Devices", [info.staffCount, info.studentCount, info.deviceCount].map((value) => value || "—").join(" / ")],
  ];
}

function reportFields(category: AssetCategorySlug): string[] {
  return {
    "data-infra": ["serverName", "physicalVirtual", "manufacturer", "model", "osHypervisor", "roleWorkload", "warrantyStatus", "warrantyExpiry", "endOfSupport", "endOfServiceLife"],
    network: ["assetType", "name", "manufacturer", "model", "firmwareVersion", "location", "warrantyStatus", "warrantyExpiry", "endOfSupport", "endOfServiceLife"],
    "client-compute": ["deviceCategory", "manufacturer", "model", "operatingSystem", "quantity", "ownerDepartment", "location", "warrantyStatus", "replacementPriority", "notes"],
    software: ["softwareSystem", "category", "supplier", "purpose", "deploymentModel", "usersLicences", "owner", "contractRenewalDate", "supportStatus", "risksActions"],
    cyber: ["controlArea", "partOfBrilliantBasics", "installed", "solutionSupplier", "coverage", "mfaEnabled", "adminOwner", "status", "riskRating", "actionsRequired"],
    migration: ["area", "checkName", "sourcePlatform", "requiredEvidence", "owner", "status", "riskRating", "issueFinding", "remediationRequired", "targetDate", "completedDate"],
  }[category];
}

export async function exportFullAuditReport(audit: BrowserAudit, clientName: string) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
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
  const addHeader = (title: string, subtitle: string, color: [number, number, number]) => {
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
  const newPage = (title: string, subtitle: string, color: [number, number, number]) => {
    doc.addPage();
    pageNumber += 1;
    addHeader(title, subtitle, color);
    return 106;
  };
  const lastTableY = () => {
    const tableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
    return tableDoc.lastAutoTable?.finalY ?? 110;
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
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB")}`, margin, 278);
  doc.setTextColor(...BRAND.cyan);
  doc.text("Browser-only audit workspace · no Lifecycle records were created or changed", margin, pageHeight - 40);

  let y = newPage("Executive Overview", `${clientName} · full imported audit scope`, BRAND.navy);
  const categorySummary = ASSET_CATEGORY_SLUGS.map((slug) => {
    const rows = audit.rows.filter((row) => row.auditCategory === slug);
    return { slug, label: ASSET_CATEGORIES[slug].label, total: rows.length, flagged: rows.filter((row) => row.flagged).length };
  });
  const total = categorySummary.reduce((sum, item) => sum + item.total, 0);
  const flagged = categorySummary.reduce((sum, item) => sum + item.flagged, 0);
  const kpis = [
    ["Assets tracked", total, BRAND.navy],
    ["Flagged items", flagged, BRAND.pink],
    ["Categories", categorySummary.filter((item) => item.total > 0).length, BRAND.purple],
    ["Populated sheets", new Set(audit.sheets.filter((sheet) => sheet.rowsImported > 0).map((sheet) => sheet.sheetName)).size, BRAND.orange],
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
  y += 86;
  autoTable(doc, {
    startY: y,
    head: [["Category", "Total", "Flagged", "Health"]],
    body: categorySummary.map((item) => {
      const ratio = item.total ? item.flagged / item.total : 0;
      return [item.label, item.total, item.flagged, ratio === 0 ? "Healthy" : ratio < 0.3 ? "Watch" : ratio < 0.6 ? "At Risk" : "Critical"];
    }),
    theme: "grid",
    headStyles: { fillColor: BRAND.navy, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: margin, right: margin },
  });
  y = lastTableY() + 18;
  autoTable(doc, {
    startY: y,
    head: [["Profile", "Value", "Profile", "Value"]],
    body: profileRows(audit.highLevel),
    theme: "grid",
    headStyles: { fillColor: BRAND.purple, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });

  if (audit.highLevel.contacts.length > 0) {
    y = newPage("High Level Information", `${clientName} · contacts and site profile`, BRAND.purple);
    autoTable(doc, {
      startY: y,
      head: [["Role", "Name", "Email", "Phone", "Notes"]],
      body: audit.highLevel.contacts.map((contact) => [contact.role, contact.name, contact.email, contact.phone, contact.notes]),
      theme: "grid",
      headStyles: { fillColor: BRAND.purple, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5, valign: "top" },
      margin: { left: margin, right: margin },
    });
  }

  for (const slug of ASSET_CATEGORY_SLUGS) {
    const config = ASSET_CATEGORIES[slug];
    const rows = audit.rows.filter((row) => row.auditCategory === slug);
    if (rows.length === 0) continue;
    const flaggedRows = rows.filter((row) => row.flagged);
    const groups = categoryGroups(slug, rows);
    y = newPage(`${config.label} — highlights`, `${clientName} · ${rows.length} tracked · ${flaggedRows.length} flagged`, CATEGORY_COLOR[slug]);
    const metrics = [
      ["Items audited", rows.length],
      ["Flagged", flaggedRows.length],
      ["Healthy / warning", rows.length - flaggedRows.length],
      ["Flag rate", `${Math.round((flaggedRows.length / rows.length) * 100)}%`],
    ];
    metrics.forEach(([label, value], index) => {
      const x = margin + index * (tileWidth + 16);
      doc.setFillColor(...(index === 1 ? BRAND.pink : index === 3 ? BRAND.orange : CATEGORY_COLOR[slug]));
      doc.roundedRect(x, y, tileWidth, 66, 8, 8, "F");
      doc.setTextColor(...BRAND.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text(String(value), x + 12, y + 30);
      doc.setFontSize(7.5);
      doc.text(String(label).toUpperCase(), x + 12, y + 52);
    });
    y += 86;
    autoTable(doc, {
      startY: y,
      head: [["Breakdown", "Count", "Flagged"]],
      body: groups.map((group) => [group.label, group.rows.length, group.rows.filter((row) => row.flagged).length]),
      theme: "grid",
      headStyles: { fillColor: CATEGORY_COLOR[slug], textColor: slug === "network" ? BRAND.navy : BRAND.white, fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });

    const fields = reportFields(slug).map((key) => config.fields.find((field) => field.key === key)).filter((field) => field !== undefined);
    y = newPage(`${config.label} — full inventory`, `${clientName} · editable source data represented in full`, CATEGORY_COLOR[slug]);
    autoTable(doc, {
      startY: y,
      head: [[...fields.map((field) => field.label), "Assessment"]],
      body: rows.map((row) => [
        ...fields.map((field) => displayValue(field, row[field.key])),
        row.flagged ? row.flagReasons.join("; ") : row.warnReasons.join("; ") || "No current critical flag",
      ]),
      theme: "grid",
      headStyles: { fillColor: CATEGORY_COLOR[slug], textColor: slug === "network" ? BRAND.navy : BRAND.white, fontSize: 6.7 },
      bodyStyles: { fontSize: 6.1, cellPadding: 2.2, valign: "top", overflow: "linebreak" },
      margin: { left: 22, right: 22, top: 90 },
      styles: { overflow: "linebreak" },
    });

    y = newPage(`${config.label} — priority extract`, `${clientName} · flagged and warning items`, CATEGORY_COLOR[slug]);
    const priority = rows.filter((row) => row.flagged || row.warnReasons.length > 0);
    if (priority.length === 0) {
      doc.setTextColor(...BRAND.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("No flagged or warning items in this category.", margin, y + 24);
    } else {
      autoTable(doc, {
        startY: y,
        head: [["Item", "Section / Platform", "Status", "Risk", "Reason", "Action / Notes"]],
        body: priority.map((row) => [
          text(row[config.titleField]),
          slug === "migration" ? migrationPlatform(row) : text(row.sectionTitle),
          text(row.status ?? row.warrantyStatus ?? row.supportStatus),
          text(row.riskRating ?? row.replacementPriority),
          row.flagReasons.join("; ") || row.warnReasons.join("; "),
          text(row.remediationRequired ?? row.actionsRequired ?? row.risksActions ?? row.notes),
        ]),
        theme: "grid",
        headStyles: { fillColor: BRAND.pink, textColor: 255, fontSize: 7.5 },
        bodyStyles: { fontSize: 7, cellPadding: 3, valign: "top" },
        margin: { left: margin, right: margin, top: 90 },
        columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 90 }, 2: { cellWidth: 65 }, 3: { cellWidth: 55 }, 4: { cellWidth: 150 }, 5: { cellWidth: 190 } },
      });
    }
  }

  doc.save(`Unleashed-Audit-Report-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
