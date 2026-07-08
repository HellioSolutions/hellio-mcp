import { randomUUID } from "node:crypto";
import type { HellioConfig } from "./config.js";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Explicit Idempotency-Key. Takes precedence over autoIdempotency. */
  idempotencyKey?: string;
  /** When true and the method is not GET, generate an Idempotency-Key if none was given. */
  autoIdempotency?: boolean;
}

/** Thrown when the Hellio API responds with a non-2xx status. */
export class HellioApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
    message: string
  ) {
    super(message);
    this.name = "HellioApiError";
  }
}

function extractMessage(payload: unknown): string | undefined {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return undefined;
}

/** Thin authenticated HTTP wrapper around the Hellio Messaging REST API. */
export class HellioClient {
  constructor(private readonly config: HellioConfig) {}

  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const method = options.method ?? "GET";
    const url = new URL(this.config.baseUrl + path);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/json",
    };

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    } else if (options.autoIdempotency && method !== "GET") {
      headers["Idempotency-Key"] = randomUUID();
    }

    const response = await fetch(url, { method, headers, body });

    const raw = await response.text();
    let payload: unknown = undefined;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }

    if (!response.ok) {
      const message =
        extractMessage(payload) ?? `Hellio request failed with status ${response.status}.`;
      throw new HellioApiError(response.status, payload, message);
    }

    // 204 No Content and other empty bodies map to a simple ack.
    return payload ?? { ok: true };
  }
}
