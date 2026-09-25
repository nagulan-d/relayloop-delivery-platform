import { and, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash, randomInt } from "node:crypto";
import { businesses, deliveryAssignments, deliveryOffers, deliveryProofs, deliveryRequests, deliveryStatusHistory, hourlyShifts, notifications, riders, transactions, users, type InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date(); updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0];
}

export async function getBusinessForUser(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1); return result[0];
}

export async function getRiderForUser(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(riders).where(eq(riders.userId, userId)).limit(1); return result[0];
}

const activeStatuses = ["MATCHING", "ASSIGNED", "ACCEPTED", "RIDER_ARRIVING", "ARRIVED_AT_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "ARRIVED_AT_DROP"];
const numberValue = (value: unknown) => Number(value ?? 0);

export function calculateDeliveryPricing(distanceKm: number, pricingModel: "PER_DROP" | "PER_HOUR", priority: "STANDARD" | "EXPRESS", baseFee = 30, perKmFee = 8, commissionPercent = 15) {
  const charge = pricingModel === "PER_HOUR" ? 1250 : Math.round((baseFee + distanceKm * perKmFee + (priority === "EXPRESS" ? 5 : 0)) * 100) / 100;
  const commission = Math.round(charge * commissionPercent / 100 * 100) / 100;
  return { charge, commission, payout: Math.round((charge - commission) * 100) / 100 };
}

export async function getDashboardOverview(userId: number, role: string) {
  const db = await getDb();
  const empty = { totalDeliveries: 0, activeDeliveries: 0, completedDeliveries: 0, cancelledDeliveries: 0, activeRiders: 0, spend: 0, wallet: 0, averageTime: "—", onlineRiders: 0, businesses: 0, todayRevenue: 0, commission: 0, pendingVerifications: 0 };
  if (!db) return empty;
  const [onlineResult, businessCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(riders).where(eq(riders.availability, "ONLINE")),
    db.select({ count: sql<number>`count(*)` }).from(businesses),
  ]);
  const common = { onlineRiders: numberValue(onlineResult[0]?.count), businesses: numberValue(businessCount[0]?.count) };
  if (role === "business") {
    const business = await getBusinessForUser(userId); if (!business) return { ...empty, ...common };
    const [total, active, completed, cancelled, spend] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(deliveryRequests).where(eq(deliveryRequests.businessId, business.id)),
      db.select({ count: sql<number>`count(*)` }).from(deliveryRequests).where(and(eq(deliveryRequests.businessId, business.id), inArray(deliveryRequests.status, activeStatuses))),
      db.select({ count: sql<number>`count(*)` }).from(deliveryRequests).where(and(eq(deliveryRequests.businessId, business.id), eq(deliveryRequests.status, "DELIVERED"))),
      db.select({ count: sql<number>`count(*)` }).from(deliveryRequests).where(and(eq(deliveryRequests.businessId, business.id), eq(deliveryRequests.status, "CANCELLED"))),
      db.select({ sum: sql<string>`coalesce(sum(${deliveryRequests.businessCharge}), 0)` }).from(deliveryRequests).where(eq(deliveryRequests.businessId, business.id)),
    ]);
    return { ...empty, ...common, totalDeliveries: numberValue(total[0]?.count), activeDeliveries: numberValue(active[0]?.count), completedDeliveries: numberValue(completed[0]?.count), cancelledDeliveries: numberValue(cancelled[0]?.count), spend: numberValue(spend[0]?.sum), wallet: numberValue(business.walletBalance) };
  }
  if (role === "rider") {
    const rider = await getRiderForUser(userId); if (!rider) return { ...empty, ...common };
    const [assigned, active, completed, earnings] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(deliveryAssignments).where(eq(deliveryAssignments.riderId, rider.id)),
      db.select({ count: sql<number>`count(*)` }).from(deliveryAssignments).innerJoin(deliveryRequests, eq(deliveryAssignments.deliveryId, deliveryRequests.id)).where(and(eq(deliveryAssignments.riderId, rider.id), inArray(deliveryRequests.status, activeStatuses))),
      db.select({ count: sql<number>`count(*)` }).from(deliveryAssignments).innerJoin(deliveryRequests, eq(deliveryAssignments.deliveryId, deliveryRequests.id)).where(and(eq(deliveryAssignments.riderId, rider.id), eq(deliveryRequests.status, "DELIVERED"))),
      db.select({ sum: sql<string>`coalesce(sum(${transactions.amount}), 0)` }).from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, "RIDER_EARNING"))),
    ]);
    return { ...empty, ...common, totalDeliveries: numberValue(assigned[0]?.count), activeDeliveries: numberValue(active[0]?.count), completedDeliveries: numberValue(completed[0]?.count), wallet: numberValue(earnings[0]?.sum) };
  }
  const [total, active, completed, revenue, commission, pending] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(deliveryRequests),
    db.select({ count: sql<number>`count(*)` }).from(deliveryRequests).where(inArray(deliveryRequests.status, activeStatuses)),
    db.select({ count: sql<number>`count(*)` }).from(deliveryRequests).where(eq(deliveryRequests.status, "DELIVERED")),
    db.select({ sum: sql<string>`coalesce(sum(${transactions.amount}), 0)` }).from(transactions).where(eq(transactions.type, "BUSINESS_PAYMENT")),
    db.select({ sum: sql<string>`coalesce(sum(${transactions.amount}), 0)` }).from(transactions).where(eq(transactions.type, "PLATFORM_COMMISSION")),
    db.select({ count: sql<number>`count(*)` }).from(riders).where(eq(riders.verificationStatus, "PENDING")),
  ]);
  return { ...empty, ...common, totalDeliveries: numberValue(total[0]?.count), activeDeliveries: numberValue(active[0]?.count), completedDeliveries: numberValue(completed[0]?.count), todayRevenue: numberValue(revenue[0]?.sum), commission: numberValue(commission[0]?.sum), pendingVerifications: numberValue(pending[0]?.count) };
}

