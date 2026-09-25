import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, businessProcedure, protectedProcedure, publicProcedure, riderProcedure, router } from "./_core/trpc";
import { createBusinessDelivery, createDeliveryOtp, createNotification, getBusinessForUser, getDashboardOverview, getRiderForUser, listDeliveriesForUser, listLiveRiderLocations, listNotifications, listRecentActivity, listTransactionsForUser, markNotificationRead, acceptDelivery, setRiderAvailabilityForUser, transitionDeliveryForUser, updateRiderLocation, verifyDeliveryOtp, chooseRoleForUser } from "./db";
import { publishRealtime } from "./realtime";

const deliveryStatuses = ["CREATED", "MATCHING", "ASSIGNED", "ACCEPTED", "RIDER_ARRIVING", "ARRIVED_AT_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "ARRIVED_AT_DROP", "DELIVERED", "CANCELLED", "FAILED", "EXPIRED", "DISPUTED"] as const;
const allowedTransitions: Record<string, string[]> = {
  CREATED: ["MATCHING", "CANCELLED"], MATCHING: ["ASSIGNED", "EXPIRED", "CANCELLED"], ASSIGNED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["RIDER_ARRIVING", "CANCELLED"], RIDER_ARRIVING: ["ARRIVED_AT_PICKUP", "CANCELLED"], ARRIVED_AT_PICKUP: ["PICKED_UP", "CANCELLED"], PICKED_UP: ["OUT_FOR_DELIVERY"], OUT_FOR_DELIVERY: ["ARRIVED_AT_DROP", "FAILED"], ARRIVED_AT_DROP: ["DELIVERED", "FAILED"], DELIVERED: [], CANCELLED: [], FAILED: [], EXPIRED: [], DISPUTED: ["OUT_FOR_DELIVERY", "CANCELLED"],
};
export const isAllowedTransition = (currentStatus: string, nextStatus: string) => Boolean(allowedTransitions[currentStatus]?.includes(nextStatus));

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  account: router({
    chooseRole: protectedProcedure.input(z.object({ role: z.enum(["business", "rider"]), name: z.string().min(2), category: z.string().optional(), city: z.string().optional(), vehicleType: z.string().optional() })).mutation(({ ctx, input }) => chooseRoleForUser(ctx.user.id, input)),
  }),
  dashboard: router({
    overview: protectedProcedure.query(({ ctx }) => getDashboardOverview(ctx.user.id, ctx.user.role)),
    activity: protectedProcedure.query(({ ctx }) => listRecentActivity(ctx.user.id, ctx.user.role)),
  }),
  deliveries: router({
    list: protectedProcedure.input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional()).query(({ ctx, input }) => listDeliveriesForUser(ctx.user.id, ctx.user.role, input?.limit ?? 20)),
    create: businessProcedure.input(z.object({ pickupLabel: z.string().min(3), dropLabel: z.string().min(3), distanceKm: z.number().positive(), pricingModel: z.enum(["PER_DROP", "PER_HOUR"]), priority: z.enum(["STANDARD", "EXPRESS"]), packageNote: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const result = await createBusinessDelivery({ userId: ctx.user.id, ...input });
      publishRealtime({ type: "DELIVERY_CREATED", occurredAt: Date.now(), actorUserId: ctx.user.id, audienceUserIds: [result.businessUserId, ...result.riderUserIds], deliveryId: result.deliveryId, payload: { code: result.code } });
      publishRealtime({ type: "DELIVERY_MATCHING", occurredAt: Date.now(), actorUserId: ctx.user.id, audienceUserIds: [result.businessUserId, ...result.riderUserIds], deliveryId: result.deliveryId, payload: { code: result.code } });
      return result;
    }),
    accept: riderProcedure.input(z.object({ deliveryId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await acceptDelivery(ctx.user.id, input.deliveryId);
      if (result.businessUserId) {
        const notificationId = await createNotification(result.businessUserId, "DELIVERY_ACCEPTED", "Rider accepted your delivery", `${ctx.user.name ?? "A rider"} accepted ${result.code ?? "the delivery"}.`);
        publishRealtime({ type: "NOTIFICATION_CREATED", occurredAt: Date.now(), actorUserId: ctx.user.id, audienceUserIds: [result.businessUserId], payload: { notificationId } });
      }
      publishRealtime({ type: "RIDER_ASSIGNED", occurredAt: Date.now(), actorUserId: ctx.user.id, audienceUserIds: [result.businessUserId ?? 0, ctx.user.id], deliveryId: input.deliveryId, riderId: result.riderId, payload: { code: result.code } });
      return result;
    }),
    transition: riderProcedure.input(z.object({ deliveryId: z.number().int().positive(), currentStatus: z.enum(deliveryStatuses), nextStatus: z.enum(deliveryStatuses), note: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      if (!isAllowedTransition(input.currentStatus, input.nextStatus)) throw new Error(`Invalid delivery transition: ${input.currentStatus} → ${input.nextStatus}`);
      const result = await transitionDeliveryForUser(ctx.user.id, input.deliveryId, input.currentStatus, input.nextStatus, input.note);
      const business = await getBusinessForUser(result.businessId);
      if (business) {
        const notificationId = await createNotification(business.userId, "DELIVERY_STATUS_UPDATED", `Delivery ${input.nextStatus.replaceAll("_", " ")}`, `${result.code} is now ${input.nextStatus.replaceAll("_", " ")}.`);
        publishRealtime({ type: "NOTIFICATION_CREATED", occurredAt: Date.now(), actorUserId: ctx.user.id, audienceUserIds: [business.userId], payload: { notificationId } });
      }
      publishRealtime({ type: input.nextStatus === "DELIVERED" ? "DELIVERY_COMPLETED" : "DELIVERY_STATUS_UPDATED", occurredAt: Date.now(), actorUserId: ctx.user.id, audienceUserIds: [business?.userId ?? 0, ctx.user.id], deliveryId: input.deliveryId, payload: { status: input.nextStatus, code: result.code } });
      return result;
    }),
    requestOtp: businessProcedure.input(z.object({ deliveryId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const otp = await createDeliveryOtp(ctx.user.id, input.deliveryId); return { otp }; }),
    verifyOtp: riderProcedure.input(z.object({ deliveryId: z.number().int().positive(), otp: z.string().regex(/^\d{4}$/) })).mutation(async ({ ctx, input }) => {
      const result = await verifyDeliveryOtp(ctx.user.id, input.deliveryId, input.otp);
      publishRealtime({ type: "DELIVERY_COMPLETED", occurredAt: Date.now(), actorUserId: ctx.user.id, audienceUserIds: [ctx.user.id], deliveryId: input.deliveryId, payload: { code: result.code } });
      return result;
    }),
  }),
  riders: router({
    me: riderProcedure.query(({ ctx }) => getRiderForUser(ctx.user.id)),
    locations: protectedProcedure.query(() => listLiveRiderLocations()),
    setAvailability: riderProcedure.input(z.object({ availability: z.enum(["OFFLINE", "ONLINE"]) })).mutation(async ({ ctx, input }) => { const riderId = await setRiderAvailabilityForUser(ctx.user.id, input.availability); publishRealtime({ type: input.availability === "ONLINE" ? "RIDER_ONLINE" : "RIDER_OFFLINE", occurredAt: Date.now(), actorUserId: ctx.user.id, riderId, payload: { availability: input.availability } }); return { riderId, availability: input.availability }; }),
    updateLocation: riderProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).mutation(async ({ ctx, input }) => { const riderId = await updateRiderLocation(ctx.user.id, input.latitude, input.longitude); publishRealtime({ type: "RIDER_LOCATION_UPDATED", occurredAt: Date.now(), actorUserId: ctx.user.id, riderId, payload: { latitude: input.latitude, longitude: input.longitude } }); return { riderId }; }),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(ctx.user.id, input.notificationId)),
  }),
  ledger: router({ list: protectedProcedure.input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional()).query(({ ctx, input }) => listTransactionsForUser(ctx.user.id, ctx.user.role, input?.limit ?? 20)) }),
  admin: router({
    overview: adminProcedure.query(({ ctx }) => getDashboardOverview(ctx.user.id, "admin")),
    platformSnapshot: adminProcedure.query(({ ctx }) => getDashboardOverview(ctx.user.id, "admin")),
  }),
});

export type AppRouter = typeof appRouter;
