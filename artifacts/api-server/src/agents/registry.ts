import type { AgentDescriptor } from "../orchestrator/types.js";

const registry = new Map<string, AgentDescriptor>();

export function registerAgent(descriptor: AgentDescriptor): void {
  if (registry.has(descriptor.name)) {
    throw new Error(`Agent "${descriptor.name}" is already registered`);
  }
  registry.set(descriptor.name, descriptor);
}

export function getRegistry(): AgentDescriptor[] {
  return Array.from(registry.values());
}

// Test-only: registries are process-wide singletons, so tests that register
// their own stub agents need a way to reset state between runs.
export function clearRegistry(): void {
  registry.clear();
}