export async function listDeliveriesForUser(userId: number, role: string, limit = 20) {
  const db = await getDb(); if (!db) return [];
  if (role === "business") {
    const business = await getBusinessForUser(userId); if (!business) return [];
    return db.select().from(deliveryRequests).where(eq(deliveryRequests.businessId, business.id)).orderBy(desc(deliveryRequests.createdAt)).limit(limit);
  }
  if (role === "rider") {
    const rider = await getRiderForUser(userId); if (!rider) return [];
    const assigned = await db.select({ delivery: deliveryRequests }).from(deliveryAssignments).innerJoin(deliveryRequests, eq(deliveryAssignments.deliveryId, deliveryRequests.id)).where(eq(deliveryAssignments.riderId, rider.id)).orderBy(desc(deliveryRequests.createdAt)).limit(limit);
    const offers = await db.select({ delivery: deliveryRequests }).from(deliveryOffers).innerJoin(deliveryRequests, eq(deliveryOffers.deliveryId, deliveryRequests.id)).where(and(eq(deliveryOffers.riderId, rider.id), eq(deliveryOffers.status, "OFFERED"))).orderBy(desc(deliveryOffers.offeredAt)).limit(limit);
    return [...offers.map(row => row.delivery), ...assigned.map(row => row.delivery)];
  }
  return db.select().from(deliveryRequests).orderBy(desc(deliveryRequests.createdAt)).limit(limit);
}

export async function listLiveRiderLocations() {
  const db = await getDb(); if (!db) return [];
  return db.select({ id: riders.id, name: riders.name, latitude: riders.currentLat, longitude: riders.currentLng, updatedAt: riders.locationUpdatedAt, availability: riders.availability }).from(riders).where(and(eq(riders.availability, "ONLINE"), isNotNull(riders.currentLat), isNotNull(riders.currentLng))).orderBy(desc(riders.locationUpdatedAt));
}

