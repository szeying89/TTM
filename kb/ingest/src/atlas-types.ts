export interface AtlasTactic {
  id: string;
  name: string;
  "object-type": "tactic";
}

export interface AtlasTechnique {
  id: string;
  name: string;
  description: string;
  "object-type": "technique";
  tactics?: string[];
  specializes?: string;
}

export interface AtlasCaseStudyProcedureStep {
  tactic: string;
  technique: string;
  description: string;
}

export interface AtlasCaseStudy {
  id: string;
  name: string;
  "object-type": "case-study";
  summary: string;
  procedure: AtlasCaseStudyProcedureStep[];
}

export interface AtlasMatrix {
  id: string;
  name: string;
  tactics: AtlasTactic[];
  techniques: AtlasTechnique[];
}

export interface AtlasDocument {
  id: string;
  name: string;
  version: string;
  matrices: AtlasMatrix[];
  "case-studies": AtlasCaseStudy[];
}
