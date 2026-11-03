export type BenchmarkId = "cis" | "cyber-essentials" | "cyber-essentials-plus" | "iso-27001";
export type AssessmentAnswer = "not-assessed" | "pass" | "partial" | "fail" | "not-applicable";

export interface BenchmarkQuestion {
  id: string;
  section: string;
  prompt: string;
  evidencePrompt: string;
  tier?: 1 | 2 | 3;
}

export interface BenchmarkDefinition {
  id: BenchmarkId;
  title: string;
  shortTitle: string;
  version: string;
  description: string;
  sourceLabel: string;
  sourceUrl: string;
  notice: string;
  questions: BenchmarkQuestion[];
}

const cisControls = [
  ["Inventory and Control of Enterprise Assets", "discovering, approving, recording, and removing enterprise devices"],
  ["Inventory and Control of Software Assets", "discovering, approving, supporting, and removing software"],
  ["Data Protection", "classifying, handling, retaining, encrypting, and disposing of sensitive data"],
  ["Secure Configuration of Enterprise Assets and Software", "maintaining secure configuration baselines and detecting drift"],
  ["Account Management", "creating, reviewing, disabling, and monitoring user and service accounts"],
  ["Access Control Management", "granting least-privilege access and reviewing permissions"],
  ["Continuous Vulnerability Management", "identifying, prioritising, remediating, and verifying vulnerabilities"],
  ["Audit Log Management", "collecting, protecting, reviewing, and retaining security logs"],
  ["Email and Web Browser Protections", "reducing email and browser-borne threats"],
  ["Malware Defences", "preventing, detecting, and responding to malicious software"],
  ["Data Recovery", "protecting backups and proving that recovery works"],
  ["Network Infrastructure Management", "documenting, securing, and maintaining network infrastructure"],
  ["Network Monitoring and Defence", "detecting and responding to suspicious network activity"],
  ["Security Awareness and Skills Training", "maintaining role-relevant security awareness and skills"],
  ["Service Provider Management", "assessing, contracting, monitoring, and exiting third-party providers"],
  ["Application Software Security", "building, procuring, testing, and maintaining secure applications"],
  ["Incident Response Management", "preparing, exercising, and improving incident response"],
  ["Penetration Testing", "planning, performing, remediating, and retesting security tests"],
] as const;

const cisQuestions: BenchmarkQuestion[] = cisControls.flatMap(([section, focus], controlIndex) => {
  const control = controlIndex + 1;
  return [
    {
      id: `cis-${control}-ig1`,
      section: `Control ${control}: ${section}`,
      tier: 1,
      prompt: `Is there a documented basic process for ${focus}, and is it consistently applied to the current in-scope environment?`,
      evidencePrompt: "Record the owner, current process, inventory or policy evidence, and the most recent review.",
    },
    {
      id: `cis-${control}-ig2`,
      section: `Control ${control}: ${section}`,
      tier: 2,
      prompt: `Is ${focus} centrally governed, measured, reviewed on a defined schedule, and supported by accountable owners?`,
      evidencePrompt: "Record governance, reporting, exception handling, review frequency, and evidence of follow-up.",
    },
    {
      id: `cis-${control}-ig3`,
      section: `Control ${control}: ${section}`,
      tier: 3,
      prompt: `Is the organisation testing and improving its approach to ${focus} against advanced threats, failure scenarios, and lessons learned?`,
      evidencePrompt: "Record testing results, threat-led improvements, independent assurance, and unresolved risks.",
    },
  ];
});

function questions(
  prefix: string,
  sections: Array<[string, Array<[string, string]>]>,
): BenchmarkQuestion[] {
  return sections.flatMap(([section, items], sectionIndex) =>
    items.map(([prompt, evidencePrompt], questionIndex) => ({
      id: `${prefix}-${sectionIndex + 1}-${questionIndex + 1}`,
      section,
      prompt,
      evidencePrompt,
    })),
  );
}

