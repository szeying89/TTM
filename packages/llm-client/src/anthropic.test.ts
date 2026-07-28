import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { z } from "zod";
import { AnthropicLLMClient } from "./anthropic.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AnthropicLLMClient", () => {
  it("sends a forced tool_choice request shaped from the caller's schema", async () => {
    let capturedBody: { model: string; tools: { name: string }[]; tool_choice: unknown } | undefined;
    server.use(
      http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
        const body = (await request.json()) as {
          model: string;
          tools: { name: string }[];
          tool_choice: unknown;
        };
        capturedBody = body;
        return HttpResponse.json({
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: body.model,
          content: [
            {
              type: "tool_use",
              id: "tool_1",
              name: "TestSchema",
              input: { foo: "bar" },
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 10, output_tokens: 5 },
        });
      }),
    );

    const client = new AnthropicLLMClient("test-key");
    const schema = z.object({ foo: z.string() });

    const result = await client.completeStructured({
      model: "claude-opus-5",
      system: "You are a test.",
      messages: [{ role: "user", content: "go" }],
      schema,
      schemaName: "TestSchema",
    });

    expect(result.data).toEqual({ foo: "bar" });
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(capturedBody?.tool_choice).toEqual({ type: "tool", name: "TestSchema" });
    expect(capturedBody?.tools[0]?.name).toBe("TestSchema");
  });

  it("throws if the response has no tool_use block", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json({
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-opus-5",
          content: [{ type: "text", text: "no tool call here" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      ),
    );

    const client = new AnthropicLLMClient("test-key");
    const schema = z.object({ foo: z.string() });

    await expect(
      client.completeStructured({
        model: "claude-opus-5",
        system: "sys",
        messages: [{ role: "user", content: "go" }],
        schema,
        schemaName: "TestSchema",
      }),
    ).rejects.toThrow(/tool_use/);
  });
});

describe.skipIf(process.env.RUN_LIVE_API_TESTS !== "1")("AnthropicLLMClient (live)", () => {
  it("completes a real structured request against the Anthropic API", async () => {
    const client = new AnthropicLLMClient();
    const schema = z.object({ answer: z.string() });
    const result = await client.completeStructured({
      model: "claude-sonnet-5",
      system: "Answer concisely.",
      messages: [{ role: "user", content: "What is the capital of France? Reply with just the city name." }],
      schema,
      schemaName: "Answer",
    });
    expect(result.data.answer.toLowerCase()).toContain("paris");
  });
});
