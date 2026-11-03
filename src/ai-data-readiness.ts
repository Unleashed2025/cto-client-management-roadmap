import type { BenchmarkQuestion } from "./compliance-benchmarks";

export interface OrganisationField {
  id: string;
  label: string;
  type: "text" | "date" | "number" | "textarea";
}

export const AI_SCORE_RATINGS = [
  { score: 0, label: "Critical deficiency", description: "No effective control or serious exposure exists." },
  { score: 1, label: "Poor", description: "Significant weaknesses exist and substantial remediation is required." },
  { score: 2, label: "Developing", description: "Some controls exist but material gaps remain." },
  { score: 3, label: "Adequate", description: "Generally controlled but improvements are required." },
  { score: 4, label: "Good", description: "Well controlled with only minor improvements required." },
  { score: 5, label: "Optimised", description: "Mature, controlled, monitored and evidenced." },
] as const;

export const AI_MINIMUM_READY_SCORE = 3;

export const AI_READINESS_BANDS = [
  { min: 90, status: "Green", label: "Strong readiness" },
  { min: 75, status: "Green", label: "Ready with improvements" },
  { min: 60, status: "Amber", label: "Partially ready" },
  { min: 40, status: "Red/Amber", label: "Significant remediation required" },
  { min: 0, status: "Red", label: "Not AI ready" },
] as const;

export const AI_REMEDIATION_PHASES = [
  ["Secure", "Address immediate information exposure, identity and access risks."],
  ["Clean", "Address stale, duplicate, obsolete and poor-quality information."],
  ["Govern", "Establish information protection, data governance and AI governance."],
  ["Enable", "Introduce approved AI services, Copilot and agents against trusted information."],
  ["Measure", "Monitor risk, adoption, usage, quality and business value."],
] as const;

export const AI_ORGANISATION_FIELDS: OrganisationField[] = [
  { id: "ORG-01", label: "Organisation name", type: "text" },
  { id: "ORG-02", label: "Assessment date", type: "date" },
  { id: "ORG-03", label: "Assessor", type: "text" },
  { id: "ORG-04", label: "Primary customer contact", type: "text" },
  { id: "ORG-05", label: "Number of users", type: "number" },
  { id: "ORG-06", label: "Microsoft 365 tenant / domains", type: "textarea" },
  { id: "ORG-07", label: "Microsoft 365 licence types", type: "textarea" },
  { id: "ORG-08", label: "AI tools currently in use", type: "textarea" },
  { id: "ORG-09", label: "Planned AI tools", type: "textarea" },
  { id: "ORG-10", label: "Current Copilot licensing", type: "textarea" },
  { id: "ORG-11", label: "Business objectives for AI", type: "textarea" },
  { id: "ORG-12", label: "Key systems and applications", type: "textarea" },
  { id: "ORG-13", label: "Regulatory and compliance requirements", type: "textarea" },
  { id: "ORG-14", label: "Known data or security concerns", type: "textarea" },
  { id: "ORG-15", label: "Assessment scope", type: "textarea" },
  { id: "ORG-16", label: "Exclusions", type: "textarea" },
];

interface AiSection {
  title: string;
  weight: number;
  questions: Array<[string, string]>;
}

