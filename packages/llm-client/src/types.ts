import type { ZodType } from "zod";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StructuredCompletionRequest<T> {
  model: string;
  system: string;
  messages: LLMMessage[];
  schema: ZodType<T>;
  schemaName: string;
  maxTokens?: number;
}

export interface CompletionRequest {
  model: string;
  system: string;
  messages: LLMMessage[];
  maxTokens?: number;
}

export interface CompletionResponse {
  text: string;
  stopReason: string | null;
  usage: { inputTokens: number; outputTokens: number };
}

export interface StructuredCompletionResponse<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LLMClient {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  completeStructured<T>(req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>>;
}
