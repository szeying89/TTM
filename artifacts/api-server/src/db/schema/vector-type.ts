import { customType } from "drizzle-orm/pg-core";

// pgvector column type via drizzle's customType, so this works regardless of
// whether the installed drizzle-orm version has native vector() support.
export const vector = (dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(",")}]`;
    },
    fromDriver(value: string): number[] {
      return value
        .slice(1, -1)
        .split(",")
        .filter((v) => v.length > 0)
        .map(Number);
    },
  });
