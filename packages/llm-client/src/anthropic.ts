import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  CompletionRequest,
  CompletionResponse,
  LLMClient,
  StructuredCompletionRequest,
  StructuredCompletionResponse,
} from "./types.js";

const DEFAULT_MAX_TOKENS = 4096;

export class AnthropicLLMClient implements LLMClient {
  private readonly client: Anthropic;

  constructor(apiKey: string = process.env.ANTHROPIC_API_KEY ?? "") {
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.messages.create({
      model: req.model,
      system: req.system,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: req.messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return {
      text: textBlock && textBlock.type === "text" ? textBlock.text : "",
      stopReason: response.stop_reason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  // Structured output is obtained by forcing a single tool call whose input_schema
  // is derived from the caller's Zod schema, rather than parsing free-form JSON out
  // of prose - this avoids fragile "extract the JSON from this text" post-processing.
  async completeStructured<T>(
    req: StructuredCompletionRequest<T>,
  ): Promise<StructuredCompletionResponse<T>> {
    const jsonSchema = zodToJsonSchema(req.schema, req.schemaName);

    const response = await this.client.messages.create({
      model: req.model,
      system: req.system,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: req.messages,
      tools: [
        {
          name: req.schemaName,
          description: `Emit the ${req.schemaName} result.`,
          input_schema: jsonSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: req.schemaName },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error(`Anthropic response did not include a ${req.schemaName} tool_use block`);
    }

    const parsed = req.schema.parse(toolUse.input);
    return {
      data: parsed,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
