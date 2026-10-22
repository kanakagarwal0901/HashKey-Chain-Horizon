import { NextRequest, NextResponse } from "next/server";
import { createRealWorldIdSession } from "@/lib/worldIdSessionStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = body.walletAddress || "0xAnonymousUser";
    const customAppId = body.appId;
    const customAction = body.action;

    const session = await createRealWorldIdSession(walletAddress, customAppId, customAction);

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      connectorURI: session.connectorURI,
      simulatorUrl: session.simulatorUrl,
      qrDataUrl: session.qrDataUrl,
    });
  } catch (err: any) {
    console.error("Failed to initialize World ID bridge session:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to initialize World ID session" },
      { status: 500 }
    );
  }
}
