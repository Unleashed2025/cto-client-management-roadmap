import type PptxGenJS from "pptxgenjs";
import {
  CATALOGUE_HEADERS,
  calcApp,
  catalogueCells,
  catalogueRow,
  formatGbp,
  gapText,
  hoursLabel,
  type BcdrApp,
} from "./bcdr-catalogue";
import { downloadBlob } from "./download-file";

const COLORS = { navy: "071A3F", cyan: "00D4FF", purple: "7E3AED", pink: "FF2AA0", slate: "64748B", bg: "EBF8FF", white: "FFFFFF", line: "D9E7F5" };

function rows(headers: string[], body: string[][]): PptxGenJS.TableRow[] {
  return [
    headers.map((header) => ({ text: header, options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, valign: "middle" as const } })),
    ...body.map((row) => row.map((cell) => ({ text: cell, options: { color: "1E293B", fill: { color: COLORS.white }, valign: "top" as const } }))),
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
    console.error("Unable to load report logo", error);
    return null;
  }
}

export async function exportBcdrPowerPoint(apps: BcdrApp[], clientName: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const logo = await logoDataUrl();
  const title = "Backup, DR & Business Continuity Assessment";
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Unleashed";
  pptx.company = "Unleashed";
  pptx.title = `${title} — ${clientName}`;
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };
  let slideNumber = 0;

  const addLogo = (slide: PptxGenJS.Slide) => {
    if (logo) slide.addImage({ data: logo, x: 10.65, y: 0.27, w: 2.15, h: 2.15 * (397 / 1822) });
    else slide.addText("UNLEASHED", { x: 10.65, y: 0.27, w: 2.15, h: 0.32, color: COLORS.white, bold: true, fontSize: 17, align: "right" });
  };
  const addHeader = (slide: PptxGenJS.Slide, heading: string, subtitle: string, color = COLORS.purple) => {
    slideNumber += 1;
    slide.background = { color: COLORS.bg };
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.28, y: 0.18, w: 12.77, h: 0.78, rectRadius: 0.08, fill: { color: COLORS.navy }, line: { color: COLORS.navy } });
    slide.addShape(pptx.ShapeType.rect, { x: 0.52, y: 0.38, w: 0.68, h: 0.37, fill: { color }, line: { color } });
    slide.addText(String(slideNumber).padStart(2, "0"), { x: 0.52, y: 0.42, w: 0.68, h: 0.2, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
    slide.addText(heading, { x: 1.42, y: 0.31, w: 8.9, h: 0.3, bold: true, fontSize: 20, color: COLORS.white, margin: 0 });
    slide.addText(subtitle, { x: 1.42, y: 0.65, w: 8.9, h: 0.16, fontSize: 8, color: "D8F3FF", margin: 0 });
    addLogo(slide);
  };
  const footer = (slide: PptxGenJS.Slide, text: string) => slide.addText(text, { x: 0.55, y: 7.16, w: 12.2, h: 0.16, fontSize: 7.5, italic: true, color: COLORS.slate, margin: 0 });
  const table = (slide: PptxGenJS.Slide, data: PptxGenJS.TableRow[], opts: Partial<PptxGenJS.TableProps>) =>
    slide.addTable(data, { margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false, ...opts } as PptxGenJS.TableProps);

  const cover = pptx.addSlide();
  slideNumber += 1;
  cover.background = { color: COLORS.navy };
  addLogo(cover);
  cover.addText(title, { x: 0.65, y: 2.05, w: 10.8, h: 0.75, bold: true, fontSize: 30, color: COLORS.white, margin: 0 });
  cover.addText(clientName, { x: 0.65, y: 3.08, w: 10.7, h: 0.4, fontSize: 20, bold: true, color: COLORS.white, margin: 0 });
  cover.addText(`Service catalogue · ${apps.length} application(s) · Generated ${new Date().toLocaleDateString("en-GB")}`, { x: 0.65, y: 3.65, w: 10.5, h: 0.25, fontSize: 11, color: "D8F3FF", margin: 0 });

  const calcs = apps.map(calcApp);
  const summary = pptx.addSlide();
  addHeader(summary, "Summary", `${clientName} · ${title}`);
  const high = apps.filter((app, index) => app.risk === "Critical" || app.risk === "High" || calcs[index].gapRisk === "High");
  table(summary, rows(["Measure", "Value"], [
    ["Applications assessed", String(apps.length)],
    ["Applications at high / critical risk", `${high.length}${high.length ? ` — ${high.map((app) => app.name || "unnamed").join(", ")}` : ""}`],
    ["Total annual protection cost", formatGbp(calcs.reduce((sum, calc) => sum + calc.annualProtection, 0))],
    ["Total upfront cost", formatGbp(calcs.reduce((sum, calc) => sum + calc.upfront, 0))],
    ["Total first-year cost", formatGbp(calcs.reduce((sum, calc) => sum + calc.firstYear, 0))],
  ]), { x: 0.55, y: 1.3, w: 12.2, colW: [4, 8.2], rowH: 0.45, fontSize: 11 });
  footer(summary, "Indicative assessment based on information supplied by the client. RTO/RPO gaps compare the business requirement with the current achievable recovery.");

  const catalogueRows = apps.map((app) => catalogueCells(catalogueRow(app)));
  for (let start = 0; start < Math.max(catalogueRows.length, 1); start += 9) {
    const slide = pptx.addSlide();
    addHeader(slide, "Master Service Catalogue", `${clientName} · ${title}`, COLORS.cyan);
    table(slide, rows(CATALOGUE_HEADERS, catalogueRows.slice(start, start + 9)), {
      x: 0.35, y: 1.3, w: 12.6, colW: [1.9, 0.7, 0.6, 1, 0.8, 0.8, 1, 0.8, 1, 0.6, 1, 0.9, 0.7], rowH: 0.5, fontSize: 8,
    });
  }

  for (const [index, app] of apps.entries()) {
    const calc = calcs[index];
    const name = app.name || `Application ${index + 1}`;
    const text = (key: string) => app[key]?.trim() || "—";

    const profile = pptx.addSlide();
    addHeader(profile, name, `${clientName} · Profile, impact, hosting & protection`, COLORS.purple);
    table(profile, rows(["Area", "Detail"], [
      ["Overview", `${text("description")}\nOwner: ${text("bizOwner")} · Technical: ${text("techOwner")} · Supplier: ${text("vendor")}\nUsers: ${text("users")} · Sites: ${text("sites")} · Criticality: ${text("criticality")}`],
      ["Business impact", `${text("unavailable")}\nMaximum tolerable downtime: ${hoursLabel(app.mtd)} · Manual working: ${text("manualWork")}\nDowntime cost: ${formatGbp(calc.costPerHour)}/hr · Estimated outage cost: ${formatGbp(calc.outageCost)}`],
      ["Hosting & data", `Hosting: ${text("hostModel")}${app.hostSaasManaged === "Yes" ? " (provider-managed)" : ""} · Location: ${text("hostPrimary")}\nData: ${catalogueRow(app).data} · Personal data: ${text("dataPersonal")} · Retention: ${text("dataRetention")}`],
      ["Backup", `Backed up: ${text("bkProtected")} · ${text("bkProduct")} (${text("bkProvider")}) · Retention: ${text("bkRetention")}\nEncrypted: ${text("bkEncrypted")} · Monitored: ${text("bkMonitored")}`],
      ["Business continuity & testing", `BCP: ${text("bcPlan")} · Included: ${text("bcIncluded")} · Last restore test: ${text("tsLastRestore")} · Restore successful: ${text("tsRestoreOk")}\nDR tested: ${text("tsDr")} (${text("tsDrDate")}) · Evidence: ${text("tsEvidence")}`],
    ]), { x: 0.55, y: 1.3, w: 12.2, colW: [2.2, 10], rowH: 0.95, fontSize: 9 });

    const recovery = pptx.addSlide();
    addHeader(recovery, `${name} — Recovery, cost & recommendation`, `${clientName} · Business requirement vs. technical reality`, COLORS.pink);
    table(recovery, rows(["Recovery option", "Available", "RTO", "RPO"], [
      ["Business requirement", "—", hoursLabel(app.reqRto), hoursLabel(app.reqRpo)],
      ["Current achievable", "—", hoursLabel(app.achRto), hoursLabel(app.achRpo)],
      ["Local backup", text("locAvail"), hoursLabel(app.locRto), hoursLabel(app.locRpo)],
      ["Cloud / offsite backup", text("cldAvail"), hoursLabel(app.cldRto), hoursLabel(app.cldRpo)],
      ["Full DR", text("drAvail"), hoursLabel(app.drRto), hoursLabel(app.drRpo)],
      ["GAP", calc.gapRisk === "Not assessed" ? "Not assessed" : calc.gapRisk === "Within requirement" ? "Within requirement" : `${calc.gapRisk.toUpperCase()} RISK`, gapText(calc.rtoGap), gapText(calc.rpoGap)],
    ]), { x: 0.55, y: 1.3, w: 6.3, colW: [2.4, 1.7, 1.1, 1.1], rowH: 0.42, fontSize: 9 });
    table(recovery, rows(["Cost", "Value"], [
      ["Monthly protection cost", formatGbp(calc.monthlyProtection)],
      ["Annual protection cost", formatGbp(calc.annualProtection)],
      ["Upfront cost", formatGbp(calc.upfront)],
      ["Total first-year cost", formatGbp(calc.firstYear)],
      ["Annual cost vs 1 hour downtime", calc.annualVsHour === null ? "—" : `${calc.annualVsHour.toFixed(1)}× one hour`],
      ["Annual cost vs 1 day downtime", calc.annualVsDay === null ? "—" : `${calc.annualVsDay.toFixed(2)}× one day`],
    ]), { x: 7.1, y: 1.3, w: 5.65, colW: [3.4, 2.25], rowH: 0.42, fontSize: 9 });
    table(recovery, rows(["Assessment", "Detail"], [
      ["Risk / adequacy", `Risk: ${text("risk")} · Protection adequate: ${text("asAdequate")}\nBackup: ${text("asBackup")} · Offsite: ${text("asOffsite")} · DR: ${text("asDr")} · BC: ${text("asBc")} · Testing: ${text("asTesting")} · Cost: ${text("asCost")}`],
      ["Key findings & risks", `${text("findings")}\n${text("risks")}`],
      ["Recommendations", `Action: ${text("action")}\n${text("recommendations")}\n${text("improvements")}`],
      ["Comments", `Assessor: ${text("assessorComments")}\nCustomer: ${text("customerComments")}`],
    ]), { x: 0.55, y: 4.2, w: 12.2, colW: [2.2, 10], rowH: 0.65, fontSize: 8.5 });
  }

  const output = await pptx.write({ outputType: "blob", compression: true });
  if (!(output instanceof Blob)) throw new Error("PowerPoint generation did not return a downloadable file.");
  downloadBlob(output, `Unleashed-Backup-DR-BC-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pptx`);
}
