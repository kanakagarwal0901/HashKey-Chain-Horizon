/**
 * OpenClaw Autonomous Agent on HashKey Chain
 * Track 2: Agent Payments & A2A Settlement
 */

import { runHashKeyAutonomousAgent } from "../agent/openclaw-hsk-agent";

runHashKeyAutonomousAgent().catch((err) => {
  console.error("OpenClaw Agent Error:", err);
  process.exit(1);
});
