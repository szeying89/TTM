import { z } from "zod";

export const MitreFramework = z.enum(["enterprise", "ics", "atlas"]);
export type MitreFramework = z.infer<typeof MitreFramework>;

export const StrideCategory = z.enum([
  "spoofing",
  "tampering",
  "repudiation",
  "information-disclosure",
  "denial-of-service",
  "elevation-of-privilege",
]);
export type StrideCategory = z.infer<typeof StrideCategory>;

export const CriFunction = z.enum([
  "govern",
  "identify",
  "protect",
  "detect",
  "respond",
  "recover",
]);
export type CriFunction = z.infer<typeof CriFunction>;

export const CriMaturityTier = z.enum([
  "not-assessed",
  "baseline",
  "evolving",
  "intermediate",
  "advanced",
  "innovative",
]);
export type CriMaturityTier = z.infer<typeof CriMaturityTier>;
