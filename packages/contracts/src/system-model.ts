import { z } from "zod";
import { Component } from "./component.js";
import { Dataflow } from "./dataflow.js";
import { TrustBoundary } from "./trust-boundary.js";

export const SystemModel = z.object({
  id: z.string(),
  projectId: z.string(),
  components: z.array(Component),
  dataflows: z.array(Dataflow),
  trustBoundaries: z.array(TrustBoundary),
  createdAt: z.string(),
});
export type SystemModel = z.infer<typeof SystemModel>;
