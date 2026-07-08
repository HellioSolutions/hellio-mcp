# Hellio Messaging MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the Hellio Messaging API to any MCP-capable AI client (Claude Desktop, Claude Code, Cursor, and others).

It maps every Hellio API operation to a tool: SMS, OTP, voice, HLR lookup, email verification, balance and pricing, webhooks, and the full USSD suite (apps, extensions, sessions, sandbox simulation). 28 tools in total.

## Requirements

- Node.js 18 or newer
- A Hellio Sanctum personal access token. Its scopes decide which tools can succeed.

## Build

```bash
cd mcp-server
npm install
npm run build
```

This compiles to `dist/`. The entrypoint is `dist/index.js`.

## Configuration

The server reads two environment variables:

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `HELLIO_API_TOKEN` | yes | - | Your Sanctum bearer token. |
| `HELLIO_API_BASE_URL` | no | `https://api.helliomessaging.com` | Override to point at staging or local. |

Copy `.env.example` to `.env` for local testing, or pass the variables through your MCP client config (below).

## Connect it to a client

### Claude Desktop

Edit `claude_desktop_config.json` (Settings, Developer, Edit Config) and add:

```json
{
  "mcpServers": {
    "hellio": {
      "command": "node",
      "args": ["/absolute/path/to/hellio-v2/mcp-server/dist/index.js"],
      "env": {
        "HELLIO_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

Restart Claude Desktop. The Hellio tools appear under the tools menu.

### Claude Code

```bash
claude mcp add hellio \
  --env HELLIO_API_TOKEN=your-token-here \
  -- node /absolute/path/to/hellio-v2/mcp-server/dist/index.js
```

## Try it

Use the MCP Inspector to click through the tools without a full client:

```bash
npm run inspect
```

Then set `HELLIO_API_TOKEN` in the Inspector's environment panel and call, for example, `hellio_get_balance`.

## Tools

Read-only (safe to call freely):

- `hellio_get_balance`, `hellio_get_pricing`
- `hellio_list_messages`, `hellio_get_message`, `hellio_list_campaigns`, `hellio_get_campaign`
- `hellio_list_webhooks`
- `hellio_ussd_get_pricing`, `hellio_ussd_check_extension_availability`
- `hellio_ussd_list_apps`, `hellio_ussd_list_extensions`
- `hellio_ussd_list_sessions`, `hellio_ussd_get_session`

Writes that spend money (each description begins with "Spends real money"):

- `hellio_send_sms`, `hellio_send_otp`, `hellio_send_voice`
- `hellio_lookup_numbers`, `hellio_verify_email`
- `hellio_ussd_rent_extension`

Other writes:

- `hellio_verify_otp`, `hellio_create_webhook`
- `hellio_ussd_create_app`, `hellio_ussd_update_app`, `hellio_ussd_delete_app`
- `hellio_ussd_switch_app_mode`, `hellio_ussd_rotate_app_secret`, `hellio_ussd_release_extension`
- `hellio_ussd_simulate`

## Safety notes

- Money-spending sends attach an `Idempotency-Key` automatically, so a retried tool call replays the original response instead of double-charging.
- Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`) so clients can gate or confirm the risky ones.
- Which tools succeed depends on the token's scopes. A `403` or "insufficient scope" error means the token lacks that ability, not that the tool is broken.

## Project layout

```
mcp-server/
  src/
    index.ts        server bootstrap, stdio transport
    config.ts       env loading
    client.ts       authenticated HTTP wrapper + idempotency
    format.ts       tool result helpers
    tools/          one file per API domain
  dist/             compiled output (generated)
```

To add a tool, add it to the matching file in `src/tools/` and rebuild.