export async function listRecentActivity(userId: number, role: string, limit = 8) {
  const db = await getDb(); if (!db) return [];
  let rows;
  if (role === "business") {
    const business = await getBusinessForUser(userId); if (!business) return [];
    rows = await db.select({ history: deliveryStatusHistory, delivery: deliveryRequests }).from(deliveryStatusHistory).innerJoin(deliveryRequests, eq(deliveryStatusHistory.deliveryId, deliveryRequests.id)).where(eq(deliveryRequests.businessId, business.id)).orderBy(desc(deliveryStatusHistory.createdAt)).limit(limit);
  } else rows = await db.select({ history: deliveryStatusHistory, delivery: deliveryRequests }).from(deliveryStatusHistory).innerJoin(deliveryRequests, eq(deliveryStatusHistory.deliveryId, deliveryRequests.id)).orderBy(desc(deliveryStatusHistory.createdAt)).limit(limit);
  return rows.map(row => ({ id: row.delivery.code, event: `${row.delivery.code} → ${row.history.status.replaceAll("_", " ")}`, meta: row.history.note ?? "Status recorded", tone: row.history.status === "DELIVERED" ? "green" : row.history.status === "MATCHING" ? "purple" : "teal", occurredAt: row.history.createdAt }));
}

export async function createBusinessDelivery(input: { userId: number; pickupLabel: string; dropLabel: string; distanceKm: number; pricingModel: "PER_DROP" | "PER_HOUR"; priority: "STANDARD" | "EXPRESS"; packageNote?: string; }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const business = await getBusinessForUser(input.userId); if (!business) throw new Error("Business profile is not set up");
  if (business.status !== "ACTIVE") throw new Error("Business account is not active");
  const pricing = await db.select().from((await import("../drizzle/schema")).pricingRules).where(eq((await import("../drizzle/schema")).pricingRules.isActive, true)).limit(1);
  const rule = pricing[0];
  const base = numberValue(rule?.baseFee ?? 30); const perKm = numberValue(rule?.perKmFee ?? 8); const commissionPercent = numberValue(rule?.commissionPercent ?? 15);
  const { charge, commission, payout } = calculateDeliveryPricing(input.distanceKm, input.pricingModel, input.priority, base, perKm, commissionPercent);
  const code = `D-${Date.now().toString().slice(-7)}`;
  const inserted = await db.insert(deliveryRequests).values({ businessId: business.id, code, pricingModel: input.pricingModel, status: "MATCHING", pickupLabel: input.pickupLabel, dropLabel: input.dropLabel, distanceKm: input.distanceKm.toFixed(2), packageNote: input.packageNote, priority: input.priority, businessCharge: charge.toFixed(2), riderPayout: payout.toFixed(2), platformCommission: commission.toFixed(2) });
  const deliveryId = Number(inserted[0].insertId);
  await db.insert(deliveryStatusHistory).values({ deliveryId, previousStatus: "CREATED", status: "MATCHING", actorUserId: input.userId, note: "Delivery created; matching started" });
  const eligible = await db.select().from(riders).where(and(eq(riders.verificationStatus, "APPROVED"), eq(riders.availability, "ONLINE"))).limit(10);
  if (eligible.length) {
    const offers = eligible.map((rider, index) => ({ deliveryId, riderId: rider.id, matchScore: (100 - index * 4).toFixed(2), status: "OFFERED" }));
    await db.insert(deliveryOffers).values(offers);
  }
  return { deliveryId, code, charge, payout, commission, businessUserId: input.userId, riderUserIds: eligible.map(rider => rider.userId) };
}

