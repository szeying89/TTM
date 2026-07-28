import { describe, expect, it } from "vitest";
import { parseFlowchart } from "./mermaid-flowchart-parser.js";

describe("parseFlowchart", () => {
  it("parses simple unlabeled edges", () => {
    const ast = parseFlowchart(`
      flowchart TD
      A --> B
      B --> C
    `);
    expect(ast.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"]);
    expect(ast.edges).toEqual([
      { sourceId: "A", targetId: "B", label: undefined },
      { sourceId: "B", targetId: "C", label: undefined },
    ]);
  });

  it("extracts node labels from shape delimiters", () => {
    const ast = parseFlowchart(`
      flowchart LR
      Browser[Web Browser] --> API(API Gateway)
      API --> DB[(Database)]
    `);
    const browser = ast.nodes.find((n) => n.id === "Browser");
    const api = ast.nodes.find((n) => n.id === "API");
    const db = ast.nodes.find((n) => n.id === "DB");
    expect(browser?.label).toBe("Web Browser");
    expect(api?.label).toBe("API Gateway");
    expect(db?.label).toBe("Database");
  });

  it("captures edge labels", () => {
    const ast = parseFlowchart(`flowchart TD\nA -->|HTTPS| B`);
    expect(ast.edges[0]).toEqual({ sourceId: "A", targetId: "B", label: "HTTPS" });
  });

  it("handles chained edges on a single line", () => {
    const ast = parseFlowchart(`flowchart TD\nA --> B --> C`);
    expect(ast.edges).toEqual([
      { sourceId: "A", targetId: "B", label: undefined },
      { sourceId: "B", targetId: "C", label: undefined },
    ]);
  });

  it("groups nodes under subgraphs (trust-boundary hints)", () => {
    const ast = parseFlowchart(`
      flowchart TD
      subgraph Public["Public Zone"]
        Browser[Web Browser]
      end
      subgraph Internal["Internal Zone"]
        API[API Gateway]
        DB[(Database)]
      end
      Browser --> API
      API --> DB
    `);
    expect(ast.subgraphs).toEqual([
      { id: "Public", label: "Public Zone" },
      { id: "Internal", label: "Internal Zone" },
    ]);
    expect(ast.nodes.find((n) => n.id === "Browser")?.subgraphId).toBe("Public");
    expect(ast.nodes.find((n) => n.id === "API")?.subgraphId).toBe("Internal");
    expect(ast.nodes.find((n) => n.id === "DB")?.subgraphId).toBe("Internal");
  });

  it("ignores comments", () => {
    const ast = parseFlowchart(`flowchart TD\n%% this is a comment\nA --> B`);
    expect(ast.nodes).toHaveLength(2);
  });

  it("handles dotted and thick arrows", () => {
    const ast = parseFlowchart(`flowchart TD\nA -.-> B\nB ==> C`);
    expect(ast.edges).toEqual([
      { sourceId: "A", targetId: "B", label: undefined },
      { sourceId: "B", targetId: "C", label: undefined },
    ]);
  });
});
