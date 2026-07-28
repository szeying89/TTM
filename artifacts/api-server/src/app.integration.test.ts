import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { FastifyInstance } from "fastify";
import * as schema from "./db/schema/index.js";
import { buildApp } from "./app.js";
import { clearRegistry, registerAgent } from "./agents/registry.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("api-server (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let app: FastifyInstance;
  let uploadsDir: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    uploadsDir = await mkdtemp(path.join(tmpdir(), "intel-feeds-"));
    app = await buildApp({ db, uploadsDir });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await rm(uploadsDir, { recursive: true, force: true });
  });

  beforeEach(() => clearRegistry());
  afterEach(() => clearRegistry());

  async function createProject() {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Test Project" },
    });
    return response.json();
  }

  it("creates a project, adds a design doc, and reads it back", async () => {
    const project = await createProject();
    expect(project.id).toBeDefined();

    const docResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/design-doc`,
      payload: { prose: "A simple 3-tier app.", mermaidText: "flowchart LR; A-->B" },
    });
    expect(docResponse.statusCode).toBe(201);

    const getResponse = await app.inject({ method: "GET", url: `/projects/${project.id}` });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().name).toBe("Test Project");
  });

  it("404s on a design doc upload for a nonexistent project", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/projects/00000000-0000-0000-0000-000000000000/design-doc",
      payload: { prose: "x", mermaidText: "" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("accepts a URL intel feed and persists a pending item", async () => {
    const project = await createProject();
    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/intel-feeds`,
      payload: { url: "https://example.com/advisory" },
    });
    expect(response.statusCode).toBe(201);
    const item = response.json();
    expect(item.sourceType).toBe("url");
    expect(item.status).toBe("pending");

    const listResponse = await app.inject({ method: "GET", url: `/projects/${project.id}/intel-feeds` });
    expect(listResponse.json()).toHaveLength(1);
  });

  it("accepts a PDF intel feed upload and stores it on disk", async () => {
    const project = await createProject();

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/pdf" }), "advisory.pdf");
    const bodyResponse = new Response(formData);
    const buffer = Buffer.from(await bodyResponse.arrayBuffer());
    const contentType = bodyResponse.headers.get("content-type")!;

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/intel-feeds`,
      headers: { "content-type": contentType },
      payload: buffer,
    });

    expect(response.statusCode).toBe(201);
    const item = response.json();
    expect(item.sourceType).toBe("pdf");
    expect(item.sourceRef).toContain(uploadsDir);
  });

  it("rejects a non-PDF file upload", async () => {
    const project = await createProject();

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array([1, 2, 3])], { type: "text/plain" }), "notes.txt");
    const bodyResponse = new Response(formData);
    const buffer = Buffer.from(await bodyResponse.arrayBuffer());
    const contentType = bodyResponse.headers.get("content-type")!;

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/intel-feeds`,
      headers: { "content-type": contentType },
      payload: buffer,
    });

    expect(response.statusCode).toBe(400);
  });

  it("triggers a pipeline run and reaches a terminal status with registered stub agents", async () => {
    registerAgent({ name: "architect", dependsOn: [], outputs: [], handler: async () => ({ outputRefs: ["component:1"] }) });
    registerAgent({ name: "threat", dependsOn: ["architect"], outputs: [], handler: async () => ({ outputRefs: [] }) });

    const project = await createProject();
    const runResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/pipeline-runs`,
      payload: {},
    });
    expect(runResponse.statusCode).toBe(202);
    const run = runResponse.json();

    let status = "pending";
    for (let i = 0; i < 20 && (status === "pending" || status === "running"); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const poll = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}` });
      status = poll.json().status;
    }
    expect(status).toBe("succeeded");

    const stepsResponse = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}/steps` });
    const steps = stepsResponse.json();
    expect(steps.map((s: { agentName: string }) => s.agentName).sort()).toEqual(["architect", "threat"]);
  });

  it("returns an empty report list for a project with no reports yet", async () => {
    const project = await createProject();
    const response = await app.inject({ method: "GET", url: `/projects/${project.id}/reports` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});