const cyberEssentialsQuestions = questions("ce", [
  ["Scope and organisation", [
    ["Is the assessment scope clearly defined, including all organisations, locations, networks, cloud services, home workers, and internet-connected services that must be covered?", "Record the scope statement, exclusions, boundary diagrams, and the reason each exclusion is valid."],
    ["Is there a current inventory of all in-scope laptops, desktops, servers, mobile devices, network devices, virtual assets, and cloud services?", "Record inventory sources, reconciliation date, ownership, and how unknown assets are identified."],
    ["Are operating systems, device types, cloud platforms, and externally hosted services recorded accurately enough to support certification answers?", "Record versions, quantities, hosting arrangements, and evidence that the list is current."],
    ["Has a senior responsible person reviewed the intended scope and accepted responsibility for the accuracy of the assessment?", "Record the approver, role, review date, and evidence of sign-off."],
  ]],
  ["Firewalls and internet gateways", [
    ["Are all in-scope devices protected from untrusted networks by a correctly configured host or network firewall?", "Record firewall coverage, architecture, device policy, and any exceptions."],
    ["Are inbound connections blocked by default unless there is a documented and approved business need?", "Record current inbound rules, business owners, approval dates, and review evidence."],
    ["Are administrative interfaces protected from the internet and restricted to authorised management paths?", "Record management access controls, source restrictions, MFA, and monitoring."],
    ["Are firewall rules reviewed and removed when they are no longer required?", "Record the review schedule, last review, rule owner, and removed or corrected rules."],
  ]],
  ["Secure configuration", [
    ["Are default passwords changed before devices, applications, and cloud services are placed into service?", "Record build standards, onboarding checks, and evidence for representative systems."],
    ["Are unnecessary accounts, services, applications, ports, and features disabled or removed?", "Record hardening standards, technical checks, and managed exceptions."],
    ["Are automatic execution features and risky convenience settings controlled where they could enable malicious code?", "Record relevant platform policies and verification evidence."],
    ["Are device and service security settings managed consistently rather than relying on individual users?", "Record central management tools, configuration baselines, and compliance reports."],
  ]],
  ["User access control", [
    ["Are user accounts unique, attributable to an individual, and provided only after appropriate approval?", "Record joiner procedures, approval evidence, and controls over shared accounts."],
    ["Are administrative privileges limited to authorised people and separate from normal day-to-day accounts?", "Record administrator lists, separate account use, and privileged access controls."],
    ["Are leaver, dormant, and unnecessary accounts removed or disabled promptly?", "Record HR or identity workflows, service targets, and recent examples."],
    ["Is multi-factor authentication enabled for cloud services and other in-scope services where the scheme requires it?", "Record MFA coverage, authentication methods, exceptions, and enforcement reports."],
    ["Are passwords and authentication settings configured to resist guessing, reuse, and known compromised credentials?", "Record password policy, rate limiting or lockout controls, and identity-provider settings."],
  ]],
  ["Malware protection", [
    ["Is every in-scope device protected using an appropriate malware prevention method for its platform and use?", "Record the protection method by device type and evidence of active coverage."],
    ["Are malware protection tools kept active, updated, centrally monitored, and configured to prevent users disabling them?", "Record management console evidence, update health, alerts, and tamper protection."],
    ["Where application allow-listing or application-store controls are used, are only approved applications permitted?", "Record approval workflows, enforced policies, and exception handling."],
    ["Are web and email protections configured to reduce access to malicious content and downloads?", "Record filtering controls, blocked-event reporting, and review processes."],
  ]],
  ["Security update management", [
    ["Are all in-scope operating systems, applications, firmware, and cloud components supported by their suppliers?", "Record unsupported products, replacement plans, and compensating controls."],
    ["Are high-risk or critical security updates applied within the scheme's required timeframe?", "Record patch policies, deployment reports, exceptions, and overdue updates."],
    ["Are automatic updates enabled where appropriate, with failed installations identified and corrected?", "Record update configuration, compliance reports, and failure management."],
    ["Are vulnerabilities managed for software that cannot be updated immediately, including removal or isolation where necessary?", "Record risk decisions, mitigations, target dates, and accountable owners."],
  ]],
]);