export async function acceptDelivery(userId: number, deliveryId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const rider = await getRiderForUser(userId); if (!rider || rider.verificationStatus !== "APPROVED") throw new Error("Rider is not verified");
  if (rider.availability !== "ONLINE") throw new Error("Go online before accepting deliveries");
  const offer = await db.select().from(deliveryOffers).where(and(eq(deliveryOffers.deliveryId, deliveryId), eq(deliveryOffers.riderId, rider.id), eq(deliveryOffers.status, "OFFERED"))).limit(1);
  if (!offer[0]) throw new Error("This delivery is no longer available");
  const result = await db.update(deliveryRequests).set({ status: "ACCEPTED" }).where(and(eq(deliveryRequests.id, deliveryId), eq(deliveryRequests.status, "MATCHING")));
  if (Number(result[0].affectedRows ?? 0) !== 1) throw new Error("This delivery is no longer available");
  await db.insert(deliveryAssignments).values({ deliveryId, riderId: rider.id, matchScore: offer[0].matchScore, acceptedAt: new Date() });
  await db.update(deliveryOffers).set({ status: "ACCEPTED", respondedAt: new Date() }).where(eq(deliveryOffers.id, offer[0].id));
  await db.update(deliveryOffers).set({ status: "EXPIRED" }).where(and(eq(deliveryOffers.deliveryId, deliveryId), ne(deliveryOffers.riderId, rider.id), eq(deliveryOffers.status, "OFFERED")));
  await db.update(riders).set({ availability: "ON_DELIVERY" }).where(eq(riders.id, rider.id));
  await db.insert(deliveryStatusHistory).values({ deliveryId, previousStatus: "MATCHING", status: "ACCEPTED", actorUserId: userId, note: "Rider claimed delivery atomically" });
  const delivery = await db.select().from(deliveryRequests).where(eq(deliveryRequests.id, deliveryId)).limit(1);
  const business = delivery[0] ? await db.select().from(businesses).where(eq(businesses.id, delivery[0].businessId)).limit(1) : [];
  return { riderId: rider.id, riderUserId: rider.userId, businessUserId: business[0]?.userId, code: delivery[0]?.code };
}

export async function setRiderAvailabilityForUser(userId: number, availability: "OFFLINE" | "ONLINE") {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const rider = await getRiderForUser(userId); if (!rider) throw new Error("Rider profile is not set up");
  if (rider.verificationStatus !== "APPROVED") throw new Error("Only verified riders can go online");
  if (availability === "OFFLINE" && ["ON_DELIVERY", "ON_SHIFT"].includes(rider.availability)) throw new Error("Finish the active assignment before going offline");
  await db.update(riders).set({ availability }).where(eq(riders.id, rider.id));
  return rider.id;
}

export async function updateRiderLocation(userId: number, latitude: number, longitude: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const rider = await getRiderForUser(userId); if (!rider) throw new Error("Rider profile is not set up");
  await db.update(riders).set({ currentLat: latitude.toFixed(7), currentLng: longitude.toFixed(7), locationUpdatedAt: new Date() }).where(eq(riders.id, rider.id));
  return rider.id;
}

export async function transitionDeliveryForUser(userId: number, deliveryId: number, currentStatus: string, nextStatus: string, note?: string) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const rider = await getRiderForUser(userId); if (!rider) throw new Error("Rider profile is not set up");
  const assignment = await db.select({ assignment: deliveryAssignments, delivery: deliveryRequests }).from(deliveryAssignments).innerJoin(deliveryRequests, eq(deliveryAssignments.deliveryId, deliveryRequests.id)).where(and(eq(deliveryAssignments.deliveryId, deliveryId), eq(deliveryAssignments.riderId, rider.id))).limit(1);
  if (!assignment[0] || assignment[0].delivery.status !== currentStatus) throw new Error("Delivery state changed; refresh and try again");
  await db.transaction(async tx => {
    const result = await tx.update(deliveryRequests).set({ status: nextStatus }).where(and(eq(deliveryRequests.id, deliveryId), eq(deliveryRequests.status, currentStatus)));
    if (Number(result[0].affectedRows ?? 0) !== 1) throw new Error("Delivery state changed; refresh and try again");
    await tx.insert(deliveryStatusHistory).values({ deliveryId, previousStatus: currentStatus, status: nextStatus, actorUserId: userId, note });
    if (nextStatus === "DELIVERED") {
      const business = await tx.select().from(businesses).where(eq(businesses.id, assignment[0].delivery.businessId)).limit(1);
      if (!business[0]) throw new Error("Business not found");
      await tx.insert(transactions).values([
        { userId: business[0].userId, type: "BUSINESS_PAYMENT", amount: assignment[0].delivery.businessCharge, referenceId: `delivery:${deliveryId}`, description: `Delivery charge for ${deliveryId}` },
        { userId: rider.userId, type: "RIDER_EARNING", amount: assignment[0].delivery.riderPayout, referenceId: `delivery:${deliveryId}`, description: `Earning for delivery ${deliveryId}` },
        { userId: null, type: "PLATFORM_COMMISSION", amount: assignment[0].delivery.platformCommission, referenceId: `delivery:${deliveryId}`, description: `Commission for delivery ${deliveryId}` },
      ]);
      await tx.update(businesses).set({ walletBalance: sql`${businesses.walletBalance} - ${assignment[0].delivery.businessCharge}` }).where(eq(businesses.id, assignment[0].delivery.businessId));
    }
  });
  if (nextStatus === "DELIVERED" || nextStatus === "CANCELLED") await db.update(riders).set({ availability: "ONLINE" }).where(eq(riders.id, rider.id));
  return { businessId: assignment[0].delivery.businessId, code: assignment[0].delivery.code, riderUserId: rider.userId };
}

