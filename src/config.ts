export interface HellioConfig {
  baseUrl: string;
  token: string;
}

const DEFAULT_BASE_URL = "https://api.helliomessaging.com";

/**
 * Loads configuration from the environment. Exits the process with a helpful
 * message if the required token is missing, since an MCP server with no
 * credentials can do nothing useful.
 */
export function loadConfig(): HellioConfig {
  const token = process.env.HELLIO_API_TOKEN?.trim();
  if (!token) {
    console.error(
      "Missing HELLIO_API_TOKEN. Set it to a Hellio Sanctum token before starting the server."
    );
    process.exit(1);
  }

  const baseUrl = (process.env.HELLIO_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );

  return { baseUrl, token };
}
