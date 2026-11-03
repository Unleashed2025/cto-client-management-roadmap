import type PptxGenJS from "pptxgenjs";
import type { AssessmentAnswer, AssessmentDepth, BenchmarkDefinition } from "./compliance-benchmarks";
import { AI_ORGANISATION_FIELDS, AI_REMEDIATION_PHASES, AI_SCORE_RATINGS, calculateAiReadiness, collectAiFindings, type AiFinding, type AiScoreValue } from "./ai-data-readiness";
import { downloadBlob } from "./download-file";
import { MSP_SECTION_CAPTURE, formatGbp, mspSectionNotesKey, summariseServices, type MspQuestionExtras, type ServiceRow } from "./msp-review";

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
};

type BenchmarkResponse = { answer: AssessmentAnswer; evidence: string; score?: AiScoreValue; finding?: Partial<AiFinding>; extras?: Partial<MspQuestionExtras> };

function scoreLabel(score: AiScoreValue): string {
  if (score === "na") return "N/A";
  if (score === null || score === undefined) return "Not scored";
  return `${score} – ${AI_SCORE_RATINGS[score]?.label ?? ""}`;
}

function answerLabel(answer: AssessmentAnswer): string {
  return {
    "not-assessed": "Not assessed",
    pass: "Pass",
    partial: "Partial",
    fail: "Fail",
    "not-applicable": "Not applicable",
  }[answer];
}

function tableRows(headers: string[], rows: string[][]): PptxGenJS.TableRow[] {
  return [
    headers.map((header) => ({
      text: header,
      options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, valign: "middle" as const },
    })),
    ...rows.map((row) => row.map((cell) => ({ text: cell, options: { color: "1E293B", fill: { color: COLORS.white }, valign: "top" as const } }))),
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
    console.error("Unable to load compliance report logo", error);
    return null;
  }
}