const cyberEssentialsPlusQuestions = questions("cep", [
  ["Certification and scope readiness", [
    ["Is a current Cyber Essentials assessment available with the same scope intended for the Plus verification?", "Record certificate details, scope, dates, and any changes since assessment."],
    ["Can the organisation provide accurate device, user, cloud, and external service populations so an assessor can select representative samples?", "Record sampling populations, inventory exports, and responsible contacts."],
    ["Are technical and business contacts available to support testing and resolve findings within the certification window?", "Record named contacts, availability, escalation routes, and change controls."],
  ]],
  ["External exposure verification", [
    ["Have all public IP addresses, domains, remote access services, and internet-facing applications in scope been identified?", "Record the external asset list, ownership, and independent discovery results."],
    ["Would an external vulnerability scan find no unsupported or critically vulnerable exposed services?", "Record recent scan results, remediation evidence, and accepted exceptions."],
    ["Are internet-facing administrative services protected from unrestricted public access?", "Record access paths, restrictions, MFA, and monitoring evidence."],
  ]],
  ["Endpoint and build verification", [
    ["Can representative endpoints demonstrate supported operating systems, secure configuration, active malware protection, and current updates?", "Record device compliance reports and examples across each platform."],
    ["Can users be shown to operate without unnecessary administrative privileges on sampled devices?", "Record local administrator membership, privilege controls, and exception approval."],
    ["Can sampled devices demonstrate that security controls cannot be casually disabled by standard users?", "Record tamper protection, policy enforcement, and test evidence."],
  ]],
  ["Cloud and identity verification", [
    ["Can the organisation demonstrate MFA enforcement for sampled cloud and administrative accounts?", "Record identity-provider reports, conditional access policies, and exceptions."],
    ["Are dormant, shared, privileged, and leaver accounts controlled and evidenced in sampled identity platforms?", "Record account reviews, disablement evidence, and privileged account lists."],
    ["Can cloud services in scope demonstrate secure baseline settings and restricted administrative access?", "Record configuration reports, management roles, and recent reviews."],
  ]],
  ["Malware and email testing readiness", [
    ["Are representative users and devices able to safely participate in assessor-led malware and email protection tests?", "Record test coordination, safety controls, and expected protection behaviour."],
    ["Would approved test files and malicious-content simulations be blocked or alerted across sampled platforms?", "Record internal test results, detections, and unresolved gaps."],
    ["Are security alerts monitored and escalated so test detections can be evidenced promptly?", "Record monitoring ownership, alert workflow, and recent response evidence."],
  ]],
  ["Remediation and retest", [
    ["Is there a process to triage, remediate, evidence, and retest Plus findings within the permitted assessment period?", "Record owners, change windows, escalation, and retest evidence requirements."],
    ["Are configuration and patch changes controlled so remediation does not introduce operational risk?", "Record change approvals, rollback plans, and validation checks."],
    ["Has an internal rehearsal been completed against the intended Plus scope before booking the external assessment?", "Record rehearsal scope, findings, remediation, and readiness approval."],
  ]],
]);

