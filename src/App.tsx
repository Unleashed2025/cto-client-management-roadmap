import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Plus,
  Presentation,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_SLUGS,
  assessRows,
  categoryGroups,
  createBlankAudit,
  createEmptyRow,
  parseAuditWorkbook,
  type AssetCategorySlug,
  type AssetFieldConfig,
  type AuditContact,
  type AuditRow,
  type BrowserAudit,
  type HighLevelInfo,
} from "./audit-model";
import { exportPowerPointReport } from "./powerpoint-report";
import { exportCompliancePowerPoint } from "./compliance-powerpoint";
import {
  BENCHMARKS,
  type AssessmentAnswer,
  type AssessmentDepth,
  type BenchmarkDefinition,
  type BenchmarkId,
} from "./compliance-benchmarks";
import {
  AI_MINIMUM_READY_SCORE,
  AI_ORGANISATION_FIELDS,
  AI_REMEDIATION_PHASES,
  AI_REMEDIATION_STATUSES,
  AI_RISK_LEVELS,
  AI_SCORE_RATINGS,
  EMPTY_AI_FINDING,
  aiScoreToAnswer,
  calculateAiReadiness,
  collectAiFindings,
  defaultPhase,
  defaultRisk,
  type AiFinding,
  type AiScoreValue,
} from "./ai-data-readiness";
import { MspRegister } from "./MspRegister";
import { EMPTY_MSP_EXTRAS, MSP_IMPORTANCE, MSP_POSITIONS, MSP_SECTION_CAPTURE, mspSectionNotesKey, type MspQuestionExtras, type ServiceRow } from "./msp-review";

type ViewKey = "overview" | "high-level" | "compliance-overview" | `compliance:${BenchmarkId}` | AssetCategorySlug;
type BenchmarkResponse = { answer: AssessmentAnswer; evidence: string; score?: AiScoreValue; finding?: Partial<AiFinding>; extras?: Partial<MspQuestionExtras> };
type BenchmarkResponseSet = Record<string, BenchmarkResponse>;
type OrganisationValues = Record<string, string>;

const INITIAL_VISIBLE_ROWS = 200;

type HighLevelField = { key: keyof Omit<HighLevelInfo, "contacts">; label: string; type?: string };

const HIGH_LEVEL_SECTIONS: Array<{ title: string; description: string; accent: string; fields: HighLevelField[] }> = [
  {
    title: "Organisation",
    description: "Trust or organisation identity",
    accent: "bg-[#071A3F]",
    fields: [{ key: "schoolTrustName", label: "School / Trust Name" }],
  },
  {
    title: "Site",
    description: "Primary audited location",
    accent: "bg-[#00D4FF]",
    fields: [
      { key: "siteName", label: "Site Name" },
      { key: "addressLine1", label: "Address Line 1" },
      { key: "addressLine2", label: "Address Line 2" },
      { key: "townCity", label: "Town / City" },
      { key: "county", label: "County" },
      { key: "postcode", label: "Postcode" },
    ],
  },
  {
    title: "Audit",
    description: "Audit ownership and date",
    accent: "bg-[#7E3AED]",
    fields: [
      { key: "auditDate", label: "Audit Date", type: "date" },
      { key: "auditor", label: "Auditor" },
    ],
  },
  {
    title: "Estate size",
    description: "Headline people and device counts",
    accent: "bg-[#FF2AA0]",
    fields: [
      { key: "staffCount", label: "Number of Staff", type: "number" },
      { key: "studentCount", label: "Number of Students", type: "number" },
      { key: "deviceCount", label: "Number of Devices", type: "number" },
    ],
  },
];

function rowTitle(row: AuditRow): string {
  return String(row[ASSET_CATEGORIES[row.auditCategory].titleField] ?? "Untitled item");
}