export async function exportCompliancePowerPoint(
  benchmark: BenchmarkDefinition,
  responses: Record<string, BenchmarkResponse>,
  clientName: string,
  cisTier: 1 | 2 | 3,
  assessmentDepth: AssessmentDepth,
  organisation: Record<string, string> = {},
  serviceRows: ServiceRow[] = [],
) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const logo = await logoDataUrl();
  const assessmentLabel = assessmentDepth === "pre" ? "Pre-readiness assessment" : "Full readiness assessment";
  const sourceQuestions = assessmentDepth === "pre" ? benchmark.preQuestions : benchmark.fullQuestions;
  const questions = sourceQuestions.filter((question) => benchmark.id !== "cis" || assessmentDepth === "pre" || (question.tier ?? 1) <= cisTier);
  const sections = [...new Set(questions.map((question) => question.section))];
  const counts = questions.reduce((summary, question) => {
    const answer = responses[question.id]?.answer ?? "not-assessed";
    summary[answer] += 1;
    return summary;
  }, { "not-assessed": 0, pass: 0, partial: 0, fail: 0, "not-applicable": 0 } as Record<AssessmentAnswer, number>);
  const assessed = counts.pass + counts.partial + counts.fail + counts["not-applicable"];
  const applicable = questions.length - counts["not-applicable"];
  const readiness = applicable > 0 ? Math.round(((counts.pass + counts.partial * 0.5) / applicable) * 100) : 0;
  const passReady = questions.length > 0 && assessed === questions.length && counts.partial === 0 && counts.fail === 0;
  const maturity = benchmark.scoring === "maturity";
  const isMsp = benchmark.id === "msp-supplier-review";
  const aiResult = maturity ? calculateAiReadiness(questions, (id) => responses[id]?.score) : null;

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Unleashed";
  pptx.company = "Unleashed";
  pptx.subject = `${benchmark.title} ${assessmentLabel.toLowerCase()}`;
  pptx.title = `${benchmark.title} — ${assessmentLabel} — ${clientName}`;
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };
  let slideNumber = 0;

  const addLogo = (slide: PptxGenJS.Slide) => {
    if (logo) slide.addImage({ data: logo, x: 10.65, y: 0.27, w: 2.15, h: 2.15 * (397 / 1822) });
    else slide.addText("UNLEASHED", { x: 10.65, y: 0.27, w: 2.15, h: 0.32, color: COLORS.white, bold: true, fontSize: 17, align: "right" });
  };
  const addHeader = (slide: PptxGenJS.Slide, title: string, subtitle: string, color = COLORS.purple) => {
    slideNumber += 1;
    slide.background = { color: COLORS.bg };
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.28, y: 0.18, w: 12.77, h: 0.78, rectRadius: 0.08, fill: { color: COLORS.navy }, line: { color: COLORS.navy } });
    slide.addShape(pptx.ShapeType.rect, { x: 0.52, y: 0.38, w: 0.68, h: 0.37, fill: { color }, line: { color } });
    slide.addText(String(slideNumber).padStart(2, "0"), { x: 0.52, y: 0.42, w: 0.68, h: 0.2, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
    slide.addText(title, { x: 1.42, y: 0.31, w: 8.5, h: 0.3, bold: true, fontSize: 20, color: COLORS.white, margin: 0 });
    slide.addText(subtitle, { x: 1.42, y: 0.65, w: 8.5, h: 0.16, fontSize: 8, color: "D8F3FF", margin: 0 });
    addLogo(slide);
    slide.addShape(pptx.ShapeType.rect, { x: 0.28, y: 0.96, w: 4.26, h: 0.05, fill: { color: COLORS.cyan }, line: { color: COLORS.cyan } });
    slide.addShape(pptx.ShapeType.rect, { x: 4.54, y: 0.96, w: 4.26, h: 0.05, fill: { color: COLORS.purple }, line: { color: COLORS.purple } });
    slide.addShape(pptx.ShapeType.rect, { x: 8.8, y: 0.96, w: 4.25, h: 0.05, fill: { color: COLORS.pink }, line: { color: COLORS.pink } });
  };
  const addFooter = (slide: PptxGenJS.Slide, text: string) => {
    slide.addText(text, { x: 0.55, y: 7.16, w: 12.2, h: 0.16, fontSize: 7.5, italic: true, color: COLORS.slate, margin: 0 });
  };

  const cover = pptx.addSlide();
  slideNumber += 1;
  cover.background = { color: COLORS.navy };
  cover.addShape(pptx.ShapeType.ellipse, { x: 11.35, y: -0.65, w: 2.5, h: 2.5, fill: { color: "0A5CAE" }, line: { color: "0A5CAE" } });
  cover.addShape(pptx.ShapeType.ellipse, { x: -0.62, y: 6.28, w: 2.1, h: 2.1, fill: { color: COLORS.pink }, line: { color: COLORS.pink } });
  addLogo(cover);
  cover.addShape(pptx.ShapeType.roundRect, { x: 0.65, y: 1.1, w: 2.5, h: 0.42, rectRadius: 0.05, fill: { color: COLORS.cyan }, line: { color: COLORS.cyan } });
  cover.addText("COMPLIANCE BENCHMARK", { x: 0.65, y: 1.22, w: 2.5, h: 0.16, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
  cover.addText(benchmark.title, { x: 0.65, y: 2.05, w: 10.8, h: 0.75, bold: true, fontSize: 30, color: COLORS.white, margin: 0 });
  cover.addText(clientName, { x: 0.65, y: 3.08, w: 10.7, h: 0.4, fontSize: 20, bold: true, color: COLORS.white, margin: 0 });
  cover.addText(`${assessmentLabel} · ${benchmark.version} · Generated ${new Date().toLocaleDateString("en-GB")}`, { x: 0.65, y: 3.65, w: 10.5, h: 0.25, fontSize: 11, color: "D8F3FF", margin: 0 });
  cover.addText("Indicative readiness assessment — not a certification decision.", { x: 0.65, y: 6.9, w: 8.5, h: 0.22, fontSize: 10, color: COLORS.cyan, margin: 0 });

  const summary = pptx.addSlide();
  addHeader(summary, "Readiness Summary", `${clientName} · ${benchmark.title} · ${assessmentLabel}`, COLORS.purple);
  const metrics = [
    ["Questions", questions.length, COLORS.navy],
    ["Assessed", `${aiResult ? aiResult.scored : assessed}/${questions.length}`, COLORS.purple],
    [aiResult ? "At or above minimum" : "Pass", aiResult ? aiResult.scored - aiResult.belowMinimum : counts.pass, "059669"],
    ["Readiness", `${aiResult ? aiResult.percent : readiness}%`, COLORS.cyan],
  ] as const;
  metrics.forEach(([label, value, color], index) => {
    const x = 0.55 + index * 3.15;
    summary.addShape(pptx.ShapeType.roundRect, { x, y: 1.3, w: 2.82, h: 0.95, rectRadius: 0.06, fill: { color }, line: { color } });
    summary.addText(String(value), { x: x + 0.16, y: 1.48, w: 2.3, h: 0.28, bold: true, fontSize: 24, color: color === COLORS.cyan ? COLORS.navy : COLORS.white, margin: 0 });
    summary.addText(label.toUpperCase(), { x: x + 0.16, y: 1.88, w: 2.3, h: 0.16, bold: true, fontSize: 8, color: color === COLORS.cyan ? COLORS.navy : COLORS.white, margin: 0 });
  });
  const resultColor = aiResult
    ? aiResult.scored === 0 ? COLORS.slate : aiResult.band.status === "Green" ? "059669" : aiResult.band.status === "Amber" ? "B45309" : "B91C1C"
    : passReady ? "059669" : counts.fail + counts.partial + counts["not-assessed"] > 0 ? "B91C1C" : COLORS.slate;
  const resultText = aiResult
    ? aiResult.scored === 0 ? "NOT YET SCORED" : `${aiResult.band.status.toUpperCase()} — ${aiResult.band.label.toUpperCase()}`
    : passReady ? "PASS-READY" : assessed > 0 ? "FAIL / NOT READY" : "NOT YET ASSESSED";
  summary.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: 2.65, w: 12.2, h: 1.15, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: resultColor, pt: 2 } });
  summary.addText(aiResult ? (isMsp ? "WEIGHTED SUPPLIER REVIEW RESULT" : "WEIGHTED AI READINESS RESULT") : "INDICATIVE CURRENT-STATE RESULT", { x: 0.82, y: 2.92, w: 4.2, h: 0.18, fontSize: 9, bold: true, color: resultColor, margin: 0 });
  summary.addText(resultText, { x: 0.82, y: 3.2, w: 11.4, h: 0.3, fontSize: 21, bold: true, color: resultColor, margin: 0 });
  if (aiResult && aiResult.criticalControls.length > 0) {
    summary.addText(`Critical deficiency (score 0): ${aiResult.criticalControls.map((question) => question.reference).join(", ")} — result capped at Amber.`, { x: 5.4, y: 2.92, w: 7.2, h: 0.18, fontSize: 9, bold: true, color: "B91C1C", align: "right", margin: 0 });
  }
  summary.addTable(aiResult ? tableRows(
    ["Section (weight)", "Avg /5"],
    aiResult.sectionScores.map((item) => [`${item.section} (${item.weight}%)`, item.average === null ? "—" : item.average.toFixed(1)]),
  ) : tableRows(
    ["Result", "Count"],
    [
      ["Pass", String(counts.pass)],
      ["Partial", String(counts.partial)],
      ["Fail", String(counts.fail)],
      ["Not assessed", String(counts["not-assessed"])],
      ["Not applicable", String(counts["not-applicable"])],
    ],
  ), { x: 0.55, y: 4.2, w: 4.2, h: 2.2, colW: [2.7, 1.5], rowH: aiResult ? 0.25 : 0.34, fontSize: aiResult ? 8 : 9, margin: 0.05, border: { color: COLORS.line, pt: 1 }, autoPage: false });
  summary.addShape(pptx.ShapeType.roundRect, { x: 5.05, y: 4.2, w: 7.7, h: 2.2, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
  summary.addText("Assessment basis", { x: 5.35, y: 4.5, w: 2.5, h: 0.25, bold: true, fontSize: 14, color: COLORS.navy, margin: 0 });
  summary.addText(`${benchmark.notice}\n\nOfficial source: ${benchmark.sourceUrl}`, { x: 5.35, y: 4.95, w: 7.05, h: 1.05, fontSize: 10, color: COLORS.slate, breakLine: false, margin: 0 });
  addFooter(summary, "All content is editable. Validate findings against the authoritative framework and independent assessor requirements.");

  const charts = pptx.addSlide();
  addHeader(charts, "Results at a Glance", `${clientName} · ${benchmark.title} · ${assessmentLabel}`, COLORS.cyan);
  const panel = (x: number, w: number, title: string) => {
    charts.addShape(pptx.ShapeType.roundRect, { x, y: 3.2, w, h: 3.8, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
    charts.addText(title, { x: x + 0.25, y: 3.32, w: w - 0.5, h: 0.3, bold: true, fontSize: 14, color: COLORS.navy, margin: 0 });
  };
  const labelFont = { catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, catAxisLabelColor: "334155", valAxisLabelColor: "64748B", valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" as const } };
  const dial = (x: number, value: number, title: string, caption: string) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const color = v >= 75 ? "059669" : v >= 50 ? "F59E0B" : "B91C1C";
    charts.addShape(pptx.ShapeType.roundRect, { x, y: 1.3, w: 3.95, h: 1.75, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
    charts.addChart(pptx.ChartType.doughnut, [{ name: title, labels: [title, "Remaining"], values: [v, 100 - v] }], {
      x: x + 0.12, y: 1.38, w: 1.6, h: 1.6, holeSize: 72, chartColors: [color, "E2E8F0"], showLegend: false, showLabel: false, showValue: false, showPercent: false, dataBorder: { pt: 0, color: "FFFFFF" },
    });
    charts.addText(`${v}%`, { x: x + 0.12, y: 1.9, w: 1.6, h: 0.5, align: "center", bold: true, fontSize: 20, color, margin: 0 });
    charts.addText(title, { x: x + 1.85, y: 1.75, w: 1.95, h: 0.3, bold: true, fontSize: 13, color: COLORS.navy, margin: 0 });
    charts.addText(caption, { x: x + 1.85, y: 2.1, w: 1.95, h: 0.6, fontSize: 9, color: COLORS.slate, valign: "top", margin: 0 });
  };
  const pctOf = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
  if (aiResult) {
    dial(0.55, aiResult.percent, "Readiness", "Weighted AI-readiness score");
    dial(4.675, pctOf(aiResult.scored, questions.length), "Completion", `${aiResult.scored} of ${questions.length} controls scored`);
    dial(8.8, pctOf(aiResult.scored - aiResult.belowMinimum, aiResult.scored), "At / above minimum", `${aiResult.belowMinimum} control(s) below the minimum`);
  } else {
    dial(0.55, readiness, "Readiness", "Pass = 1, partial = 0.5 of applicable");
    dial(4.675, pctOf(assessed, questions.length), "Completion", `${assessed} of ${questions.length} questions assessed`);
    dial(8.8, pctOf(counts.pass, applicable), "Pass rate", `${counts.pass} of ${applicable} applicable passed`);
  }
  const shortSection = (name: string) => (name.length > 34 ? `${name.slice(0, 33)}…` : name);
  panel(0.55, 4.6, maturity ? "Score distribution" : "Result breakdown");
  panel(5.4, 7.35, maturity ? "Average score by section (0–5)" : "Results by section");
  if (maturity) {
    const bands = [0, 1, 2, 3, 4, 5].map((value) => questions.filter((question) => responses[question.id]?.score === value).length);
    charts.addChart(pptx.ChartType.doughnut, [{ name: "Controls", labels: ["0", "1", "2", "3", "4", "5"].map((v) => `Score ${v}`), values: bands }], {
      x: 0.7, y: 3.65, w: 4.3, h: 3.3, holeSize: 55, chartColors: ["B91C1C", "F97316", "F59E0B", "84CC16", "10B981", "059669"],
      showLegend: true, legendPos: "b", legendFontSize: 9, showPercent: false, showValue: true, dataLabelColor: COLORS.white, dataLabelFontSize: 10, dataBorder: { pt: 1, color: "FFFFFF" },
    });
    const sectionData = [...(aiResult?.sectionScores ?? [])].reverse();
    charts.addChart(pptx.ChartType.bar, [{ name: "Average", labels: sectionData.map((item) => shortSection(item.section)), values: sectionData.map((item) => item.average ?? 0) }], {
      x: 5.55, y: 3.65, w: 7.05, h: 3.3, barDir: "bar", valAxisMinVal: 0, valAxisMaxVal: 5, valAxisMajorUnit: 1,
      chartColors: sectionData.map((item) => ((item.average ?? 0) >= 4 ? "059669" : (item.average ?? 0) >= 2.5 ? "F59E0B" : "B91C1C")),
      showValue: true, dataLabelFontSize: 9, dataLabelFormatCode: "0.0", barGapWidthPct: 45, showLegend: false, ...labelFont,
    });
  } else {
    charts.addChart(pptx.ChartType.doughnut, [{ name: "Results", labels: ["Pass", "Partial", "Fail", "Not assessed", "Not applicable"], values: [counts.pass, counts.partial, counts.fail, counts["not-assessed"], counts["not-applicable"]] }], {
      x: 0.7, y: 3.65, w: 4.3, h: 3.3, holeSize: 55, chartColors: ["059669", "F59E0B", "B91C1C", "94A3B8", "CBD5E1"],
      showLegend: true, legendPos: "b", legendFontSize: 9, showPercent: false, showValue: true, dataLabelColor: COLORS.white, dataLabelFontSize: 10, dataBorder: { pt: 1, color: "FFFFFF" },
    });
    const rev = [...sections].reverse();
    const perSection = (answer: AssessmentAnswer) => rev.map((section) => questions.filter((question) => question.section === section && (responses[question.id]?.answer ?? "not-assessed") === answer).length);
    charts.addChart(pptx.ChartType.bar, [
      { name: "Pass", labels: rev.map(shortSection), values: perSection("pass") },
      { name: "Partial", labels: rev.map(shortSection), values: perSection("partial") },
      { name: "Fail", labels: rev.map(shortSection), values: perSection("fail") },
      { name: "Not assessed", labels: rev.map(shortSection), values: perSection("not-assessed") },
    ], {
      x: 5.55, y: 3.65, w: 7.05, h: 3.3, barDir: "bar", barGrouping: "stacked", chartColors: ["059669", "F59E0B", "B91C1C", "94A3B8"],
      showLegend: true, legendPos: "b", legendFontSize: 9, barGapWidthPct: 40, ...labelFont,
    });
  }
  addFooter(charts, "Charts are native PowerPoint objects — right-click to edit data or restyle.");

  if (maturity) {
    const orgSlide = pptx.addSlide();
    addHeader(orgSlide, "Organisation Information", `${clientName} · ${benchmark.title}`, COLORS.cyan);
    orgSlide.addTable(tableRows(
      ["Field", "Response"],
      (benchmark.organisationFields ?? AI_ORGANISATION_FIELDS).map((field) => [`${field.id} · ${field.label}`, organisation[field.id]?.trim() || "Not recorded"]),
    ), { x: 0.55, y: 1.3, w: 12.2, colW: [4.2, 8], rowH: 0.34, fontSize: 8.5, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    addFooter(orgSlide, "Organisation information is not scored.");
  }

  for (const section of sections) {
    const sectionQuestions = questions.filter((question) => question.section === section);
    for (let start = 0; start < sectionQuestions.length; start += 6) {
      const pageQuestions = sectionQuestions.slice(start, start + 6);
      const slide = pptx.addSlide();
      const page = Math.floor(start / 6) + 1;
      const pages = Math.ceil(sectionQuestions.length / 6);
      addHeader(slide, pages > 1 ? `${section} (${page}/${pages})` : section, `${clientName} · ${benchmark.shortTitle} · ${assessmentLabel}`, COLORS.purple);
      slide.addTable(tableRows(
        ["Question", "Result", "Client Answer / Evidence"],
        pageQuestions.map((question) => {
          const response = responses[question.id] ?? { answer: "not-assessed" as AssessmentAnswer, evidence: "" };
          const prefixes = [
            question.reference,
            question.tier ? `IG${question.tier}` : "",
            question.answerType,
          ].filter(Boolean).join(" · ");
          return [`${prefixes ? `${prefixes}\n` : ""}${question.prompt}`, maturity ? scoreLabel(response.score) : answerLabel(response.answer), response.evidence || "No answer or evidence recorded"];
        }),
      ), {
        x: 0.55,
        y: 1.3,
        w: 12.2,
        h: 5.75,
        colW: [6.1, 1.35, 4.75],
        rowH: [0.35, ...pageQuestions.map(() => 0.9)],
        fontSize: 8.2,
        margin: 0.055,
        border: { color: COLORS.line, pt: 0.8 },
        autoPage: false,
      });
      addFooter(slide, `${pageQuestions.length} of ${sectionQuestions.length} section question(s) · ${benchmark.sourceLabel}`);
    }
  }

  if (isMsp) {
    const noted = sections.filter((section) => organisation[mspSectionNotesKey(section)]?.trim());
    if (noted.length > 0) {
      const slide = pptx.addSlide();
      addHeader(slide, "Section Supporting Data", `${clientName} · ${benchmark.shortTitle}`, COLORS.cyan);
      slide.addTable(tableRows(
        ["Section", "Supporting data"],
        noted.map((section) => [`${section}${MSP_SECTION_CAPTURE[section] ? `\n${MSP_SECTION_CAPTURE[section]}` : ""}`, organisation[mspSectionNotesKey(section)].trim()]),
      ), { x: 0.55, y: 1.3, w: 12.2, colW: [4.2, 8], fontSize: 8, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: true });
    }

    const flagged = questions.filter((question) => {
      const extras = responses[question.id]?.extras;
      return extras && Object.values(extras).some((value) => value?.trim());
    });
    for (let start = 0; start < flagged.length; start += 4) {
      const page = flagged.slice(start, start + 4);
      const slide = pptx.addSlide();
      addHeader(slide, `Assessor Findings (${Math.floor(start / 4) + 1}/${Math.ceil(flagged.length / 4)})`, `${clientName} · ${benchmark.shortTitle}`, COLORS.pink);
      slide.addTable(tableRows(
        ["Question", "Importance / position", "Risk / issue", "Recommendation", "Future requirement / customer comments"],
        page.map((question) => {
          const extras = responses[question.id]?.extras ?? {};
          return [
            `${question.reference}\n${question.prompt}`,
            `${extras.importance || "—"}\n${extras.position || "—"}`,
            extras.risk || "—",
            extras.recommendation || "—",
            [extras.futureRequirement, extras.customerComments].filter(Boolean).join("\n\n") || "—",
          ];
        }),
      ), { x: 0.55, y: 1.3, w: 12.2, colW: [3.2, 1.5, 2.5, 2.5, 2.5], rowH: [0.35, ...page.map(() => 1.3)], fontSize: 8, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
      addFooter(slide, `${page.length} of ${flagged.length} annotated question(s)`);
    }

    const costs = summariseServices(serviceRows);
    const register = pptx.addSlide();
    addHeader(register, "Commercial Summary", `${clientName} · Service, product & cost register`, COLORS.purple);
    register.addTable(tableRows(
      ["Measure", "Value"],
      [
        ["Monthly recurring cost", formatGbp(costs.totals.monthlyRecurring)],
        ["Annual recurring cost", formatGbp(costs.totals.annualRecurring)],
        ["Usage-based cost / year", formatGbp(costs.totals.usage)],
        ["One-off + upfront cost", formatGbp(costs.totals.oneOff + costs.totals.upfront)],
        ["First-year cost", formatGbp(costs.totals.firstYear)],
        ["3-year cost", formatGbp(costs.totals.threeYear)],
        ["Total contract value", formatGbp(costs.totals.contractValue)],
        ["Unused licence cost / year", formatGbp(costs.totals.unusedLicenceCost)],
      ],
    ), { x: 0.55, y: 1.3, w: 5.2, colW: [3.2, 2], rowH: 0.34, fontSize: 9, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    register.addTable(tableRows(
      ["Category", "Services", "Annual recurring"],
      costs.byCategory.filter((item) => item.count > 0).map((item) => [item.category, String(item.count), formatGbp(item.annual)]),
    ), { x: 6.1, y: 1.3, w: 6.65, colW: [3.6, 1.2, 1.85], rowH: 0.3, fontSize: 9, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    const names = (rows: ServiceRow[]) => rows.map((row) => row.name || row.product).join(", ") || "None";
    register.addTable(tableRows(
      ["Optimisation flag", "Detail"],
      [
        ["Unused licences", names(costs.unusedLicences)],
        ["Possible duplicates", costs.duplicates.join(", ") || "None"],
        ["Unknown costs", names(costs.unknownCosts)],
        ["Unknown renewal dates", names(costs.unknownRenewals)],
        ["Renewing within 6 months", names(costs.renewingSoon)],
        ["End of support within 12 months", names(costs.endOfSupport)],
      ],
    ), { x: 0.55, y: 4.3, w: 12.2, colW: [3.2, 9], rowH: 0.36, fontSize: 9, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    addFooter(register, `${serviceRows.filter((row) => row.name.trim() || row.product.trim()).length} service(s) recorded in the register.`);

    const listed = serviceRows.filter((row) => row.name.trim() || row.product.trim());
    for (let start = 0; start < listed.length; start += 8) {
      const page = listed.slice(start, start + 8);
      const slide = pptx.addSlide();
      addHeader(slide, `Service Register (${Math.floor(start / 8) + 1}/${Math.ceil(listed.length / 8)})`, `${clientName} · ${benchmark.shortTitle}`, COLORS.cyan);
      slide.addTable(tableRows(
        ["Service", "Category / supplier", "Annual cost", "Renewal", "Outcome"],
        page.map((row) => [
          `${row.name || row.product}${row.owner ? `\nOwner: ${row.owner}` : ""}`,
          `${row.category}\n${row.supplier || "—"}`,
          formatGbp(summariseServices([row]).totals.firstYear),
          row.renewalDate || row.contractEnd || "Unknown",
          row.outcome || "Not decided",
        ]),
      ), { x: 0.55, y: 1.3, w: 12.2, colW: [3.6, 3, 1.8, 1.8, 2], rowH: 0.6, fontSize: 9, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    }
  }

  if (aiResult && !isMsp) {
    const findings = collectAiFindings(questions, (id) => responses[id]);
    const roadmap = pptx.addSlide();
    addHeader(roadmap, "Remediation Roadmap", `${clientName} · Secure → Clean → Govern → Enable → Measure`, COLORS.pink);
    roadmap.addTable(tableRows(
      ["Phase", "Purpose", "Findings", "Critical / High"],
      AI_REMEDIATION_PHASES.map(([phase, description]) => {
        const phaseFindings = findings.filter((entry) => entry.phase === phase);
        return [phase, description, String(phaseFindings.length), String(phaseFindings.filter((entry) => entry.risk === "Critical" || entry.risk === "High").length)];
      }),
    ), { x: 0.55, y: 1.3, w: 12.2, colW: [1.8, 7.2, 1.4, 1.8], rowH: 0.6, fontSize: 10, margin: 0.06, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    addFooter(roadmap, `Built from ${findings.length} control(s) scored below the minimum AI-ready score.`);

    for (let start = 0; start < findings.length; start += 3) {
      const page = findings.slice(start, start + 3);
      const slide = pptx.addSlide();
      addHeader(slide, `Detailed Findings (${Math.floor(start / 3) + 1}/${Math.ceil(findings.length / 3)})`, `${clientName} · ${benchmark.shortTitle}`, COLORS.pink);
      slide.addTable(tableRows(
        ["Finding", "Risk / Phase", "Situation & impact", "Recommendation & action", "Owner / Date / Status"],
        page.map((entry) => [
          `${entry.question.reference} (score ${entry.score})\n${entry.finding.title || entry.question.prompt}`,
          `${entry.risk}\n${entry.phase}`,
          [entry.finding.currentSituation, entry.finding.impact].filter(Boolean).join("\n\n") || "Not recorded",
          [entry.finding.recommendation, entry.finding.action].filter(Boolean).join("\n\n") || "Not recorded",
          `${entry.finding.owner || "Unassigned"}\n${entry.finding.targetDate || "No date"}\n${entry.finding.status}${entry.finding.retest ? `\nRetest: ${entry.finding.retest}` : ""}`,
        ]),
      ), { x: 0.55, y: 1.3, w: 12.2, colW: [3, 1.3, 3, 3, 1.9], rowH: [0.35, ...page.map(() => 1.72)], fontSize: 8, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
      addFooter(slide, `${page.length} of ${findings.length} finding(s)`);
    }
  }

  const output = await pptx.write({ outputType: "blob", compression: true });
  if (!(output instanceof Blob)) throw new Error("Compliance PowerPoint generation did not return a downloadable file.");
  downloadBlob(
    output,
    `Unleashed-${benchmark.shortTitle.replace(/[^a-z0-9]+/gi, "-")}-${assessmentDepth}-readiness-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pptx`,
  );
}