const isoQuestions = questions("iso", [
  ["Clause 4 — Organisational context", [
    ["Has the organisation defined the internal and external issues that affect its information security management system?", "Record the context review, interested parties, dependencies, and review date."],
    ["Is the ISMS scope documented, justified, and aligned to business services, locations, technology, and third parties?", "Record the approved scope, boundaries, exclusions, interfaces, and ownership."],
  ]],
  ["Clause 5 — Leadership", [
    ["Has leadership approved an information security policy and assigned accountable ISMS roles?", "Record policy approval, role descriptions, delegated authorities, and leadership communications."],
    ["Can leadership demonstrate active oversight of information security objectives, risks, resources, and performance?", "Record governance minutes, decisions, funding, and corrective actions."],
  ]],
  ["Clause 6 — Planning", [
    ["Is there a repeatable method for assessing information security risks using defined likelihood, impact, and acceptance criteria?", "Record the methodology, risk register, owners, treatment decisions, and approvals."],
    ["Are treatment actions and security objectives measurable, owned, resourced, and tracked to completion?", "Record treatment plans, objectives, measures, target dates, and progress evidence."],
  ]],
  ["Clause 7 — Support", [
    ["Are sufficient people, competence, awareness, communication, and resources available to operate the ISMS?", "Record training, competence evidence, communications, resourcing decisions, and gaps."],
    ["Are ISMS documents and records controlled so approved versions are protected, available, retained, and disposed of correctly?", "Record document-control rules, repositories, approvals, retention, and access."],
  ]],
  ["Clause 8 — Operation", [
    ["Are risk assessments and treatment plans operated as planned and repeated when significant change occurs?", "Record operational schedules, change triggers, completed reviews, and resulting actions."],
    ["Are outsourced processes and planned changes controlled within the ISMS?", "Record supplier controls, change assessments, approvals, and monitoring."],
  ]],
  ["Clause 9 — Performance evaluation", [
    ["Are security measures and ISMS objectives monitored, analysed, and reported using reliable evidence?", "Record metrics, thresholds, reports, trends, and management decisions."],
    ["Are internal audits and management reviews completed on a planned schedule by suitably independent people?", "Record programmes, reports, findings, minutes, and follow-up actions."],
  ]],
  ["Clause 10 — Improvement", [
    ["Are nonconformities recorded, corrected, investigated for root cause, and checked for effectiveness?", "Record corrective actions, root-cause analysis, owners, dates, and effectiveness reviews."],
    ["Can the organisation demonstrate continual improvement of the suitability and effectiveness of the ISMS?", "Record improvement decisions, completed changes, lessons learned, and benefits."],
  ]],
  ["Annex A theme — Organisational controls", [
    ["Are information security policies, responsibilities, segregation of duties, and management governance established and reviewed?", "Record policy set, role assignments, governance reviews, and conflicts addressed."],
    ["Are assets, information, suppliers, cloud services, and information transfers governed through their lifecycle?", "Record inventories, classification, supplier assurance, transfer rules, and disposal."],
    ["Are incident management, business continuity, legal obligations, privacy, and evidence preservation integrated into operations?", "Record plans, exercises, obligations registers, incident records, and improvements."],
    ["Are security requirements embedded in projects, change, procurement, and third-party relationships?", "Record project gates, security reviews, contracts, exceptions, and acceptance decisions."],
  ]],
  ["Annex A theme — People controls", [
    ["Are personnel screened appropriately and given clear security responsibilities before access is granted?", "Record screening, contracts, acceptable-use terms, and onboarding evidence."],
    ["Do people receive role-relevant awareness and training, with completion and effectiveness reviewed?", "Record training assignments, attendance, testing, and targeted follow-up."],
    ["Are disciplinary, remote-working, confidentiality, and reporting responsibilities defined and communicated?", "Record policies, acknowledgements, reporting channels, and enforcement examples."],
    ["Are role changes and departures reflected promptly in access, assets, obligations, and knowledge transfer?", "Record mover/leaver workflows, access removal, asset return, and completion evidence."],
  ]],
  ["Annex A theme — Physical controls", [
    ["Are physical security boundaries, entry controls, visitor processes, and secure areas appropriate to the information handled?", "Record site controls, access logs, visitor evidence, and periodic reviews."],
    ["Are equipment, cabling, utilities, storage media, and off-site assets protected against damage, loss, and unauthorised access?", "Record safeguards, maintenance, environmental controls, and asset tracking."],
    ["Are clear-desk, clear-screen, secure disposal, and equipment reuse practices implemented and checked?", "Record policies, disposal certificates, checks, and exceptions."],
    ["Is physical monitoring proportionate, lawful, retained appropriately, and reviewed after events?", "Record monitoring coverage, retention, access, testing, and incident use."],
  ]],
  ["Annex A theme — Technological controls", [
    ["Are identities, authentication, privileged access, endpoint security, and network access centrally controlled and reviewed?", "Record identity controls, MFA, privilege reviews, endpoint compliance, and network policy."],
    ["Are vulnerabilities, configuration, malware protection, logging, monitoring, and time synchronisation operated consistently?", "Record tools, coverage, review cadence, remediation, and alert handling."],
    ["Are cryptography, data loss prevention, backup, redundancy, deletion, and masking applied according to information risk?", "Record standards, key management, backup tests, retention, and data protection evidence."],
    ["Are secure development, testing, change, source code, and outsourced development controls applied throughout the application lifecycle?", "Record lifecycle controls, reviews, testing, approvals, and supplier evidence."],
    ["Are cloud, web filtering, email, network services, and technical architecture managed against documented security requirements?", "Record architecture decisions, service configurations, assurance, and exceptions."],
  ]],
]);

