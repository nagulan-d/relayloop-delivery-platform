import { describe, expect, it } from "vitest";
import { appRouter, isAllowedTransition } from "./routers";
import { calculateDeliveryPricing } from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: AuthenticatedUser["role"] = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "relayloop-test-user",
    email: "ops@relayloop.test",
    name: "Relayloop Test User",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("delivery operations", () => {
  it("rejects anonymous dashboard access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.dashboard.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("enforces business and rider roles at the procedure boundary", async () => {
    const userCaller = appRouter.createCaller(createContext("user"));
    await expect(userCaller.deliveries.create({ pickupLabel: "Aster Market", dropLabel: "Gandhipuram", distanceKm: 4.2, pricingModel: "PER_DROP", priority: "EXPRESS" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.riders.setAvailability({ availability: "ONLINE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("calculates server-owned per-drop pricing", () => {
    expect(calculateDeliveryPricing(4.2, "PER_DROP", "EXPRESS")).toEqual({ charge: 68.6, payout: 58.31, commission: 10.29 });
    expect(calculateDeliveryPricing(4.2, "PER_HOUR", "STANDARD")).toEqual({ charge: 1250, payout: 1062.5, commission: 187.5 });
  });

  it("allows only valid state transitions", () => {
    expect(isAllowedTransition("MATCHING", "ACCEPTED")).toBe(false);
    expect(isAllowedTransition("MATCHING", "ASSIGNED")).toBe(true);
    expect(isAllowedTransition("ARRIVED_AT_DROP", "DELIVERED")).toBe(true);
    expect(isAllowedTransition("DELIVERED", "PICKED_UP")).toBe(false);
  });
});
