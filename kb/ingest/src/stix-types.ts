export interface StixExternalReference {
  source_name: string;
  external_id?: string;
  description?: string;
  url?: string;
}

export interface StixBundle {
  type: "bundle";
  id: string;
  objects: StixObject[];
}

export interface StixObjectBase {
  id: string;
  type: string;
  revoked?: boolean;
  x_mitre_deprecated?: boolean;
}

export interface AttackPattern extends StixObjectBase {
  type: "attack-pattern";
  name: string;
  description: string;
  external_references: StixExternalReference[];
  kill_chain_phases?: { kill_chain_name: string; phase_name: string }[];
}

export interface CourseOfAction extends StixObjectBase {
  type: "course-of-action";
  name: string;
  description: string;
}

export interface MitreTactic extends StixObjectBase {
  type: "x-mitre-tactic";
  name: string;
  x_mitre_shortname: string;
}

export interface DetectionStrategy extends StixObjectBase {
  type: "x-mitre-detection-strategy";
  name: string;
  x_mitre_analytic_refs: string[];
}

export interface Analytic extends StixObjectBase {
  type: "x-mitre-analytic";
  name: string;
  description: string;
}

export interface Relationship extends StixObjectBase {
  type: "relationship";
  relationship_type: string;
  source_ref: string;
  target_ref: string;
  description?: string;
}

export type StixObject =
  | AttackPattern
  | CourseOfAction
  | MitreTactic
  | DetectionStrategy
  | Analytic
  | Relationship
  | (StixObjectBase & { name?: string; description?: string });