export const AI_SECTIONS: AiSection[] = [
  {
    title: "Data Estate & Discovery",
    weight: 10,
    questions: [
      ["DATA-01", "Has the organisation identified where its business information is stored?"],
      ["DATA-02", "Is there a documented information and data estate?"],
      ["DATA-03", "Have business-critical data repositories been identified?"],
      ["DATA-04", "Are owners assigned to key data repositories?"],
      ["DATA-05", "Have legacy data repositories been identified?"],
      ["DATA-06", "Are unmanaged file shares or storage locations identified?"],
      ["DATA-07", "Are duplicate repositories containing the same information identified?"],
      ["DATA-08", "Have structured data sources been identified?"],
      ["DATA-09", "Have unstructured data sources been identified?"],
      ["DATA-10", "Does the organisation understand which repositories can currently be accessed by AI systems?"],
      ["DATA-11", "Have data sources proposed for Copilot, agent or RAG access been identified?"],
      ["DATA-12", "Are authoritative sources identified for important organisational information?"],
    ],
  },
  {
    title: "Permissions & Oversharing",
    weight: 20,
    questions: [
      ["PERM-01", "Are SharePoint sites restricted to users with a legitimate requirement?"],
      ["PERM-02", "Are sites using excessively broad permissions?"],
      ["PERM-03", "Is broad organisational access such as Everyone Except External Users appropriately controlled?"],
      ["PERM-04", "Are organisation-wide Teams appropriately restricted?"],
      ["PERM-05", "Are Microsoft 365 Groups reviewed for excessive membership?"],
      ["PERM-06", "Are direct user permissions identifiable and reviewed?"],
      ["PERM-07", "Are broken SharePoint permission inheritances identified and reviewed?"],
      ["PERM-08", "Are sensitive sites subject to appropriate access restrictions?"],
      ["PERM-09", "Are anonymous or Anyone sharing links appropriately controlled?"],
      ["PERM-10", "Is external sharing appropriately configured?"],
      ["PERM-11", "Are existing external sharing links periodically reviewed?"],
      ["PERM-12", "Are guest users periodically reviewed?"],
      ["PERM-13", "Are dormant guest accounts removed?"],
      ["PERM-14", "Is OneDrive external sharing appropriately controlled?"],
      ["PERM-15", "Are Teams guest memberships reviewed?"],
      ["PERM-16", "Are permissions reviewed when employees change roles?"],
      ["PERM-17", "Are permissions removed appropriately when employees leave?"],
      ["PERM-18", "Are privileged data repositories subject to regular access reviews?"],
      ["PERM-19", "Can the organisation identify information accessible to considerably more people than intended?"],
      ["PERM-20", "Has oversharing been assessed specifically from an AI and Copilot information-retrieval perspective?"],
    ],
  },
  {
    title: "Sensitive Data & Classification",
    weight: 15,
    questions: [
      ["SENS-01", "Has sensitive information been identified and categorised?"],
      ["SENS-02", "Is personal information identified and appropriately protected?"],
      ["SENS-03", "Is employee and HR information appropriately protected?"],
      ["SENS-04", "Is payroll information appropriately protected?"],
      ["SENS-05", "Is financial information appropriately protected?"],
      ["SENS-06", "Is customer or client confidential information identified?"],
      ["SENS-07", "Are contracts and commercially sensitive information identified?"],
      ["SENS-08", "Are credentials, passwords, API keys and secrets prevented from being stored in inappropriate locations?"],
      ["SENS-09", "Are Microsoft Purview sensitivity labels configured?"],
      ["SENS-10", "Are sensitivity labels being used effectively?"],
      ["SENS-11", "Are highly sensitive repositories appropriately labelled and protected?"],
      ["SENS-12", "Is automatic classification or labelling used where appropriate?"],
      ["SENS-13", "Are Data Loss Prevention policies configured where appropriate?"],
      ["SENS-14", "Do DLP controls cover relevant business-sensitive information?"],
      ["SENS-15", "Are appropriate sensitive information types defined and used?"],
      ["SENS-16", "Are encryption and protection controls applied where required?"],
    ],
  },
  {
    title: "Data Quality & AI Knowledge Quality",
    weight: 15,
    questions: [
      ["QUAL-01", "Are authoritative documents clearly identifiable?"],
      ["QUAL-02", "Can users distinguish approved documents from drafts?"],
      ["QUAL-03", "Are obsolete documents clearly archived or removed?"],
      ["QUAL-04", "Are duplicate documents appropriately controlled?"],
      ["QUAL-05", "Are conflicting versions of key information identified and controlled?"],
      ["QUAL-06", "Do key documents have assigned owners?"],
      ["QUAL-07", "Do important documents have review dates?"],
      ["QUAL-08", "Is important organisational content periodically reviewed for accuracy?"],
      ["QUAL-09", "Is metadata used consistently where appropriate?"],
      ["QUAL-10", "Are appropriate naming conventions used consistently?"],
      ["QUAL-11", "Is important organisational knowledge stored in locations accessible to the intended AI solution?"],
      ["QUAL-12", "Could AI retrieve historical information that is no longer accurate?"],
      ["QUAL-13", "Could AI retrieve draft information and mistake it for approved information?"],
      ["QUAL-14", "Are trusted knowledge sources defined for planned AI agents?"],
      ["QUAL-15", "Is there a process for correcting inaccurate source information discovered through AI use?"],
    ],
  },
  {
    title: "Data Lifecycle & ROT",
    weight: 10,
    questions: [
      ["LIFE-01", "Are data retention requirements defined?"],
      ["LIFE-02", "Are Microsoft 365 retention policies configured where required?"],
      ["LIFE-03", "Are data deletion requirements defined?"],
      ["LIFE-04", "Are records-management requirements understood?"],
      ["LIFE-05", "Are stale SharePoint sites identified?"],
      ["LIFE-06", "Are inactive Teams identified?"],
      ["LIFE-07", "Are former employee OneDrives appropriately managed?"],
      ["LIFE-08", "Are legacy file shares regularly reviewed?"],
      ["LIFE-09", "Is redundant information routinely identified?"],
      ["LIFE-10", "Is obsolete information routinely identified?"],
      ["LIFE-11", "Is trivial or unnecessary information routinely removed?"],
      ["LIFE-12", "Are abandoned sites and workspaces removed or archived?"],
      ["LIFE-13", "Is ownership reassigned where the original information owner has left?"],
      ["LIFE-14", "Is there a defined approach for archiving data that should no longer influence AI responses?"],
    ],
  },
  {
    title: "Identity & Access Management",
    weight: 10,
    questions: [
      ["IAM-01", "Is multifactor authentication appropriately enforced?"],
      ["IAM-02", "Are Conditional Access policies implemented?"],
      ["IAM-03", "Are legacy authentication methods appropriately controlled?"],
      ["IAM-04", "Are dormant accounts identified and disabled?"],
      ["IAM-05", "Are privileged accounts appropriately separated?"],
      ["IAM-06", "Are Microsoft Entra ID privileged roles reviewed?"],
      ["IAM-07", "Is Privileged Identity Management used where appropriate?"],
      ["IAM-08", "Are service accounts documented and controlled?"],
      ["IAM-09", "Are shared accounts controlled?"],
      ["IAM-10", "Is there a formal joiner process?"],
      ["IAM-11", "Is there a formal mover process?"],
      ["IAM-12", "Is there a formal leaver process?"],
      ["IAM-13", "Are user access rights regularly reviewed?"],
      ["IAM-14", "Are security and Microsoft 365 Groups appropriately managed?"],
      ["IAM-15", "Are guest identities regularly reviewed?"],
      ["IAM-16", "Are application and service principal permissions reviewed?"],
      ["IAM-17", "Are high-risk OAuth and application permissions controlled?"],
    ],
  },
  {
    title: "AI Governance",
    weight: 10,
    questions: [
      ["GOV-01", "Does the organisation have an AI Acceptable Use Policy?"],
      ["GOV-02", "Are approved AI services defined?"],
      ["GOV-03", "Are prohibited or unapproved AI services defined?"],
      ["GOV-04", "Are employees told what information can and cannot be entered into AI tools?"],
      ["GOV-05", "Is responsibility for AI governance assigned?"],
      ["GOV-06", "Is responsibility for data governance assigned?"],
      ["GOV-07", "Are AI risks included in organisational risk management?"],
      ["GOV-08", "Is there an approval process for introducing new AI systems?"],
      ["GOV-09", "Is there an approval process for publishing AI agents?"],
      ["GOV-10", "Is a named owner required for each AI agent?"],
      ["GOV-11", "Are AI connectors and data sources reviewed before connection?"],
      ["GOV-12", "Are AI agent permissions reviewed?"],
      ["GOV-13", "Are AI outputs subject to appropriate human oversight?"],
      ["GOV-14", "Does guidance address inaccurate or hallucinated AI output?"],
      ["GOV-15", "Are employees trained to verify important AI-generated information?"],
      ["GOV-16", "Is there a process for reporting AI-related security or privacy incidents?"],
      ["GOV-17", "Are logging and audit requirements defined for AI systems?"],
      ["GOV-18", "Are third-party AI applications subject to risk assessment?"],
      ["GOV-19", "Are privacy impacts considered before AI deployments?"],
      ["GOV-20", "Are AI use cases documented and assigned business owners?"],
    ],
  },
  {
    title: "Microsoft 365 & AI Technical Readiness",
    weight: 5,
    questions: [
      ["TECH-01", "Are existing Microsoft 365 licences documented?"],
      ["TECH-02", "Are required Copilot licences understood?"],
      ["TECH-03", "Are Microsoft Purview capabilities and licensing understood?"],
      ["TECH-04", "Are Microsoft Entra capabilities and licensing understood?"],
      ["TECH-05", "Is Microsoft 365 audit logging appropriately configured?"],
      ["TECH-06", "Is SharePoint appropriately configured for proposed AI use cases?"],
      ["TECH-07", "Is Microsoft Teams appropriately governed?"],
      ["TECH-08", "Is OneDrive appropriately governed?"],
      ["TECH-09", "Are Microsoft Search and content discovery implications understood?"],
      ["TECH-10", "Are Power Platform environments documented?"],
      ["TECH-11", "Is there an environment strategy for Copilot Studio and Power Platform?"],
      ["TECH-12", "Are connectors appropriately governed?"],
      ["TECH-13", "Are application and API permissions governed?"],
      ["TECH-14", "Are Microsoft Graph permissions reviewed?"],
      ["TECH-15", "Are development, test and production AI environments separated where appropriate?"],
      ["TECH-16", "Is there a controlled method for moving AI agents into production?"],
    ],
  },
  {
    title: "AI Adoption & People Readiness",
    weight: 5,
    questions: [
      ["ADOPT-01", "Have priority AI use cases been identified?"],
      ["ADOPT-02", "Are AI use cases linked to measurable business outcomes?"],
      ["ADOPT-03", "Have suitable AI pilot groups been identified?"],
      ["ADOPT-04", "Have users received AI awareness training?"],
      ["ADOPT-05", "Have users received prompting guidance?"],
      ["ADOPT-06", "Do users understand AI limitations?"],
      ["ADOPT-07", "Do users understand their responsibility to check AI-generated output?"],
      ["ADOPT-08", "Is there an established support route for AI users?"],
      ["ADOPT-09", "Are AI champions identified?"],
      ["ADOPT-10", "Will AI adoption and usage be measured?"],
    ],
  },
];

