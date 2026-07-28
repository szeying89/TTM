import type { AgentDescriptor } from "./types.js";

// Kahn's-algorithm layering: wave N is every agent whose entire dependsOn set
// is satisfied by the end of wave N-1. Agents that declare the same
// dependsOn set land in the same wave with no special-casing required -
// this is what lets Mitigation and Design-Enrich (both dependsOn:['risk'])
// run concurrently as siblings.
export function buildWaves(descriptors: AgentDescriptor[]): string[][] {
  const byName = new Map(descriptors.map((d) => [d.name, d]));
  for (const descriptor of descriptors) {
    for (const dep of descriptor.dependsOn) {
      if (!byName.has(dep)) {
        throw new Error(`Agent "${descriptor.name}" depends on unknown agent "${dep}"`);
      }
    }
  }

  const remaining = new Set(byName.keys());
  const waves: string[][] = [];

  while (remaining.size > 0) {
    const wave = Array.from(remaining).filter((name) => {
      const descriptor = byName.get(name)!;
      return descriptor.dependsOn.every((dep) => !remaining.has(dep));
    });

    if (wave.length === 0) {
      throw new Error(
        `Cycle detected in agent dependency graph among: ${Array.from(remaining).join(", ")}`,
      );
    }

    waves.push(wave.sort());
    for (const name of wave) remaining.delete(name);
  }

  return waves;
}