function FieldEditor({
  field,
  value,
  onChange,
  compact = false,
}: {
  field: AssetFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  compact?: boolean;
}) {
  const className = compact
    ? "min-w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#7E3AED] focus:ring-2 focus:ring-[#7E3AED]/10"
    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#7E3AED] focus:ring-2 focus:ring-[#7E3AED]/10";

  if (field.type === "select") {
    return (
      <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={className}>
        <option value="">Select...</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean") {
    const selected = value === true ? "true" : value === false ? "false" : "partial";
    return (
      <select
        value={selected}
        onChange={(event) => onChange(event.target.value === "true" ? true : event.target.value === "false" ? false : null)}
        className={className}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
        <option value="partial">Partial / Unknown</option>
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        rows={compact ? 2 : 3}
        className={`${className} min-w-48 resize-y`}
      />
    );
  }
  const dateIsIso = field.type !== "date" || !value || /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" && dateIsIso ? "date" : "text"}
      value={String(value ?? "")}
      onChange={(event) => onChange(field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
      className={className}
    />
  );
}

function AddItemModal({
  category,
  onClose,
  onSave,
}: {
  category: AssetCategorySlug;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
}) {
  const config = ASSET_CATEGORIES[category];
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071A3F]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[26px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Asset workspace</p>
            <h2 className="mt-1 text-2xl font-black">Add {config.label} Item</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid max-h-[68vh] gap-4 overflow-y-auto p-6 md:grid-cols-2">
          {config.fields.map((field) => (
            <label key={field.key} className={field.type === "textarea" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
              <span className="text-xs font-bold text-slate-600">
                {field.label}{field.required && <span className="text-[#FF2AA0]"> *</span>}
              </span>
              <FieldEditor field={field} value={values[field.key]} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
          <button
            onClick={() => {
              onSave(values);
              onClose();
            }}
            className="rounded-xl bg-[#7E3AED] px-5 py-2.5 text-sm font-black text-white"
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ row }: { row: AuditRow }) {
  if (row.flagged) {
    return (
      <div className="flex min-w-64 items-start gap-2 text-xs text-red-700">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{row.flagReasons.join("; ")}</span>
      </div>
    );
  }
  if (row.warnReasons.length > 0) {
    return (
      <div className="flex min-w-64 items-start gap-2 text-xs text-amber-700">
        <Clock3 className="mt-0.5 size-4 shrink-0" />
        <span>{row.warnReasons.join("; ")}</span>
      </div>
    );
  }
  return (
    <div className="flex min-w-44 items-center gap-2 text-xs text-emerald-700">
      <CheckCircle2 className="size-4" /> No critical flag
    </div>
  );
}

function ComplianceAssessment({
  benchmark,
  responses,
  assessmentDepth,
  onAssessmentDepthChange,
  cisTier,
  onCisTierChange,
  onChange,
  onReset,
  onBack,
  onExport,
  exporting,
  organisation,
  onOrganisationChange,
}: {
  benchmark: BenchmarkDefinition;
  responses: BenchmarkResponseSet;
  assessmentDepth: AssessmentDepth;
  onAssessmentDepthChange: (depth: AssessmentDepth) => void;
  cisTier: 1 | 2 | 3;
  onCisTierChange: (tier: 1 | 2 | 3) => void;
  onChange: (questionId: string, patch: Partial<BenchmarkResponse>) => void;
  onReset: () => void;
  onBack: () => void;
  onExport: () => void;
  exporting: boolean;
  organisation: OrganisationValues;
  onOrganisationChange: (fieldId: string, value: string) => void;
}) {
  const maturity = benchmark.scoring === "maturity";
  const isMsp = benchmark.id === "msp-supplier-review";
  const orgFields = benchmark.organisationFields ?? AI_ORGANISATION_FIELDS;
  const assessmentQuestions = assessmentDepth === "pre" ? benchmark.preQuestions : benchmark.fullQuestions;
  const visibleQuestions = assessmentQuestions.filter((question) => benchmark.id !== "cis" || assessmentDepth === "pre" || (question.tier ?? 1) <= cisTier);
  const result = visibleQuestions.reduce((summary, question) => {
    const answer = responses[question.id]?.answer ?? "not-assessed";
    summary[answer] += 1;
    return summary;
  }, { "not-assessed": 0, pass: 0, partial: 0, fail: 0, "not-applicable": 0 } as Record<AssessmentAnswer, number>);
  const assessed = result.pass + result.partial + result.fail + result["not-applicable"];
  const applicable = visibleQuestions.length - result["not-applicable"];
  const score = applicable > 0 ? Math.round(((result.pass + result.partial * 0.5) / applicable) * 100) : 0;
  const ready = visibleQuestions.length > 0 && assessed === visibleQuestions.length && result.partial === 0 && result.fail === 0;
  const started = assessed > 0;
  const sections = [...new Set(visibleQuestions.map((question) => question.section))];
  const aiResult = maturity ? calculateAiReadiness(visibleQuestions, (id) => responses[id]?.score) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <button onClick={onBack} className="rounded-xl bg-[#EBF8FF] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#071A3F] ring-1 ring-[#00D4FF]/40 hover:bg-[#00D4FF]/15">← Back to homepage</button>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{benchmark.title}</h2>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{benchmark.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {benchmark.id === "cis" && assessmentDepth === "full" && (
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">
                Target group
                <select value={cisTier} onChange={(event) => onCisTierChange(Number(event.target.value) as 1 | 2 | 3)} className="bg-transparent font-black text-[#7E3AED] outline-none">
                  <option value={1}>IG1</option>
                  <option value={2}>IG2</option>
                  <option value={3}>IG3</option>
                </select>
              </label>
            )}
            <button onClick={onReset} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">Reset answers</button>
            <button onClick={onExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
              <Presentation className="size-4" /> {exporting ? "Generating..." : "PowerPoint report"}
            </button>
            <a href={benchmark.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#071A3F] px-4 py-2.5 text-sm font-black text-white">
              {benchmark.sourceLabel} <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">{benchmark.notice}</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            onClick={() => onAssessmentDepthChange("pre")}
            className={`rounded-2xl border-2 p-4 text-left ${assessmentDepth === "pre" ? "border-[#7E3AED] bg-[#7E3AED]/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7E3AED]">Pre-readiness assessment</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{benchmark.preQuestions.length} core questions for an initial benchmark screening.</p>
          </button>
          <button
            onClick={() => onAssessmentDepthChange("full")}
            className={`rounded-2xl border-2 p-4 text-left ${assessmentDepth === "full" ? "border-[#071A3F] bg-[#071A3F]/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#071A3F]">Full readiness assessment</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{benchmark.fullQuestions.length} detailed questions covering the full assessment structure.</p>
          </button>
        </div>
      </div>

      {maturity && (
        <section className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
          <h3 className="text-lg font-black">Organisation information <span className="text-xs font-bold text-slate-400">(not scored)</span></h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orgFields.map((field) => (
              <label key={field.id} className={`space-y-1.5 ${field.type === "textarea" ? "md:col-span-2 xl:col-span-3" : ""}`}>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{field.id} · {field.label}</span>
                {field.type === "textarea" ? (
                  <textarea value={organisation[field.id] ?? ""} onChange={(event) => onOrganisationChange(field.id, event.target.value)} rows={2} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]" />
                ) : (
                  <input type={field.type} value={organisation[field.id] ?? ""} onChange={(event) => onOrganisationChange(field.id, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]" />
                )}
              </label>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {AI_SCORE_RATINGS.map((rating) => (
              <div key={rating.score} className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black text-[#7E3AED]">{rating.score} · {rating.label}</p>
                <p className="mt-1 font-semibold leading-4 text-slate-500">{rating.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">Minimum {isMsp ? "acceptable" : "AI-ready"} score per question: {AI_MINIMUM_READY_SCORE}.</p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {(aiResult ? [
          ["Questions", visibleQuestions.length, "bg-[#071A3F] text-white"],
          ["Scored", `${aiResult.scored}/${visibleQuestions.length}`, "bg-[#7E3AED] text-white"],
          ["At or above minimum", aiResult.scored - aiResult.belowMinimum, "bg-emerald-600 text-white"],
          ["Below minimum", aiResult.belowMinimum, "bg-[#FF2AA0] text-white"],
          [isMsp ? "Supplier score" : "AI readiness", `${aiResult.percent}%`, "bg-[#00D4FF] text-[#071A3F]"],
        ] : [
          ["Questions", visibleQuestions.length, "bg-[#071A3F] text-white"],
          ["Assessed", `${assessed}/${visibleQuestions.length}`, "bg-[#7E3AED] text-white"],
          ["Pass", result.pass, "bg-emerald-600 text-white"],
          ["Partial / Fail", result.partial + result.fail, "bg-[#FF2AA0] text-white"],
          ["Readiness", `${score}%`, "bg-[#00D4FF] text-[#071A3F]"],
        ]).map(([label, value, className]) => (
          <div key={String(label)} className={`rounded-[22px] p-5 shadow-lg ${className}`}>
            <p className="text-2xl font-black">{String(value)}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em]">{String(label)}</p>
          </div>
        ))}
      </div>

      {aiResult ? (
        <div className={`rounded-[24px] border-2 p-5 ${aiResult.scored === 0 ? "border-slate-200 bg-white text-slate-700" : aiResult.band.status === "Green" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : aiResult.band.status === "Amber" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900"}`}>
          <p className="text-xs font-black uppercase tracking-[0.16em]">{isMsp ? "Weighted supplier review result" : "Weighted AI readiness result"}</p>
          <p className="mt-1 text-2xl font-black">{aiResult.scored === 0 ? "NOT YET SCORED" : `${aiResult.band.status.toUpperCase()} — ${aiResult.band.label.toUpperCase()}`}</p>
          <p className="mt-2 text-sm font-semibold">
            {aiResult.criticalControls.length > 0
              ? `${aiResult.criticalControls.length} control(s) scored 0 (critical deficiency: ${aiResult.criticalControls.map((question) => question.reference).join(", ")}). The overall result is capped at Amber until these are resolved.`
              : aiResult.scored === 0
                ? "Score each control 0–5 and record evidence to calculate weighted readiness."
                : `${aiResult.belowMinimum} of ${aiResult.scored} scored controls are below the minimum {isMsp ? "acceptable" : "AI-ready"} score of ${AI_MINIMUM_READY_SCORE}.`}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {aiResult.sectionScores.map((item) => (
              <div key={item.section} className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold">
                <span>{item.section} ({item.weight}%)</span>
                <span className="float-right font-black">{item.average === null ? "—" : `${item.average.toFixed(1)}/5`}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div className={`rounded-[24px] border-2 p-5 ${ready ? "border-emerald-300 bg-emerald-50 text-emerald-900" : started ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-700"}`}>
        <p className="text-xs font-black uppercase tracking-[0.16em]">Indicative current-state result</p>
        <p className="mt-1 text-2xl font-black">{ready ? "PASS-READY" : started ? "FAIL / NOT READY" : "NOT YET ASSESSED"}</p>
        <p className="mt-2 text-sm font-semibold">
          {ready
            ? "Every applicable question is marked Pass. Independent verification and the authoritative framework may still identify additional requirements."
            : started
              ? `${result.fail} failed, ${result.partial} partially met, and ${result["not-assessed"]} not yet assessed.`
              : "Answer the questions and record supporting evidence to calculate readiness."}
        </p>
      </div>
      )}

      {sections.map((section) => (
        <section key={section} className="overflow-hidden rounded-[26px] bg-white shadow-xl ring-1 ring-[#D9E7F5]">
          <div className="border-b border-slate-200 bg-[#071A3F] px-6 py-4 text-white">
            <h3 className="font-black">{section}</h3>
          </div>
          {isMsp && (
            <label className="block space-y-1.5 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Supporting data{MSP_SECTION_CAPTURE[section] ? ` · ${MSP_SECTION_CAPTURE[section]}` : ""}</span>
              <textarea
                value={organisation[mspSectionNotesKey(section)] ?? ""}
                onChange={(event) => onOrganisationChange(mspSectionNotesKey(section), event.target.value)}
                rows={3}
                placeholder="Record SLA metrics, licence/device/service details and other supporting data for this section..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]"
              />
            </label>
          )}
          <div className="divide-y divide-slate-200">
            {visibleQuestions.filter((question) => question.section === section).map((question, index) => {
              const response = responses[question.id] ?? { answer: "not-assessed" as AssessmentAnswer, evidence: "" };
              return (
                <div key={question.id} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_190px_minmax(280px,0.8fr)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EBF8FF] text-xs font-black text-[#7E3AED]">{index + 1}</span>
                      {question.reference && <span className="rounded-full bg-[#071A3F]/10 px-2 py-1 text-[10px] font-black text-[#071A3F]">{question.reference}</span>}
                      {question.tier && <span className="rounded-full bg-[#7E3AED]/10 px-2 py-1 text-[10px] font-black text-[#7E3AED]">IG{question.tier}</span>}
                      {question.answerType && <span className="rounded-full bg-[#00D4FF]/15 px-2 py-1 text-[10px] font-black text-[#075985]">{question.answerType}</span>}
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-900">{question.prompt}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{question.evidencePrompt}</p>
                    {(question.guidance || question.logic) && (
                      <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <summary className="cursor-pointer font-black text-slate-700">Question guidance and logic</summary>
                        {question.guidance && <p className="mt-2 whitespace-pre-line leading-5">{question.guidance}</p>}
                        {question.logic && <p className="mt-2 whitespace-pre-line border-t border-slate-200 pt-2 font-semibold leading-5">Logic: {question.logic}</p>}
                      </details>
                    )}
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{maturity ? "Score (0–5)" : "Assessment"}</span>
                    {maturity ? (
                      <select
                        value={response.score === undefined || response.score === null ? "" : String(response.score)}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const score: AiScoreValue = raw === "" ? null : raw === "na" ? "na" : Number(raw);
                          onChange(question.id, { score, answer: aiScoreToAnswer(score) });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#7E3AED]"
                      >
                        <option value="">Not scored</option>
                        {AI_SCORE_RATINGS.map((rating) => (
                          <option key={rating.score} value={rating.score}>{rating.score} – {rating.label}</option>
                        ))}
                        <option value="na">N/A – Not applicable</option>
                      </select>
                    ) : (
                    <select
                      value={response.answer}
                      onChange={(event) => onChange(question.id, { answer: event.target.value as AssessmentAnswer })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#7E3AED]"
                    >
                      <option value="not-assessed">Not assessed</option>
                      <option value="pass">Pass</option>
                      <option value="partial">Partial</option>
                      <option value="fail">Fail</option>
                      <option value="not-applicable">Not applicable</option>
                    </select>
                    )}
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Client answer / evidence</span>
                    <textarea
                      value={response.evidence}
                      onChange={(event) => onChange(question.id, { evidence: event.target.value })}
                      rows={4}
                      placeholder="Record the client's answer, evidence, gaps, owner and next action..."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]"
                    />
                  </label>
                  {isMsp && (
                    <div className="grid gap-3 md:grid-cols-2 xl:col-span-3 xl:grid-cols-4">
                      {([["importance", "Importance", MSP_IMPORTANCE], ["position", "Current position", MSP_POSITIONS]] as const).map(([key, label, options]) => (
                        <label key={key} className="space-y-1">
                          <span className={FINDING_LABEL}>{label}</span>
                          <select value={response.extras?.[key] ?? ""} onChange={(event) => onChange(question.id, { extras: { ...response.extras, [key]: event.target.value } })} className={FINDING_INPUT}>
                            <option value="">Select…</option>
                            {options.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        </label>
                      ))}
                      {([["risk", "Risk / issue"], ["recommendation", "Recommendation"], ["futureRequirement", "Future requirement"], ["customerComments", "Customer comments"]] as const).map(([key, label]) => (
                        <label key={key} className="space-y-1 md:col-span-2">
                          <span className={FINDING_LABEL}>{label}</span>
                          <textarea rows={2} value={response.extras?.[key] ?? EMPTY_MSP_EXTRAS[key]} onChange={(event) => onChange(question.id, { extras: { ...response.extras, [key]: event.target.value } })} className={FINDING_INPUT} />
                        </label>
                      ))}
                    </div>
                  )}
                  {maturity && !isMsp && typeof response.score === "number" && response.score < AI_MINIMUM_READY_SCORE && (
                    <FindingPanel
                      reference={question.reference}
                      score={response.score}
                      finding={{ ...EMPTY_AI_FINDING, ...response.finding }}
                      onChange={(patch) => onChange(question.id, { finding: { ...response.finding, ...patch } })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {aiResult && !isMsp && <RemediationRoadmap findings={collectAiFindings(visibleQuestions, (id) => responses[id])} />}
    </div>
  );
}

const FINDING_INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#7E3AED]";
const FINDING_LABEL = "text-[10px] font-black uppercase tracking-[0.12em] text-slate-500";

function FindingPanel({
  reference,
  score,
  finding,
  onChange,
}: {
  reference?: string;
  score: number;
  finding: AiFinding;
  onChange: (patch: Partial<AiFinding>) => void;
}) {
  const text = (label: string, key: keyof AiFinding, rows = 2) => (
    <label className="space-y-1">
      <span className={FINDING_LABEL}>{label}</span>
      <textarea value={finding[key]} onChange={(event) => onChange({ [key]: event.target.value })} rows={rows} className={`${FINDING_INPUT} resize-y`} />
    </label>
  );
  return (
    <div className="space-y-3 rounded-2xl border-2 border-[#FF2AA0]/30 bg-[#FF2AA0]/5 p-4 xl:col-span-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B8157A]">Finding &amp; remediation · {reference} scored {score} (below minimum {AI_MINIMUM_READY_SCORE})</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 xl:col-span-2">
          <span className={FINDING_LABEL}>Finding title</span>
          <input value={finding.title} onChange={(event) => onChange({ title: event.target.value })} className={FINDING_INPUT} />
        </label>
        <label className="space-y-1">
          <span className={FINDING_LABEL}>Risk</span>
          <select value={finding.risk || defaultRisk(score)} onChange={(event) => onChange({ risk: event.target.value as AiFinding["risk"] })} className={FINDING_INPUT}>
            {AI_RISK_LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className={FINDING_LABEL}>Roadmap phase</span>
          <select value={finding.phase || defaultPhase(reference)} onChange={(event) => onChange({ phase: event.target.value as AiFinding["phase"] })} className={FINDING_INPUT}>
            {AI_REMEDIATION_PHASES.map(([phase]) => <option key={phase}>{phase}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {text("Current situation", "currentSituation")}
        {text("Risk / AI impact", "impact")}
        {text("Recommendation", "recommendation")}
        {text("Remediation action", "action")}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className={FINDING_LABEL}>Owner</span>
          <input value={finding.owner} onChange={(event) => onChange({ owner: event.target.value })} placeholder="Customer / Unleashed / Third party" className={FINDING_INPUT} />
        </label>
        <label className="space-y-1">
          <span className={FINDING_LABEL}>Target date</span>
          <input type="date" value={finding.targetDate} onChange={(event) => onChange({ targetDate: event.target.value })} className={FINDING_INPUT} />
        </label>
        <label className="space-y-1">
          <span className={FINDING_LABEL}>Remediation status</span>
          <select value={finding.status} onChange={(event) => onChange({ status: event.target.value as AiFinding["status"] })} className={FINDING_INPUT}>
            {AI_REMEDIATION_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className={FINDING_LABEL}>Retest result</span>
          <input value={finding.retest} onChange={(event) => onChange({ retest: event.target.value })} className={FINDING_INPUT} />
        </label>
      </div>
    </div>
  );
}

function RemediationRoadmap({ findings }: { findings: ReturnType<typeof collectAiFindings> }) {
  const riskStyle: Record<string, string> = {
    Critical: "bg-red-600 text-white",
    High: "bg-orange-500 text-white",
    Medium: "bg-amber-300 text-amber-950",
    Low: "bg-sky-200 text-sky-900",
    Informational: "bg-slate-200 text-slate-700",
  };
  return (
    <section className="overflow-hidden rounded-[26px] bg-white shadow-xl ring-1 ring-[#D9E7F5]">
      <div className="border-b border-slate-200 bg-[#071A3F] px-6 py-4 text-white">
        <h3 className="font-black">Prioritised remediation roadmap · Secure → Clean → Govern → Enable → Measure</h3>
        <p className="mt-1 text-xs font-semibold text-white/70">Built automatically from every control scored below {AI_MINIMUM_READY_SCORE}. {findings.length} finding(s).</p>
      </div>
      <div className="grid gap-4 p-5 xl:grid-cols-5">
        {AI_REMEDIATION_PHASES.map(([phase, description], index) => {
          const phaseFindings = findings.filter((entry) => entry.phase === phase);
          return (
            <div key={phase} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7E3AED]">Phase {index + 1}</p>
              <p className="text-lg font-black">{phase} <span className="text-sm text-slate-400">({phaseFindings.length})</span></p>
              <p className="mt-1 text-xs font-semibold leading-4 text-slate-500">{description}</p>
              <div className="mt-3 space-y-2">
                {phaseFindings.length === 0 && <p className="text-xs font-semibold text-slate-400">No findings in this phase.</p>}
                {phaseFindings.map((entry) => (
                  <div key={entry.question.id} className="rounded-xl bg-white p-2.5 text-xs shadow-sm ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-[#071A3F]">{entry.question.reference}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${riskStyle[entry.risk]}`}>{entry.risk}</span>
                    </div>
                    <p className="mt-1 font-bold leading-4 text-slate-700">{entry.finding.title || entry.question.prompt}</p>
                    <p className="mt-1 font-semibold text-slate-400">{entry.finding.status}{entry.finding.owner ? ` · ${entry.finding.owner}` : ""}{entry.finding.targetDate ? ` · ${entry.finding.targetDate}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ServicesHub({
  onAudit,
  onCopilotWorkshop,
  onBenchmark,
}: {
  onAudit: () => void;
  onCopilotWorkshop: () => void;
  onBenchmark: (id: BenchmarkId) => void;
}) {
  const futureService = (title: string) => (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left">
      <span className="text-sm font-bold text-slate-500">{title}</span>
      <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Coming later</span>
    </div>
  );
  const serviceButton = (title: string, onClick: () => void) => (
    <button onClick={onClick} className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#7E3AED]/40 hover:shadow-md">
      <span className="text-sm font-black text-slate-800">{title}</span>
      <ChevronRight className="size-4 shrink-0 text-[#7E3AED] transition group-hover:translate-x-0.5" />
    </button>
  );

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-12">
      <section className="overflow-hidden rounded-[34px] bg-[#071A3F] px-7 py-10 text-white shadow-2xl sm:px-10">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00D4FF]">Unleashed advisory workspace</p>
        <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">Fractional C-Suite Services Hub</h2>
        <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-white/70">
          Choose the Fractional CTO or Fractional CISO service required. Live assessments open in this browser; planned services are clearly marked for future development.
        </p>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
          <div className="rounded-[22px] bg-gradient-to-br from-[#00D4FF] to-[#7E3AED] p-6 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">Technology leadership</p>
            <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">Fractional CTO</h3>
            <p className="mt-2 text-sm font-semibold text-white/80">Assessments and workshops for technology strategy, operations, adoption, and resilience.</p>
          </div>
          <div className="mt-5 space-y-3">
            {serviceButton("IT and Cyber Audit", onAudit)}
            <button
              onClick={onCopilotWorkshop}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#00D4FF]/60 hover:shadow-md"
            >
              <span>
                <span className="block text-sm font-black text-slate-800">Microsoft Copilot Adoption Workshop</span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">Open the existing workshop</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-[#00A6C7] transition group-hover:translate-x-0.5" />
            </button>
            {serviceButton("AI Data Readiness", () => onBenchmark("ai-data-readiness"))}
            {futureService("Back-up and Business Continuity Assessment")}
            {serviceButton("MSP / IT Services Evaluation", () => onBenchmark("msp-supplier-review"))}
          </div>
        </section>

        <section className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
          <div className="rounded-[22px] bg-gradient-to-br from-[#071A3F] to-[#FF2AA0] p-6 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">Security leadership</p>
            <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">Fractional CISO</h3>
            <p className="mt-2 text-sm font-semibold text-white/80">Readiness assessments and assurance services for security controls, certification, and governance.</p>
          </div>
          <div className="mt-5 space-y-3">
            {serviceButton("CIS Controls Benchmark", () => onBenchmark("cis"))}
            {serviceButton("Cyber Essentials Readiness", () => onBenchmark("cyber-essentials"))}
            {serviceButton("Cyber Essentials Plus Alignment", () => onBenchmark("cyber-essentials-plus"))}
            {serviceButton("ISO 27001 — Gap Analysis", () => onBenchmark("iso-27001"))}
            {futureService("M365 Tenancy Hardening")}
            {futureService("Core IT Policy Review and Creation")}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmbeddedCopilotWorkshop({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-5">
      <div className="overflow-hidden rounded-[26px] bg-white shadow-2xl ring-1 ring-[#D9E7F5]">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7E3AED]">Fractional CTO workshop</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Microsoft Copilot Adoption Workshop</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">The existing workshop is embedded here as part of the Fractional C-Suite Services Hub.</p>
          </div>
          <button onClick={onBack} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#00D4FF] px-4 py-2.5 text-sm font-black text-[#071A3F] hover:bg-[#5BE5FF]">
            <Home className="size-4" /> Back to homepage
          </button>
        </div>
        <iframe
          src="https://unleashed2025.github.io/copilot-adoption-workshop/"
          title="Microsoft Copilot Adoption Workshop"
          className="block h-[calc(100vh-220px)] min-h-[720px] w-full border-0 bg-white"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}

function EmptyUpload({ onFile, onBlank }: { onFile: (file: File | null) => void; onBlank: () => void }) {
  return (
    <section className="mx-auto mt-10 max-w-4xl rounded-[30px] border-2 border-dashed border-[#7E3AED]/40 bg-white p-12 text-center shadow-xl">
      <div className="mx-auto grid size-20 place-items-center rounded-[24px] bg-[#EBF8FF] text-[#7E3AED]">
        <FileSpreadsheet className="size-10" />
      </div>
      <h2 className="mt-6 text-3xl font-black tracking-[-0.04em]">Upload the client audit workbook</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
        The workbook is mapped into High Level Info, Data Infrastructure, Network & WiFi, Client Compute, Software and Cyber Security workspaces.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#7E3AED] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#7E3AED]/20">
          <Upload className="size-4" /> Choose workbook
          <input
            type="file"
            className="sr-only"
            accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button
          onClick={onBlank}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#7E3AED] bg-white px-6 py-3 text-sm font-black text-[#7E3AED] hover:bg-[#7E3AED]/5"
        >
          <Plus className="size-4" /> Start blank audit
        </button>
      </div>
      <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
        <ShieldCheck className="size-4 text-[#00D4FF]" />
        Parsed locally in this browser. Nothing is written to the Lifecycle app.
      </div>
    </section>
  );
}

export function AuditBuilder() {
  const [showHub, setShowHub] = React.useState(true);
  const [embeddedService, setEmbeddedService] = React.useState<"copilot-workshop" | null>(null);
  const [audit, setAudit] = React.useState<BrowserAudit | null>(null);
  const [clientName, setClientName] = React.useState("Temporary audit");
  const [activeView, setActiveView] = React.useState<ViewKey>("overview");
  const [status, setStatus] = React.useState("Upload a workbook to create the browser-only audit workspace.");
  const [visibleLimit, setVisibleLimit] = React.useState(INITIAL_VISIBLE_ROWS);
  const [addCategory, setAddCategory] = React.useState<AssetCategorySlug | null>(null);
  const [presenting, setPresenting] = React.useState(false);
  const [benchmarkResponses, setBenchmarkResponses] = React.useState<Partial<Record<BenchmarkId, BenchmarkResponseSet>>>({});
  const [serviceRows, setServiceRows] = React.useState<ServiceRow[]>([]);
  const [organisation, setOrganisation] = React.useState<OrganisationValues>({});
  const [assessmentDepth, setAssessmentDepth] = React.useState<AssessmentDepth>("pre");
  const [cisTier, setCisTier] = React.useState<1 | 2 | 3>(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const rows = audit?.rows ?? [];
  const activeCategory = ASSET_CATEGORY_SLUGS.includes(activeView as AssetCategorySlug) ? activeView as AssetCategorySlug : null;
  const complianceActive = String(activeView).startsWith("compliance");
  const activeBenchmarkId = String(activeView).startsWith("compliance:") ? String(activeView).slice("compliance:".length) as BenchmarkId : null;
  const activeBenchmark = activeBenchmarkId ? BENCHMARKS[activeBenchmarkId] : null;
  const activeRows = activeCategory ? rows.filter((row) => row.auditCategory === activeCategory) : [];
  const filteredRows = activeRows;
  const displayedRows = filteredRows.slice(0, visibleLimit);
  const groups = activeCategory ? categoryGroups(activeCategory, displayedRows) : [];

  function navigate(view: ViewKey) {
    setActiveView(view);
    setVisibleLimit(INITIAL_VISIBLE_ROWS);
    if (String(view).startsWith("compliance:")) setAssessmentDepth("pre");
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    if (!/\.(xlsx|xls|xlsm|xlsb|csv)$/i.test(file.name)) {
      setStatus("Choose an Excel workbook or CSV file (.xlsx, .xls, .xlsm, .xlsb, or .csv).");
      return;
    }
    setStatus("Mapping workbook sections into the Lifecycle audit structure...");
    try {
      const parsed = await parseAuditWorkbook(await file.arrayBuffer());
      const importedSheets = new Set(parsed.sheets.filter((sheet) => sheet.rowsImported > 0).map((sheet) => sheet.sheetName));
      setAudit(parsed);
      setShowHub(false);
      setClientName(parsed.highLevel.schoolTrustName || parsed.highLevel.siteName || file.name.replace(/\.(xlsx|xls|xlsm|xlsb|csv)$/i, ""));
      navigate("overview");
      setStatus(`Loaded ${parsed.rows.length.toLocaleString("en-GB")} category-specific record(s) across ${importedSheets.size} audit sheet(s), plus High Level Info.`);
    } catch (error) {
      console.error("Unable to read audit workbook", error);
      setStatus("This spreadsheet could not be mapped. Check that it is a valid audit workbook or CSV and try again.");
    }
  }

  function startBlankAudit() {
    setAudit(createBlankAudit());
    setShowHub(false);
    setClientName("New client audit");
    navigate("high-level");
    setStatus("Blank audit started. Complete High Level Info, then add records in each category workspace.");
  }

  function openAuditService() {
    setEmbeddedService(null);
    setShowHub(false);
    if (audit) {
      navigate("overview");
      setStatus("IT and Cyber Audit workspace opened.");
    } else {
      setStatus("Upload an existing audit workbook or start a blank audit.");
    }
  }

  function openBenchmarkService(benchmarkId: BenchmarkId) {
    if (!audit) {
      setAudit(createBlankAudit());
      setClientName("New client assessment");
    }
    setEmbeddedService(null);
    setShowHub(false);
    navigate(`compliance:${benchmarkId}`);
    setStatus(`${BENCHMARKS[benchmarkId].shortTitle} assessment opened. Results remain in this browser tab.`);
  }

  function openCopilotWorkshop() {
    setEmbeddedService("copilot-workshop");
    setShowHub(false);
    setStatus("Microsoft Copilot Adoption Workshop opened inside the Services Hub.");
  }

  function updateBenchmarkResponse(benchmarkId: BenchmarkId, questionId: string, patch: Partial<BenchmarkResponse>) {
    setBenchmarkResponses((current) => {
      const benchmark = current[benchmarkId] ?? {};
      const response = benchmark[questionId] ?? { answer: "not-assessed" as AssessmentAnswer, evidence: "" };
      return {
        ...current,
        [benchmarkId]: {
          ...benchmark,
          [questionId]: { ...response, ...patch },
        },
      };
    });
  }

  function updateRow(rowId: string, field: string, value: unknown) {
    setAudit((current) => current ? {
      ...current,
      rows: assessRows(current.rows.map((row) => row.id === rowId ? { ...row, [field]: value } : row)),
    } : current);
  }

  function addRow(category: AssetCategorySlug, values: Record<string, unknown>) {
    const row = { ...createEmptyRow(category), ...values };
    setAudit((current) => current ? { ...current, rows: assessRows([...current.rows, row]) } : current);
  }

  function deleteRow(rowId: string) {
    if (!window.confirm("Delete this item from the temporary audit?")) return;
    setAudit((current) => current ? { ...current, rows: assessRows(current.rows.filter((row) => row.id !== rowId)) } : current);
  }

  function updateHighLevel(key: keyof Omit<HighLevelInfo, "contacts">, value: string) {
    setAudit((current) => current ? { ...current, highLevel: { ...current.highLevel, [key]: value } } : current);
  }

  function updateContact(contactId: string, patch: Partial<AuditContact>) {
    setAudit((current) => current ? {
      ...current,
      highLevel: {
        ...current.highLevel,
        contacts: current.highLevel.contacts.map((contact) => contact.id === contactId ? { ...contact, ...patch } : contact),
      },
    } : current);
  }

  function addContact() {
    setAudit((current) => current ? {
      ...current,
      highLevel: {
        ...current.highLevel,
        contacts: [...current.highLevel.contacts, { id: crypto.randomUUID(), role: "", name: "", email: "", phone: "", notes: "" }],
      },
    } : current);
  }

  function reset() {
    setAudit(null);
    setShowHub(true);
    setClientName("Temporary audit");
    navigate("overview");
    setStatus("Reset complete. No temporary audit data remains on this page.");
    setBenchmarkResponses({});
    setOrganisation({});
    setCisTier(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function exportPresentation() {
    if (!audit) return;
    setPresenting(true);
    try {
      await exportPowerPointReport(audit, clientName);
    } catch (error) {
      console.error("Unable to generate PowerPoint report", error);
      setStatus("The PowerPoint report could not be generated. Review the browser console for details and try again.");
    } finally {
      setPresenting(false);
    }
  }

  async function exportBenchmarkPresentation(benchmarkId: BenchmarkId) {
    setPresenting(true);
    try {
      await exportCompliancePowerPoint(BENCHMARKS[benchmarkId], benchmarkResponses[benchmarkId] ?? {}, clientName, cisTier, assessmentDepth, organisation, serviceRows);
    } catch (error) {
      console.error("Unable to generate compliance PowerPoint report", error);
      setStatus("The compliance PowerPoint report could not be generated. Review the browser console for details and try again.");
    } finally {
      setPresenting(false);
    }
  }

  const summary = ASSET_CATEGORY_SLUGS.map((slug) => {
    const categoryRows = rows.filter((row) => row.auditCategory === slug);
    return {
      slug,
      total: categoryRows.length,
      flagged: categoryRows.filter((row) => row.flagged).length,
      warnings: categoryRows.filter((row) => !row.flagged && row.warnReasons.length > 0).length,
    };
  });
  const totalFlagged = rows.filter((row) => row.flagged).length;

  return (
    <main className="min-h-screen bg-[#EBF8FF] text-slate-950">
      <header className="bg-[#071A3F] text-white shadow-xl">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <img src={`${import.meta.env.BASE_URL}unleashed-logo-white.png`} alt="Unleashed" className="h-auto w-44" />
            <div className="hidden h-10 w-px bg-white/20 sm:block" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00D4FF]">{showHub ? "Fractional CTO & CISO services" : activeBenchmark ? "Fractional CISO assessment" : "Fractional CTO service"}</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">{showHub ? "Fractional C-Suite Services Hub" : embeddedService === "copilot-workshop" ? "Microsoft Copilot Adoption Workshop" : activeBenchmark?.title ?? "Client Audit Asset Management"}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!showHub && (
              <button onClick={() => setShowHub(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#00D4FF] px-4 py-2.5 text-sm font-black text-[#071A3F] shadow-lg shadow-[#00D4FF]/15 hover:bg-[#5BE5FF]">
                <Home className="size-4" /> Back to homepage
              </button>
            )}
            {audit && !showHub && !embeddedService && (
              <>
                <label className="rounded-xl bg-white/10 px-3 py-2">
                  <span className="sr-only">Client or assessment name</span>
                  <input value={clientName} onChange={(event) => setClientName(event.target.value)} className="w-56 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/50" />
                </label>
                {!complianceActive && (
                  <>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15">
                      <Upload className="size-4" /> Import / replace workbook
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button onClick={() => void exportPresentation()} disabled={presenting} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black disabled:opacity-50">
                      <Presentation className="size-4" /> {presenting ? "Generating PowerPoint..." : "PowerPoint report"}
                    </button>
                    <button onClick={reset} className="rounded-xl p-2.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Reset">
                      <RefreshCcw className="size-4" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="grid h-1.5 grid-cols-3">
          <div className="bg-[#00D4FF]" /><div className="bg-[#7E3AED]" /><div className="bg-[#FF2AA0]" />
        </div>
      </header>

      {showHub ? (
        <ServicesHub onAudit={openAuditService} onCopilotWorkshop={openCopilotWorkshop} onBenchmark={openBenchmarkService} />
      ) : embeddedService === "copilot-workshop" ? (
        <EmbeddedCopilotWorkshop onBack={() => setShowHub(true)} />
      ) : activeBenchmark && activeBenchmarkId ? (
        <div className="mx-auto max-w-[1600px] space-y-5 px-5 py-6">
          <p className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-[#D9E7F5]">{status}</p>
          {activeBenchmarkId === "msp-supplier-review" && <MspRegister rows={serviceRows} onChange={setServiceRows} />}
          <ComplianceAssessment
            key={activeBenchmarkId}
            benchmark={activeBenchmark}
            responses={benchmarkResponses[activeBenchmarkId] ?? {}}
            assessmentDepth={assessmentDepth}
            onAssessmentDepthChange={setAssessmentDepth}
            cisTier={cisTier}
            onCisTierChange={setCisTier}
            onChange={(questionId, patch) => updateBenchmarkResponse(activeBenchmarkId, questionId, patch)}
            onReset={() => setBenchmarkResponses((current) => ({ ...current, [activeBenchmarkId]: {} }))}
            onBack={() => setShowHub(true)}
            onExport={() => void exportBenchmarkPresentation(activeBenchmarkId)}
            exporting={presenting}
            organisation={organisation}
            onOrganisationChange={(fieldId, value) => setOrganisation((current) => ({ ...current, [fieldId]: value }))}
          />
        </div>
      ) : !audit ? (
        <div className="px-5 pb-12">
          <EmptyUpload onFile={(file) => void handleUpload(file)} onBlank={startBlankAudit} />
          <p className="mx-auto mt-5 max-w-4xl rounded-2xl bg-white/80 px-5 py-3 text-center text-sm font-bold text-slate-600 ring-1 ring-[#D9E7F5]">{status}</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1800px] gap-5 px-4 py-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[24px] bg-white p-3 shadow-xl ring-1 ring-[#D9E7F5] lg:sticky lg:top-5">
            <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">IT & Cyber Audit</p>
            <button onClick={() => navigate("overview")} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${activeView === "overview" ? "bg-[#071A3F] text-white" : "text-slate-700 hover:bg-slate-50"}`}>
              <LayoutDashboard className="size-4" /> Audit overview
            </button>
            <button onClick={() => navigate("high-level")} className={`mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${activeView === "high-level" ? "bg-[#071A3F] text-white" : "text-slate-700 hover:bg-slate-50"}`}>
              <Users className="size-4" /> High Level Info
            </button>
            <div className="my-3 h-px bg-slate-200" />
            <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Asset workspaces</p>
            {summary.map((item) => (
              <button
                key={item.slug}
                onClick={() => navigate(item.slug)}
                className={`mb-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${activeView === item.slug ? "bg-[#7E3AED] text-white" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <span className="text-sm font-bold">{ASSET_CATEGORIES[item.slug].label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${activeView === item.slug ? "bg-white/20" : item.flagged ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                  {item.total}
                </span>
              </button>
            ))}
            <div className="mt-3 rounded-2xl bg-[#EBF8FF] p-4 text-xs font-semibold leading-5 text-slate-600">
              <ShieldCheck className="mb-2 size-5 text-[#7E3AED]" />
              All edits stay in this browser tab and are included in the exported report.
            </div>
          </aside>

          <section className="min-w-0 space-y-5">
            <p className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-[#D9E7F5]">{status}</p>

            {activeView === "overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Assets tracked", rows.length, "bg-[#071A3F]"],
                    ["Flagged items", totalFlagged, "bg-[#FF2AA0]"],
                    ["Audit categories", summary.filter((item) => item.total > 0).length, "bg-[#7E3AED]"],
                    ["Stored records", 0, "bg-[#00D4FF] text-[#071A3F]"],
                  ].map(([label, value, className]) => (
                    <div key={String(label)} className={`rounded-[24px] p-6 text-white shadow-lg ${className}`}>
                      <p className="text-3xl font-black">{String(value)}</p>
                      <p className="mt-5 text-xs font-black uppercase tracking-[0.14em]">{String(label)}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Imported audit scope</p>
                      <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{clientName}</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {audit.highLevel.siteName || "Site not recorded"} · {audit.highLevel.auditDate || "Audit date not recorded"} · {audit.highLevel.auditor || "Auditor not recorded"}
                      </p>
                    </div>
                    <button onClick={() => navigate("high-level")} className="inline-flex items-center gap-2 text-sm font-black text-[#7E3AED]">
                      Edit profile <ChevronRight className="size-4" />
                    </button>
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {summary.map((item) => (
                      <button key={item.slug} onClick={() => navigate(item.slug)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#7E3AED]/40 hover:shadow-md">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black">{ASSET_CATEGORIES[item.slug].label}</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{item.total} item(s) · {item.flagged} flagged · {item.warnings} warnings</p>
                          </div>
                          <ChevronRight className="size-4 text-slate-400" />
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full bg-[#FF2AA0]" style={{ width: `${item.total ? Math.round((item.flagged / item.total) * 100) : 0}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <h2 className="text-xl font-black">Workbook import summary</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500"><th className="p-3">Sheet</th><th className="p-3">Section</th><th className="p-3">Workspace</th><th className="p-3 text-right">Imported</th><th className="p-3 text-right">Skipped</th></tr></thead>
                      <tbody>
                        {audit.sheets.length > 0 ? audit.sheets.map((sheet, index) => (
                          <tr key={`${sheet.sheetName}-${sheet.sectionTitle}-${index}`} className="border-b border-slate-100">
                            <td className="p-3 font-bold">{sheet.sheetName}</td>
                            <td className="p-3 text-slate-600">{sheet.sectionTitle || "—"}</td>
                            <td className="p-3 text-slate-600">{sheet.matchedCategory ? ASSET_CATEGORIES[sheet.matchedCategory].label : sheet.sheetName.match(/high level/i) ? "High Level Info" : "Not an asset table"}</td>
                            <td className="p-3 text-right font-black">{sheet.rowsImported}</td>
                            <td className="p-3 text-right text-slate-500">{sheet.rowsSkipped}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center font-semibold text-slate-500">
                              Blank audit — no workbook imported. Add records manually in each category workspace.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeView === "high-level" && (
              <div className="space-y-5">
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Client and site profile</p>
                  <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">High Level Information</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Edit the organisation, location, audit ownership and estate profile in grouped tiles.</p>
                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    {HIGH_LEVEL_SECTIONS.map((section) => (
                      <div key={section.title} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/70">
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
                          <span className={`h-10 w-1.5 rounded-full ${section.accent}`} />
                          <div>
                            <h3 className="font-black">{section.title}</h3>
                            <p className="text-xs font-semibold text-slate-500">{section.description}</p>
                          </div>
                        </div>
                        <div className={`grid gap-4 p-5 ${section.fields.length > 2 ? "md:grid-cols-2" : ""}`}>
                          {section.fields.map((field) => (
                            <label key={field.key} className={`space-y-1.5 ${field.key === "schoolTrustName" || field.key === "siteName" ? "md:col-span-2" : ""}`}>
                              <span className="text-xs font-bold text-slate-600">{field.label}</span>
                              <input
                                type={field.type ?? "text"}
                                value={audit.highLevel[field.key]}
                                onChange={(event) => updateHighLevel(field.key, event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED] focus:ring-2 focus:ring-[#7E3AED]/10"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black">Main contacts</h2>
                      <p className="text-sm font-semibold text-slate-500">Editable contacts imported from the workbook.</p>
                    </div>
                    <button onClick={addContact} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black text-white"><Plus className="size-4" /> Add contact</button>
                  </div>
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {audit.highLevel.contacts.map((contact, index) => (
                      <div key={contact.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-[#071A3F] text-sm font-black text-white">{index + 1}</div>
                            <div>
                              <h3 className="font-black">{contact.name || `Contact ${index + 1}`}</h3>
                              <p className="text-xs font-semibold text-slate-500">{contact.role || "Role not recorded"}</p>
                            </div>
                          </div>
                          <button onClick={() => setAudit((current) => current ? { ...current, highLevel: { ...current.highLevel, contacts: current.highLevel.contacts.filter((item) => item.id !== contact.id) } } : current)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${contact.name || `contact ${index + 1}`}`}><Trash2 className="size-4" /></button>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {(["role", "name", "email", "phone", "notes"] as const).map((key) => (
                            <label key={key} className={`space-y-1.5 ${key === "notes" ? "md:col-span-2" : ""}`}>
                              <span className="text-xs font-bold capitalize text-slate-600">{key}</span>
                              {key === "notes" ? (
                                <textarea value={contact[key]} onChange={(event) => updateContact(contact.id, { [key]: event.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]" />
                              ) : (
                                <input value={contact[key]} onChange={(event) => updateContact(contact.id, { [key]: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {audit.highLevel.contacts.length === 0 && (
                      <button onClick={addContact} className="rounded-[22px] border-2 border-dashed border-[#7E3AED]/30 bg-[#7E3AED]/5 p-8 text-left">
                        <Users className="size-6 text-[#7E3AED]" />
                        <p className="mt-3 font-black">Add the first contact</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Capture the main technical, leadership or supplier contact.</p>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeCategory && (
              <>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Asset workspace</p>
                      <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{ASSET_CATEGORIES[activeCategory].label}</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-500">{filteredRows.length} item(s) · {filteredRows.filter((row) => row.flagged).length} flagged for attention</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setAddCategory(activeCategory)} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black text-white"><Plus className="size-4" /> Add item</button>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                    {categoryGroups(activeCategory, filteredRows).map((group) => (
                      <div key={group.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-2xl font-black">{group.rows.length}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{group.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {groups.map((group) => (
                  <div key={group.label} className="overflow-hidden rounded-[26px] bg-white shadow-xl ring-1 ring-[#D9E7F5]">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <div>
                        <h3 className="text-lg font-black">{group.label}</h3>
                        <p className="text-xs font-semibold text-slate-500">{group.rows.length} visible row(s)</p>
                      </div>
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">{group.rows.filter((row) => row.flagged).length} flagged</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 text-left">
                        <thead className="sticky top-0 z-20 bg-[#071A3F] text-white">
                          <tr>
                            <th className="sticky left-0 z-30 min-w-12 bg-[#071A3F] p-3 text-center text-[10px] uppercase tracking-[0.12em]">Risk</th>
                            {ASSET_CATEGORIES[activeCategory].fields.map((field) => (
                              <th key={field.key} className="min-w-40 p-3 text-[10px] uppercase tracking-[0.12em]">{field.label}</th>
                            ))}
                            <th className="min-w-72 p-3 text-[10px] uppercase tracking-[0.12em]">Assessment</th>
                            <th className="sticky right-0 z-30 min-w-16 bg-[#071A3F] p-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row, index) => (
                            <tr key={row.id} className={`${index % 2 ? "bg-slate-50/70" : "bg-white"} ${row.flagged ? "bg-red-50/70" : row.warnReasons.length ? "bg-amber-50/70" : ""}`}>
                              <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit p-3 text-center">
                                {row.flagged ? <AlertTriangle className="mx-auto size-4 text-red-500" /> : row.warnReasons.length ? <Clock3 className="mx-auto size-4 text-amber-500" /> : <CheckCircle2 className="mx-auto size-4 text-emerald-500" />}
                              </td>
                              {ASSET_CATEGORIES[activeCategory].fields.map((field) => (
                                <td key={field.key} className="border-b border-slate-200 p-2 align-top">
                                  <FieldEditor field={field} value={row[field.key]} onChange={(value) => updateRow(row.id, field.key, value)} compact />
                                </td>
                              ))}
                              <td className="border-b border-slate-200 p-3 align-top"><RiskBadge row={row} /></td>
                              <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-inherit p-2">
                                <button onClick={() => deleteRow(row.id)} title={`Delete ${rowTitle(row)}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {visibleLimit < filteredRows.length && (
                  <button onClick={() => setVisibleLimit((current) => current + INITIAL_VISIBLE_ROWS)} className="w-full rounded-2xl border border-[#7E3AED]/30 bg-white px-5 py-3 text-sm font-black text-[#7E3AED] shadow-sm">
                    Show next {Math.min(INITIAL_VISIBLE_ROWS, filteredRows.length - visibleLimit)} rows
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {addCategory && <AddItemModal category={addCategory} onClose={() => setAddCategory(null)} onSave={(values) => addRow(addCategory, values)} />}
    </main>
  );
}
