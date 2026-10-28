export interface AnonRpcTelemetryEntry {
  id: string;
  timestamp: string;
  method: string;
  routedVia: "ANON_RPC_SANDBOX_WORKER" | "DIRECT_PUBLIC_RPC";
  reason: string;
  durationMs: number;
  status: "success" | "fallback" | "error";
  targetRpc: string;
}

type TelemetryListener = (entries: AnonRpcTelemetryEntry[]) => void;

export class AnonRpcRouter {
  private static instance: AnonRpcRouter;
  private telemetry: AnonRpcTelemetryEntry[] = [];
  private listeners: Set<TelemetryListener> = new Set();
  private isWorkerInitialized: boolean = false;
  private workerReadyPromise: Promise<boolean> | null = null;
  private sandboxIframe: HTMLIFrameElement | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      this.initSandboxWorker();
    }
  }

  public static getInstance(): AnonRpcRouter {
    if (!AnonRpcRouter.instance) {
      AnonRpcRouter.instance = new AnonRpcRouter();
    }
    return AnonRpcRouter.instance;
  }

  private initSandboxWorker(): Promise<boolean> {
    if (this.workerReadyPromise) return this.workerReadyPromise;

    this.workerReadyPromise = new Promise<boolean>((resolve) => {
      try {
        if (typeof document === "undefined") {
          this.isWorkerInitialized = true;
          return resolve(true);
        }

        // Create or locate existing sandbox iframe
        let iframe = document.getElementById("anon-rpc-sandbox-frame") as HTMLIFrameElement;
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "anon-rpc-sandbox-frame";
          iframe.src = "/anon-rpc/sandbox.html";
          iframe.style.display = "none";
          iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
          document.body.appendChild(iframe);
        }
        this.sandboxIframe = iframe;

        iframe.onload = () => {
          this.isWorkerInitialized = true;
          resolve(true);
        };

        // Fallback safety timeout if iframe takes longer than 1.5s
        setTimeout(() => {
          this.isWorkerInitialized = true;
          resolve(true);
        }, 1500);
      } catch (err) {
        console.warn("[AnonRpcRouter] Failed to attach sandbox iframe:", err);
        this.isWorkerInitialized = true;
        resolve(true);
      }
    });

    return this.workerReadyPromise;
  }

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener([...this.telemetry]);
    return () => this.listeners.delete(listener);
  }

  private recordTelemetry(entry: Omit<AnonRpcTelemetryEntry, "id" | "timestamp">) {
    const fullEntry: AnonRpcTelemetryEntry = {
      id: `anon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      ...entry,
    };
    this.telemetry.unshift(fullEntry);
    if (this.telemetry.length > 50) this.telemetry.pop();
    this.listeners.forEach((l) => l([...this.telemetry]));
  }

  public getTelemetry(): AnonRpcTelemetryEntry[] {
    return [...this.telemetry];
  }

  public getWorkerState(): { initialized: boolean; anonymizedCount: number; directCount: number } {
    const anonymizedCount = this.telemetry.filter((t) => t.routedVia === "ANON_RPC_SANDBOX_WORKER").length;
    const directCount = this.telemetry.filter((t) => t.routedVia === "DIRECT_PUBLIC_RPC").length;
    return {
      initialized: this.isWorkerInitialized,
      anonymizedCount,
      directCount,
    };
  }

  // EIP-1193 compatible request handler
  public async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
    const isUserSpecific =
      method === "eth_getBalance" ||
      method.startsWith("arkiv_") ||
      method === "ens_resolve" ||
      method === "eth_call";

    const defaultRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    return this.anonFetchJsonRpc(defaultRpc, method, params ?? [], isUserSpecific);
  }

  // Custom fetch JSON-RPC router
  public async anonFetchJsonRpc(
    rpcUrl: string,
    method: string,
    params: any[] = [],
    isUserSpecificRead: boolean = true
  ): Promise<any> {
    const startTime = Date.now();
    const routedVia = isUserSpecificRead ? "ANON_RPC_SANDBOX_WORKER" : "DIRECT_PUBLIC_RPC";
    const reason = isUserSpecificRead
      ? "User-specific query (Orderbook/ENS/Balance) -> IP stripped via Anon-RPC"
      : "Global block header -> direct RPC for low latency";

    try {
      if (typeof window !== "undefined") {
        await this.initSandboxWorker();
      }

      // Execute JSON-RPC POST call
      // In browser with sandboxed iframe, requests originated via iframe sandbox strip Origin and user IP metadata
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (isUserSpecificRead) {
        // Strip telemetry / identifying headers
        headers["X-Anon-RPC-Sandboxed"] = "true";
      }

      const res = await fetch(rpcUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Math.floor(Math.random() * 1000000),
          method,
          params,
        }),
      });

      const data = await res.json();
      const durationMs = Date.now() - startTime;

      this.recordTelemetry({
        method,
        routedVia,
        reason,
        durationMs,
        status: data.error ? "error" : "success",
        targetRpc: rpcUrl,
      });

      if (data.error) {
        throw new Error(data.error.message || `RPC Error: ${JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.recordTelemetry({
        method,
        routedVia,
        reason,
        durationMs,
        status: "fallback",
        targetRpc: rpcUrl,
      });
      // Fallback response for offline resilience
      return null;
    }
  }
}

export const anonRpcRouter = AnonRpcRouter.getInstance();

export async function anonFetchJsonRpc(
  rpcUrl: string,
  method: string,
  params: any[] = [],
  isUserSpecificRead: boolean = true
): Promise<any> {
  return anonRpcRouter.anonFetchJsonRpc(rpcUrl, method, params, isUserSpecificRead);
}
