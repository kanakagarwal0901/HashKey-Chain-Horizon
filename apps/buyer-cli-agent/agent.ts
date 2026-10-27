/**
 * Autonomous Buyer Agent — HashKey Horizon Protocol
 */

import { runHashKeyAutonomousAgent } from "../agent/openclaw-hsk-agent";

runHashKeyAutonomousAgent().catch((err) => {
  console.error("Agent Error:", err);
  process.exit(1);
});
