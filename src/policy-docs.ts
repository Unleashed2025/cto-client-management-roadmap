export type PolicyDoc = {
  file: string;
  title: string;
  category: string;
  description: string;
  review: string[];
};
export const POLICY_DOCS: PolicyDoc[] = [
  { file: "information_security_policy_v2.docx", title: "Information Security Policy", category: "Core policies", description: "Top-level policy setting security responsibilities, controls and expectations.", review: ["Named security owner appointed", "Approved and dated by management", "Reviewed in last 12 months", "Aligned to Cyber Essentials / ISO 27001 scope"] },
  { file: "it-access-policy.docx", title: "IT Access Policy", category: "Core policies", description: "Joiners, movers, leavers, least privilege, MFA and privileged access.", review: ["Leaver process removes access promptly", "MFA enforced for cloud and admin accounts", "Admin accounts separate and tracked", "Access reviewed periodically"] },
  { file: "cyber-essentials-policy.docx", title: "Cyber Essentials Policy", category: "Core policies", description: "Policy covering the five Cyber Essentials technical controls.", review: ["Firewalls and boundary controls", "Secure configuration", "Patching timescales (14 days for critical/high)", "Malware protection and user access control"] },
  { file: "data_classification_policy_v2.docx", title: "Data Classification Policy", category: "Core policies", description: "Public / Confidential / Restricted labelling and handling rules.", review: ["Classification levels match actual labels in use", "Handling rules defined for each level", "Owners assigned to data sets"] },
  { file: "security_awareness_training_guidelines_v2.docx", title: "Security Awareness Training Guidelines", category: "Core policies", description: "Staff training, phishing awareness and induction requirements.", review: ["Induction training in place", "Annual refresher completed", "Training records retained"] },
  { file: "business_continuity_plan_v2.docx", title: "Business Continuity Plan", category: "Resilience", description: "Continuity plan with contacts, roles and recovery steps.", review: ["Key contacts current", "Recovery objectives agreed", "Plan tested within last 12 months"] },
  { file: "data_protection_policy_v2.docx", title: "Data Protection Policy", category: "Privacy and GDPR", description: "UK GDPR / DPA 2018 obligations, rights, retention and breaches.", review: ["Lawful bases documented", "Retention periods defined", "DPO or lead named", "Breach reporting route (72 hours) defined"] },
  { file: "gdpr-privacy-notice-template.docx", title: "GDPR Privacy Notice", category: "Privacy and GDPR", description: "Privacy notice template with lawful bases and rights.", review: ["Lawful bases completed", "Contact details correct", "Published where individuals can see it"] },
  { file: "privacy_policy_template_v2.docx", title: "Website Privacy Policy", category: "Privacy and GDPR", description: "Public-facing privacy policy template.", review: ["Matches actual data collection", "Cookies covered", "Contact details correct"] },
  { file: "subject_access_request_form_v2.docx", title: "Subject Access Request Form", category: "Privacy and GDPR", description: "Form for individuals requesting their personal data.", review: ["Response deadline (one month) understood", "Identity verification step defined", "Request log kept"] },
  { file: "security_incident_form_instructions_v2.docx", title: "Security Incident Form and Instructions", category: "Incident and breach", description: "Instructions and form for reporting a security incident.", review: ["Staff know how to report", "Escalation route defined", "Incidents logged and reviewed"] },
  { file: "ico_report_a_personal_data_breach_form_february_2022.doc", title: "ICO Personal Data Breach Report Form", category: "Incident and breach", description: "Official ICO form (Feb 2022). Not auto-filled; complete in Word.", review: ["Check the ICO site for the current version", "Report within 72 hours where required"] },
  { file: "risk_assessment_treatment_plan_v2.xlsx", title: "Risk Assessment and Treatment Plan", category: "Registers and trackers", description: "Risk register with scoring and treatment actions.", review: ["Risks scored consistently", "Owners and due dates set", "Reviewed regularly"] },
  { file: "asset_register_template_v2.xlsx", title: "Asset Register", category: "Registers and trackers", description: "Hardware, software and information asset register.", review: ["All devices and key systems listed", "Owners assigned", "Updated at least annually"] },
  { file: "data_mapping_tool_v2.xlsx", title: "Data Mapping Tool", category: "Registers and trackers", description: "Records of personal data flows and processing.", review: ["Processing activities captured", "Third-party recipients listed", "Lawful basis recorded"] },
  { file: "administrator_access_tracker_v2.xlsx", title: "Administrator Access Tracker", category: "Registers and trackers", description: "Tracks privileged accounts and who holds them.", review: ["Every admin account listed", "Justification recorded", "Reviewed at least quarterly"] },
];


