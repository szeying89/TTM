import { z } from "zod";

export const ComponentType = z.enum(["process", "datastore", "external_entity", "actor"]);
export type ComponentType = z.infer<typeof ComponentType>;

export const Component = z.object({
  id: z.string(),
  name: z.string(),
  type: ComponentType,
  description: z.string(),
  technologies: z.array(z.string()),
  trustBoundaryId: z.string().optional(),
  sourceRefs: z.array(z.string()),
});
export type Component = z.infer<typeof Component>;
