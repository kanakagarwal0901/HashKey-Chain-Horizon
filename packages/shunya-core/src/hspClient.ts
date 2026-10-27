import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export interface HSPMandateRequest {
  mandateId: string;
  buyerAgent: string;
  sellerNode: string;
  token?: string; // address(0) or undefined for native HSK
  maxDepositEthOrHsk: string;
  tMax: number;
  modelId: string;
  deadlineSeconds?: number;
}

export interface HSPSettlementExecution {
  mandateId: string;
  sellerPayoutEthOrHsk: string;
  protocolFeeEthOrHsk: string;
  buyerRefundEthOrHsk: string;
  tUsed: number;
  attestationHashHex: string;
}

export class HSPClient {
  public provider: ethers.JsonRpcProvider;
  public wallet?: ethers.Wallet;
  public hspAdapterContract: ethers.Contract;
  public routerContract?: ethers.Contract;
  public chainId: number;

  constructor(
    rpcUrl: string = "https://testnet.hsk.xyz",
    privateKey?: string,
    hspAdapterAddress: string = "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae",
    routerAddress?: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.chainId = 133;

    // Load Artifact ABI
    const artifactPath = path.resolve(
      process.cwd(),
      "contracts",
      "artifacts",
      "HSPAdapter.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.hspAdapterContract = new ethers.Contract(
        hspAdapterAddress,
        artifact.abi,
        this.wallet
      );
    } else {
      this.hspAdapterContract = new ethers.Contract(
        hspAdapterAddress,
        artifact.abi,
        this.provider
      );
    }

    if (routerAddress) {
      const routerArtifactPath = path.resolve(
        process.cwd(),
        "contracts",
        "artifacts",
        "HashKeySettlementRouter.json"
      );
      const routerArtifact = JSON.parse(
        fs.readFileSync(routerArtifactPath, "utf8")
      );
      this.routerContract = new ethers.Contract(
        routerAddress,
        routerArtifact.abi,
        this.wallet || this.provider
      );
    }
  }

  /**
   * Generates a unique 32-byte mandate ID for tracking via HashKey Merchant rails.
   */
  public generateMandateId(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Constructs and signs an EIP-712 payment mandate with the buyer agent's private key.
   */
  public async signPaymentMandate(req: HSPMandateRequest): Promise<{
    v: number;
    r: string;
    s: string;
    deadline: number;
  }> {
    if (!this.wallet) {
      throw new Error("Wallet with private key required to sign payment mandate");
    }

    const deadline = Math.floor(Date.now() / 1000) + (req.deadlineSeconds || 3600);
    const domain = {
      name: "HashKey Settlement Protocol Adapter",
      version: "1.0",
      chainId: this.chainId,
      verifyingContract: await this.hspAdapterContract.getAddress(),
    };

    const types = {
      HSPPaymentMandate: [
        { name: "mandateId", type: "bytes32" },
        { name: "buyerAgent", type: "address" },
        { name: "sellerNode", type: "address" },
        { name: "token", type: "address" },
        { name: "maxDeposit", type: "uint256" },
        { name: "tMax", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const nonce = await this.hspAdapterContract.agentNonces(this.wallet.address);
    const tokenAddr = req.token || ethers.ZeroAddress;
    const maxDepositWei = ethers.parseEther(req.maxDepositEthOrHsk);

    const value = {
      mandateId: req.mandateId,
      buyerAgent: this.wallet.address,
      sellerNode: req.sellerNode,
      token: tokenAddr,
      maxDeposit: maxDepositWei,
      tMax: req.tMax,
      nonce: Number(nonce),
      deadline: deadline,
    };

    const signature = await this.wallet.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    return {
      v: sig.v,
      r: sig.r,
      s: sig.s,
      deadline,
    };
  }

  /**
   * Locks the upfront T_max deposit on HashKey Chain under the signed HSP mandate.
   */
  public async lockMandateWithSignature(
    req: HSPMandateRequest,
    v: number,
    r: string,
    s: string,
    deadline: number
  ): Promise<ethers.TransactionReceipt> {
    if (!this.wallet) throw new Error("Wallet required to broadcast transaction");

    const tokenAddr = req.token || ethers.ZeroAddress;
    const maxDepositWei = ethers.parseEther(req.maxDepositEthOrHsk);

    const params = {
      mandateId: req.mandateId,
      sellerNode: req.sellerNode,
      token: tokenAddr,
      maxDeposit: maxDepositWei,
      tMax: req.tMax,
      modelId: req.modelId,
      deadline: deadline,
    };

    const tx = await this.hspAdapterContract.lockHSPMandateWithSignature(
      params,
      v,
      r,
      s,
      {
        value: tokenAddr === ethers.ZeroAddress ? maxDepositWei : 0n,
      }
    );

    const receipt = await tx.wait();
    return receipt;
  }

  /**
   * Settles the HSP mandate on HashKey Chain post-inference with actual T_used.
   */
  public async settleMandate(
    settlement: HSPSettlementExecution
  ): Promise<ethers.TransactionReceipt> {
    if (!this.wallet) throw new Error("Owner wallet required to execute settlement");

    const sellerPayoutWei = ethers.parseEther(settlement.sellerPayoutEthOrHsk);
    const protocolFeeWei = ethers.parseEther(settlement.protocolFeeEthOrHsk);
    const buyerRefundWei = ethers.parseEther(settlement.buyerRefundEthOrHsk);

    const tx = await this.hspAdapterContract.settleHSPMandate(
      settlement.mandateId,
      sellerPayoutWei,
      protocolFeeWei,
      buyerRefundWei,
      settlement.tUsed,
      settlement.attestationHashHex
    );

    const receipt = await tx.wait();
    return receipt;
  }

  /**
   * Queries on-chain mandate status from HashKey Chain.
   */
  public async getMandateStatus(mandateId: string) {
    const mandate = await this.hspAdapterContract.mandates(mandateId);
    const statusMap = ["NONE", "LOCKED", "SETTLED", "REFUNDED"];
    const statusCode = Number(mandate.status ?? mandate[6]);
    return {
      buyerAgent: mandate.buyerAgent ?? mandate[0],
      sellerNode: mandate.sellerNode ?? mandate[1],
      token: mandate.token ?? mandate[2],
      maxDeposit: ethers.formatEther(mandate.maxDeposit ?? mandate[3]),
      tMax: Number(mandate.tMax ?? mandate[4]),
      modelId: mandate.modelId ?? mandate[5],
      statusCode,
      status: statusMap[statusCode] || "UNKNOWN",
      createdAt: Number(mandate.createdAt ?? mandate[7]),
    };
  }
}
