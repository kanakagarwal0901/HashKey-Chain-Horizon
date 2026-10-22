import crypto from "crypto";

export interface QuotaReservation {
  lockId: string;
  entityKey: string;
  reservedTokens: number;
  acquiredAt: number;
  expiresAt: number;
}

class QuotaReservationLockManager {
  private static instance: QuotaReservationLockManager;
  // entityKey -> Map<lockId, QuotaReservation>
  private activeLocks: Map<string, Map<string, QuotaReservation>> = new Map();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Background prune expired locks
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.pruneExpired(), 30_000).unref?.();
    }
  }

  public static getInstance(): QuotaReservationLockManager {
    if (!QuotaReservationLockManager.instance) {
      QuotaReservationLockManager.instance = new QuotaReservationLockManager();
    }
    return QuotaReservationLockManager.instance;
  }

  public getLockedTokens(entityKey: string): number {
    this.pruneExpired();
    const entityMap = this.activeLocks.get(entityKey);
    if (!entityMap) return 0;
    let sum = 0;
    for (const reservation of entityMap.values()) {
      sum += reservation.reservedTokens;
    }
    return sum;
  }

  public tryAcquire(
    entityKey: string,
    arkivReportedAvailableTokens: number,
    requiredTMax: number,
    customTtlMs?: number
  ): { lockId: string; remainingEffectiveTokens: number } | null {
    this.pruneExpired();
    const lockedTokens = this.getLockedTokens(entityKey);
    const effectiveAvailable = arkivReportedAvailableTokens - lockedTokens;

    if (effectiveAvailable < requiredTMax) {
      return null;
    }

    const lockId = `lock_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const now = Date.now();
    const reservation: QuotaReservation = {
      lockId,
      entityKey,
      reservedTokens: requiredTMax,
      acquiredAt: now,
      expiresAt: now + (customTtlMs ?? this.DEFAULT_TTL_MS),
    };

    if (!this.activeLocks.has(entityKey)) {
      this.activeLocks.set(entityKey, new Map());
    }
    this.activeLocks.get(entityKey)!.set(lockId, reservation);

    return {
      lockId,
      remainingEffectiveTokens: effectiveAvailable - requiredTMax,
    };
  }

  public settle(lockId: string): boolean {
    for (const [entityKey, entityMap] of this.activeLocks.entries()) {
      if (entityMap.has(lockId)) {
        entityMap.delete(lockId);
        if (entityMap.size === 0) {
          this.activeLocks.delete(entityKey);
        }
        return true;
      }
    }
    return false;
  }

  public getReservation(lockId: string): QuotaReservation | null {
    for (const entityMap of this.activeLocks.values()) {
      if (entityMap.has(lockId)) {
        return entityMap.get(lockId)!;
      }
    }
    return null;
  }

  public resetAll(): void {
    this.activeLocks.clear();
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [entityKey, entityMap] of this.activeLocks.entries()) {
      for (const [lockId, res] of entityMap.entries()) {
        if (now >= res.expiresAt) {
          entityMap.delete(lockId);
        }
      }
      if (entityMap.size === 0) {
        this.activeLocks.delete(entityKey);
      }
    }
  }
}

const manager = QuotaReservationLockManager.getInstance();

export function getLockedTokens(entityKey: string): number {
  return manager.getLockedTokens(entityKey);
}

export function tryAcquireTokenLock(
  entityKey: string,
  arkivReportedAvailableTokens: number,
  requiredTMax: number,
  customTtlMs?: number
): { lockId: string; remainingEffectiveTokens: number } | null {
  return manager.tryAcquire(entityKey, arkivReportedAvailableTokens, requiredTMax, customTtlMs);
}

export function settleTokenLock(lockId: string): boolean {
  return manager.settle(lockId);
}

export function getQuotaReservation(lockId: string): QuotaReservation | null {
  return manager.getReservation(lockId);
}

export function resetQuotaReservationLocks(): void {
  manager.resetAll();
}
