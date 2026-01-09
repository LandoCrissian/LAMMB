/**
 * LAMMB Configuration
 * ═══════════════════════════════════════════════════════════
 * Edit this file to configure your token launch.
 * 
 * launchMode:
 *   - "prelaunch" : Token not yet live. BUY view shows waiting state.
 *   - "live"      : Token is live. BUY view shows CA and links.
 *
 * token.mint:
 *   - Set this to your Solana token mint address when live.
 *
 * token.links:
 *   - Fill in URLs as they become available.
 *   - Empty strings will be hidden from the UI.
 * ═══════════════════════════════════════════════════════════
 */

window.LAMMB = {
  name: "LAMMB",
  ticker: "LAMMB",
  tagline: "Let's All Make Money.",
  communityUrl: "https://x.com/i/communities/2009302380622565434",
  launchMode: "prelaunch", // "prelaunch" | "live"
  token: {
    chain: "solana",
    mint: "", // Set your contract address here when live
    links: {
      pumpfun: "",     // Primary buy link
      dexscreener: "",
      jupiter: "",
      raydium: "",
      birdeye: ""
    }
  }
};
