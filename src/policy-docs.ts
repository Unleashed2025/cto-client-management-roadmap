export type PolicyDoc = {
  file: string;
  title: string;
  category: string;
  description: string;
};
export const POLICY_DOCS: PolicyDoc[] = [
  { file: "information_security_policy_v2.docx", title: "Information Security Policy", category: "Core policies", description: "Top-level policy setting security responsibilities, controls and expectations." },
  { file: "it-access-policy.docx", title: "IT Access Policy", category: "Core policies", description: "Joiners, movers, leavers, least privilege, MFA and privileged access." },
  { file: "cyber-essentials-policy.docx", title: "Cyber Essentials Policy", category: "Core policies", description: "Policy covering the five Cyber Essentials technical controls." },
  { file: "data_classification_policy_v2.docx", title: "Data Classification Policy", category: "Core policies", description: "Public / Confidential / Restricted labelling and handling rules." },
  { file: "security_awareness_training_guidelines_v2.docx", title: "Security Awareness Training Guidelines", category: "Core policies", description: "Staff training, phishing awareness and induction requirements." },
  { file: "business_continuity_plan_v2.docx", title: "Business Continuity Plan", category: "Resilience", description: "Continuity plan with contacts, roles and recovery steps." },
  { file: "data_protection_policy_v2.docx", title: "Data Protection Policy", category: "Privacy and GDPR", description: "UK GDPR / DPA 2018 obligations, rights, retention and breaches." },
  { file: "gdpr-privacy-notice-template.docx", title: "GDPR Privacy Notice", category: "Privacy and GDPR", description: "Privacy notice template with lawful bases and rights." },
  { file: "privacy_policy_template_v2.docx", title: "Website Privacy Policy", category: "Privacy and GDPR", description: "Public-facing privacy policy template." },
  { file: "subject_access_request_form_v2.docx", title: "Subject Access Request Form", category: "Privacy and GDPR", description: "Form for individuals requesting their personal data." },
  { file: "security_incident_form_instructions_v2.docx", title: "Security Incident Form and Instructions", category: "Incident and breach", description: "Instructions and form for reporting a security incident." },
  { file: "ico_report_a_personal_data_breach_form_february_2022.doc", title: "ICO Personal Data Breach Report Form", category: "Incident and breach", description: "Official ICO form (Feb 2022). Not auto-filled; complete in Word." },
  { file: "risk_assessment_treatment_plan_v2.xlsx", title: "Risk Assessment and Treatment Plan", category: "Registers and trackers", description: "Risk register with scoring and treatment actions." },
  { file: "asset_register_template_v2.xlsx", title: "Asset Register", category: "Registers and trackers", description: "Hardware, software and information asset register." },
  { file: "data_mapping_tool_v2.xlsx", title: "Data Mapping Tool", category: "Registers and trackers", description: "Records of personal data flows and processing." },
  { file: "administrator_access_tracker_v2.xlsx", title: "Administrator Access Tracker", category: "Registers and trackers", description: "Tracks privileged accounts and who holds them." },
];


