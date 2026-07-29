// NIST SP 800-53 Rev. 5 control family names, used as a closed vocabulary for
// MitigationRecommendation.controlFamily so recommendations map onto a
// standard, audit-recognizable taxonomy rather than free text.
export const NIST_800_53_FAMILIES = [
  "Access Control",
  "Awareness and Training",
  "Audit and Accountability",
  "Assessment, Authorization, and Monitoring",
  "Configuration Management",
  "Contingency Planning",
  "Identification and Authentication",
  "Incident Response",
  "Maintenance",
  "Media Protection",
  "Physical and Environmental Protection",
  "Planning",
  "Program Management",
  "Personnel Security",
  "PII Processing and Transparency",
  "Risk Assessment",
  "System and Services Acquisition",
  "System and Communications Protection",
  "System and Information Integrity",
  "Supply Chain Risk Management",
] as const;

export type Nist80053Family = (typeof NIST_800_53_FAMILIES)[number];
