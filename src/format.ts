import { HellioApiError } from "./client.js";

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

/** Wraps a successful payload as a JSON text tool result. */
export function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/** Turns any thrown error into a readable, non-fatal tool error. */
export function fail(error: unknown): ToolResult {
  if (error instanceof HellioApiError) {
    const detail = error.payload ? `\n\n${JSON.stringify(error.payload, null, 2)}` : "";
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Hellio API error (HTTP ${error.status}): ${error.message}${detail}`,
        },
      ],
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${message}` }],
  };
}

/** Runs an async operation and formats success or failure uniformly. */
export async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error);
  }
}