export async function createDeliveryOtp(userId: number, deliveryId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const business = await getBusinessForUser(userId); if (!business) throw new Error("Business profile is not set up");
  const delivery = await db.select().from(deliveryRequests).where(and(eq(deliveryRequests.id, deliveryId), eq(deliveryRequests.businessId, business.id))).limit(1);
  if (!delivery[0]) throw new Error("Delivery not found in this business workspace");
  const code = randomInt(1000, 9999).toString();
  await db.insert(deliveryProofs).values({ deliveryId, otpHash: createHash("sha256").update(code).digest("hex") }).onDuplicateKeyUpdate({ set: { otpHash: createHash("sha256").update(code).digest("hex"), verifiedAt: null } });
  return code;
}

export async function verifyDeliveryOtp(userId: number, deliveryId: number, otp: string) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const rider = await getRiderForUser(userId); if (!rider) throw new Error("Rider profile is not set up");
  const proof = await db.select().from(deliveryProofs).where(eq(deliveryProofs.deliveryId, deliveryId)).limit(1);
  if (!proof[0] || proof[0].otpHash !== createHash("sha256").update(otp).digest("hex")) throw new Error("Incorrect delivery OTP");
  await db.update(deliveryProofs).set({ verifiedAt: new Date() }).where(eq(deliveryProofs.id, proof[0].id));
  return transitionDeliveryForUser(userId, deliveryId, "ARRIVED_AT_DROP", "DELIVERED", "OTP verified");
}

export async function listNotifications(userId: number, limit = 20) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function createNotification(userId: number, type: string, title: string, body: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(notifications).values({ userId, type, title, body }); return Number(result[0].insertId);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb(); if (!db) return false;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))); return true;
}

export async function listTransactionsForUser(userId: number, role: string, limit = 20) {
  const db = await getDb(); if (!db) return [];
  if (role === "admin") return db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(limit);
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt)).limit(limit);
}

export async function chooseRoleForUser(userId: number, input: { role: "business" | "rider"; name: string; category?: string; city?: string; vehicleType?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing[0]) throw new Error("User not found");
  if (existing[0].role === "admin") throw new Error("Admin accounts cannot be converted");
  await db.update(users).set({ role: input.role, name: input.name }).where(eq(users.id, userId));
  if (input.role === "business") {
    await db.insert(businesses).values({ userId, name: input.name, category: input.category ?? "Local business", city: input.city ?? "", status: "ACTIVE" }).onDuplicateKeyUpdate({ set: { name: input.name, category: input.category ?? "Local business", city: input.city ?? "", status: "ACTIVE" } });
  } else {
    await db.insert(riders).values({ userId, name: input.name, vehicleType: input.vehicleType ?? "Bike", verificationStatus: "APPROVED", availability: "OFFLINE" }).onDuplicateKeyUpdate({ set: { name: input.name, vehicleType: input.vehicleType ?? "Bike" } });
  }
  return { role: input.role };
}