export const BENCHMARKS: Record<BenchmarkId, BenchmarkDefinition> = {
  cis: {
    id: "cis",
    title: "CIS Controls v8.1 Readiness",
    shortTitle: "CIS Controls",
    version: "v8.1 · IG1–IG3",
    description: "Cumulative readiness assessment for CIS Implementation Groups 1, 2, and 3. CIS does not define an IG4.",
    sourceLabel: "Official CIS Controls and licensing",
    sourceUrl: "https://www.cisecurity.org/controls/v8-1",
    notice: "Original assessment wording aligned to CIS Controls themes. It does not reproduce the licensed safeguard text and is not a CIS certification.",
    questions: cisQuestions,
  },
  "cyber-essentials": {
    id: "cyber-essentials",
    title: "Cyber Essentials Readiness",
    shortTitle: "Cyber Essentials",
    version: "Current UK scheme structure",
    description: "Readiness assessment covering scope and the five Cyber Essentials technical control areas.",
    sourceLabel: "Official IASME question-set preview",
    sourceUrl: "https://iasme.co.uk/cyber-essentials/preview-the-self-assessment-questions-for-cyber-essentials/",
    notice: "Original readiness wording. Use the current official IASME preparation booklet and certification portal for the exact live question set.",
    questions: cyberEssentialsQuestions,
  },
  "cyber-essentials-plus": {
    id: "cyber-essentials-plus",
    title: "Cyber Essentials Plus Readiness",
    shortTitle: "Cyber Essentials Plus",
    version: "Technical verification readiness",
    description: "Preparation for the external technical verification that follows the Cyber Essentials assessment.",
    sourceLabel: "Official IASME Plus guidance",
    sourceUrl: "https://iasme.co.uk/articles/cyber-essentials-and-cyber-essentials-plus-what-is-the-difference/",
    notice: "Cyber Essentials Plus does not have a separate self-assessment question set. This readiness checklist prepares evidence and systems for independent technical testing.",
    questions: cyberEssentialsPlusQuestions,
  },
  "iso-27001": {
    id: "iso-27001",
    title: "ISO/IEC 27001:2022 Readiness",
    shortTitle: "ISO 27001",
    version: "2022 readiness review",
    description: "Readiness assessment across clauses 4–10 and the four Annex A control themes.",
    sourceLabel: "Official ISO/IEC 27001:2022 page",
    sourceUrl: "https://www.iso.org/standard/27001",
    notice: "Original readiness wording. ISO/IEC 27001 is copyrighted and has no official free questionnaire; obtain the licensed standard for certification work.",
    questions: isoQuestions,
  },
};

export const BENCHMARK_IDS = Object.keys(BENCHMARKS) as BenchmarkId[];
