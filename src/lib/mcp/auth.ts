import { authMode } from "@/lib/config";

/**
 * MCP write-tool auth constraint (ADR-023). When AUTH_MODE=passcode, write tools
 * require a matching credential — the MCP client must pass CCBILLY_MCP_TOKEN (or
 * the process must have ADMIN_PASSCODE and the caller supply it) equal to
 * ADMIN_PASSCODE. In AUTH_MODE=none (single-user local default) writes are open,
 * mirroring the HTTP layer's localhost behavior.
 *
 * Throwing here aborts the tool call; the SDK reports it as an error to the client.
 */
export function assertWriteAllowed(providedToken?: string): void {
  if (authMode() !== "passcode") return; // none → local convenience
  const expected = process.env.ADMIN_PASSCODE ?? "";
  if (!expected) {
    throw new Error(
      "AUTH_MODE=passcode 但未设置 ADMIN_PASSCODE：写操作被拒绝（fail-closed）。",
    );
  }
  const token = providedToken ?? process.env.CCBILLY_MCP_TOKEN ?? "";
  if (token !== expected) {
    throw new Error(
      "写操作需要有效凭据：请在 MCP 客户端配置 CCBILLY_MCP_TOKEN=<ADMIN_PASSCODE>。",
    );
  }
}