export const AI_SECTION_WEIGHTS: Record<string, number> = Object.fromEntries(
  AI_SECTIONS.map((section) => [section.title, section.weight]),
);

const EVIDENCE_PROMPT = "Record the assessor findings, evidence reviewed (reports, screenshots, links), customer comments, owner and recommended next action.";

export const AI_DATA_READINESS_QUESTIONS: BenchmarkQuestion[] = AI_SECTIONS.flatMap((section) =>
  section.questions.map(([reference, prompt]) => ({
    id: `ai-${reference.toLowerCase()}`,
    reference,
    section: section.title,
    prompt,
    evidencePrompt: EVIDENCE_PROMPT,
    answerType: "Score 0–5",
  })),
);

export const AI_DATA_READINESS_PRE_QUESTIONS: BenchmarkQuestion[] = AI_SECTIONS.flatMap((section) =>
  AI_DATA_READINESS_QUESTIONS.filter((question) => question.section === section.title).slice(0, 3),
);

export type AiScoreValue = number | "na" | null | undefined;

export function aiScoreToAnswer(score: AiScoreValue): "not-assessed" | "pass" | "partial" | "fail" | "not-applicable" {
  if (score === "na") return "not-applicable";
  if (score === null || score === undefined) return "not-assessed";
  if (score >= AI_MINIMUM_READY_SCORE) return "pass";
  return score === 0 ? "fail" : "partial";
}

