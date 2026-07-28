import { describe, expect, it } from "vitest";
import { normalizeAttackBundle } from "./normalize-attack.js";
import type { StixBundle } from "./stix-types.js";

const fixtureBundle: StixBundle = {
  type: "bundle",
  id: "bundle--test",
  objects: [
    {
      id: "x-mitre-tactic--1",
      type: "x-mitre-tactic",
      name: "Initial Access",
      x_mitre_shortname: "initial-access",
    },
    {
      id: "attack-pattern--1",
      type: "attack-pattern",
      name: "Phishing",
      description: "Adversaries may send phishing messages to gain access to victim systems.",
      external_references: [{ source_name: "mitre-attack", external_id: "T1566" }],
      kill_chain_phases: [{ kill_chain_name: "mitre-attack", phase_name: "initial-access" }],
    },
    {
      id: "attack-pattern--revoked",
      type: "attack-pattern",
      name: "Revoked Technique",
      description: "Should be excluded.",
      external_references: [{ source_name: "mitre-attack", external_id: "T9999" }],
      revoked: true,
    },
    {
      id: "course-of-action--1",
      type: "course-of-action",
      name: "User Training",
      description: "Train users to identify social engineering techniques.",
    },
    {
      id: "relationship--mitigates-1",
      type: "relationship",
      relationship_type: "mitigates",
      source_ref: "course-of-action--1",
      target_ref: "attack-pattern--1",
    },
    {
      id: "x-mitre-detection-strategy--1",
      type: "x-mitre-detection-strategy",
      name: "Detection Strategy for Phishing",
      x_mitre_analytic_refs: ["x-mitre-analytic--1", "x-mitre-analytic--2"],
    },
    {
      id: "x-mitre-analytic--1",
      type: "x-mitre-analytic",
      name: "Analytic 1",
      description: "Monitor email gateway logs for suspicious attachments.",
    },
    {
      id: "x-mitre-analytic--2",
      type: "x-mitre-analytic",
      name: "Analytic 2",
      description: "Monitor for anomalous OAuth application consent grants.",
    },
    {
      id: "relationship--detects-1",
      type: "relationship",
      relationship_type: "detects",
      source_ref: "x-mitre-detection-strategy--1",
      target_ref: "attack-pattern--1",
    },
    {
      id: "malware--1",
      type: "malware",
      name: "Emotet",
    },
    {
      id: "relationship--uses-1",
      type: "relationship",
      relationship_type: "uses",
      source_ref: "malware--1",
      target_ref: "attack-pattern--1",
      description: "[Emotet](https://attack.mitre.org/software/S0367) has been delivered via phishing emails.",
    },
  ] as unknown as StixBundle["objects"],
};

describe("normalizeAttackBundle", () => {
  const chunks = normalizeAttackBundle(fixtureBundle, {
    framework: "enterprise",
    killChainName: "mitre-attack",
  });

  it("excludes revoked techniques", () => {
    expect(chunks.some((c) => c.techniqueId === "T9999")).toBe(false);
  });

  it("emits a description chunk resolving the tactic shortname to its display name", () => {
    const description = chunks.find((c) => c.techniqueId === "T1566" && c.chunkType === "description");
    expect(description).toBeDefined();
    expect(description?.tactic).toBe("Initial Access");
    expect(description?.name).toBe("Phishing");
  });

  it("joins detection-strategy analytics into a single detection chunk", () => {
    const detection = chunks.find((c) => c.techniqueId === "T1566" && c.chunkType === "detection");
    expect(detection?.chunkText).toContain("email gateway");
    expect(detection?.chunkText).toContain("OAuth application consent");
  });

  it("emits a mitigation chunk from the mitigating course-of-action", () => {
    const mitigation = chunks.find((c) => c.techniqueId === "T1566" && c.chunkType === "mitigation");
    expect(mitigation?.chunkText).toContain("social engineering");
  });

  it("emits an example chunk from a 'uses' relationship with a description", () => {
    const example = chunks.find((c) => c.techniqueId === "T1566" && c.chunkType === "example");
    expect(example?.chunkText).toContain("Emotet");
  });
});
