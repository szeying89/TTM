import { describe, expect, it } from "vitest";
import { normalizeAtlasYaml } from "./normalize-atlas.js";

const fixtureYaml = `
id: ATLAS
name: Adversarial Threat Landscape for AI Systems
version: 5.6.0
matrices:
- id: ATLAS
  name: ATLAS Matrix
  tactics:
  - id: AML.TA0002
    name: Reconnaissance
    object-type: tactic
  techniques:
  - id: AML.T0000
    name: Search Open Technical Databases
    description: Adversaries may search for publicly available research.
    object-type: technique
    tactics:
    - AML.TA0002
  - id: AML.T0000.000
    name: Journals and Conference Proceedings
    description: Publications from premier AI conferences and journals.
    object-type: technique
    specializes: AML.T0000
case-studies:
- id: AML.CS0000
  name: Evasion of Deep Learning Detector
  object-type: case-study
  summary: A case study summary.
  procedure:
  - tactic: AML.TA0002
    technique: AML.T0000.000
    description: We searched arXiv for relevant papers.
`;

describe("normalizeAtlasYaml", () => {
  const chunks = normalizeAtlasYaml(fixtureYaml);

  it("emits a description chunk for a top-level technique with its own tactic", () => {
    const chunk = chunks.find((c) => c.techniqueId === "AML.T0000" && c.chunkType === "description");
    expect(chunk?.tactic).toBe("Reconnaissance");
    expect(chunk?.framework).toBe("atlas");
  });

  it("resolves a sub-technique's tactic through its specializes parent", () => {
    const chunk = chunks.find((c) => c.techniqueId === "AML.T0000.000" && c.chunkType === "description");
    expect(chunk?.tactic).toBe("Reconnaissance");
  });

  it("emits an example chunk from a case-study procedure step", () => {
    const chunk = chunks.find((c) => c.techniqueId === "AML.T0000.000" && c.chunkType === "example");
    expect(chunk?.chunkText).toContain("searched arXiv");
    expect(chunk?.tactic).toBe("Reconnaissance");
  });
});
