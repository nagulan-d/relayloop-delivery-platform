import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "business", "rider", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "ACTIVE", "SUSPENDED"]).default("ACTIVE").notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  walletBalance: decimal("walletBalance", { precision: 12, scale: 2 }).default("0").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const riders = mysqlTable("riders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  verificationStatus: mysqlEnum("verificationStatus", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).default("PENDING").notNull(),
  availability: mysqlEnum("availability", ["OFFLINE", "ONLINE", "BUSY", "ON_DELIVERY", "ON_SHIFT", "SUSPENDED"]).default("OFFLINE").notNull(),
  vehicleType: varchar("vehicleType", { length: 40 }).default("Bike").notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00").notNull(),
  reliabilityScore: int("reliabilityScore").default(80).notNull(),
  currentLat: decimal("currentLat", { precision: 10, scale: 7 }),
  currentLng: decimal("currentLng", { precision: 10, scale: 7 }),
  locationUpdatedAt: timestamp("locationUpdatedAt"),
  serviceRadiusKm: int("serviceRadiusKm").default(8).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deliveryRequests = mysqlTable("deliveryRequests", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  pricingModel: mysqlEnum("pricingModel", ["PER_DROP", "PER_HOUR"]).default("PER_DROP").notNull(),
  status: varchar("status", { length: 32 }).default("CREATED").notNull(),
  pickupLabel: varchar("pickupLabel", { length: 200 }).notNull(),
  dropLabel: varchar("dropLabel", { length: 200 }).notNull(),
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  dropLat: decimal("dropLat", { precision: 10, scale: 7 }),
  dropLng: decimal("dropLng", { precision: 10, scale: 7 }),
  distanceKm: decimal("distanceKm", { precision: 7, scale: 2 }).default("0").notNull(),
  packageNote: text("packageNote"),
  priority: varchar("priority", { length: 20 }).default("STANDARD").notNull(),
  businessCharge: decimal("businessCharge", { precision: 12, scale: 2 }).notNull(),
  riderPayout: decimal("riderPayout", { precision: 12, scale: 2 }).notNull(),
  platformCommission: decimal("platformCommission", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ businessStatusIdx: index("delivery_business_status_idx").on(table.businessId, table.status) }));

export const deliveryOffers = mysqlTable("deliveryOffers", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull(),
  riderId: int("riderId").notNull(),
  matchScore: decimal("matchScore", { precision: 6, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("OFFERED").notNull(),
  offeredAt: timestamp("offeredAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
}, table => ({ deliveryRiderUnique: uniqueIndex("delivery_offer_delivery_rider_unique").on(table.deliveryId, table.riderId), riderStatusIdx: index("delivery_offer_rider_status_idx").on(table.riderId, table.status) }));

export const deliveryAssignments = mysqlTable("deliveryAssignments", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull().unique(),
  riderId: int("riderId").notNull(),
  matchScore: decimal("matchScore", { precision: 6, scale: 2 }).default("0").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export const deliveryStatusHistory = mysqlTable("deliveryStatusHistory", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull(),
  previousStatus: varchar("previousStatus", { length: 32 }),
  status: varchar("status", { length: 32 }).notNull(),
  actorUserId: int("actorUserId"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  metadata: text("metadata"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deliveryProofs = mysqlTable("deliveryProofs", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull().unique(),
  otpHash: varchar("otpHash", { length: 128 }).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  photoUrl: text("photoUrl"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
});

export const hourlyShifts = mysqlTable("hourlyShifts", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  shiftDate: varchar("shiftDate", { length: 20 }).notNull(),
  startAt: varchar("startAt", { length: 10 }).notNull(),
  endAt: varchar("endAt", { length: 10 }).notNull(),
  ridersRequired: int("ridersRequired").default(1).notNull(),
  hourlyRate: decimal("hourlyRate", { precision: 12, scale: 2 }).notNull(),
  locationLabel: varchar("locationLabel", { length: 200 }),
  requirements: text("requirements"),
  status: varchar("status", { length: 24 }).default("REQUESTED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const shiftAssignments = mysqlTable("shiftAssignments", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  riderId: int("riderId").notNull(),
  status: varchar("status", { length: 20 }).default("OFFERED").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ shiftRiderUnique: uniqueIndex("shift_assignment_shift_rider_unique").on(table.shiftId, table.riderId) }));

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: varchar("type", { length: 32 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("INR").notNull(),
  referenceId: varchar("referenceId", { length: 64 }),
  status: varchar("status", { length: 20 }).default("POSTED").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ratings = mysqlTable("ratings", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull(),
  fromUserId: int("fromUserId").notNull(),
  toUserId: int("toUserId").notNull(),
  stars: int("stars").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const supportTickets = mysqlTable("supportTickets", {
  id: int("id").autoincrement().primaryKey(),
  createdByUserId: int("createdByUserId").notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).default("OPEN").notNull(),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pricingRules = mysqlTable("pricingRules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  baseFee: decimal("baseFee", { precision: 12, scale: 2 }).default("30").notNull(),
  perKmFee: decimal("perKmFee", { precision: 12, scale: 2 }).default("8").notNull(),
  priorityFee: decimal("priorityFee", { precision: 12, scale: 2 }).default("0").notNull(),
  commissionPercent: decimal("commissionPercent", { precision: 5, scale: 2 }).default("15").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DeliveryRequest = typeof deliveryRequests.$inferSelect;
export type Rider = typeof riders.$inferSelect;