export interface AiReadinessResult {
  percent: number;
  band: (typeof AI_READINESS_BANDS)[number];
  criticalControls: BenchmarkQuestion[];
  belowMinimum: number;
  scored: number;
  sectionScores: Array<{ section: string; weight: number; average: number | null; scored: number; total: number }>;
}

// A control scored 0 (critical deficiency) caps the overall band at Amber so a high average cannot hide it.
export function calculateAiReadiness(
  questions: BenchmarkQuestion[],
  scoreFor: (questionId: string) => AiScoreValue,
): AiReadinessResult {
  const sections = [...new Set(questions.map((question) => question.section))];
  const sectionScores = sections.map((section) => {
    const sectionQuestions = questions.filter((question) => question.section === section);
    const scores = sectionQuestions
      .map((question) => scoreFor(question.id))
      .filter((score): score is number => typeof score === "number");
    return {
      section,
      weight: AI_SECTION_WEIGHTS[section] ?? 0,
      average: scores.length > 0 ? scores.reduce((total, score) => total + score, 0) / scores.length : null,
      scored: scores.length,
      total: sectionQuestions.length,
    };
  });
  const scoredSections = sectionScores.filter((section) => section.average !== null);
  const weightTotal = scoredSections.reduce((total, section) => total + section.weight, 0);
  const weighted = weightTotal > 0
    ? scoredSections.reduce((total, section) => total + (section.average as number) * section.weight, 0) / weightTotal
    : 0;
  const percent = Math.round((weighted / 5) * 100);
  const criticalControls = questions.filter((question) => scoreFor(question.id) === 0);
  let band = AI_READINESS_BANDS.find((candidate) => percent >= candidate.min) ?? AI_READINESS_BANDS[AI_READINESS_BANDS.length - 1];
  if (criticalControls.length > 0 && percent >= 60) band = AI_READINESS_BANDS[2];
  const numeric = questions.map((question) => scoreFor(question.id)).filter((score): score is number => typeof score === "number");
  return {
    percent,
    band,
    criticalControls,
    belowMinimum: numeric.filter((score) => score < AI_MINIMUM_READY_SCORE).length,
    scored: numeric.length,
    sectionScores,
  };
}
