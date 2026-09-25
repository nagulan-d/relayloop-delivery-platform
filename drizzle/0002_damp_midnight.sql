CREATE TABLE `deliveryOffers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryId` int NOT NULL,
	`riderId` int NOT NULL,
	`matchScore` decimal(6,2) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'OFFERED',
	`offeredAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	CONSTRAINT `deliveryOffers_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_offer_delivery_rider_unique` UNIQUE(`deliveryId`,`riderId`)
);
--> statement-breakpoint
CREATE TABLE `deliveryProofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryId` int NOT NULL,
	`otpHash` varchar(128) NOT NULL,
	`verifiedAt` timestamp,
	`photoUrl` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	CONSTRAINT `deliveryProofs_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveryProofs_deliveryId_unique` UNIQUE(`deliveryId`)
);
--> statement-breakpoint
CREATE TABLE `shiftAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`riderId` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'OFFERED',
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shiftAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `shift_assignment_shift_rider_unique` UNIQUE(`shiftId`,`riderId`)
);
--> statement-breakpoint
ALTER TABLE `businesses` MODIFY COLUMN `status` enum('PENDING','ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','business','rider','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `businesses` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `businesses` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `deliveryRequests` ADD `pickupLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `deliveryRequests` ADD `pickupLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `deliveryRequests` ADD `dropLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `deliveryRequests` ADD `dropLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `deliveryStatusHistory` ADD `previousStatus` varchar(32);--> statement-breakpoint
ALTER TABLE `deliveryStatusHistory` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `deliveryStatusHistory` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `deliveryStatusHistory` ADD `metadata` text;--> statement-breakpoint
ALTER TABLE `hourlyShifts` ADD `locationLabel` varchar(200);--> statement-breakpoint
ALTER TABLE `hourlyShifts` ADD `requirements` text;--> statement-breakpoint
ALTER TABLE `riders` ADD `locationUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `businesses` ADD CONSTRAINT `businesses_userId_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `deliveryAssignments` ADD CONSTRAINT `deliveryAssignments_deliveryId_unique` UNIQUE(`deliveryId`);--> statement-breakpoint
ALTER TABLE `riders` ADD CONSTRAINT `riders_userId_unique` UNIQUE(`userId`);--> statement-breakpoint
CREATE INDEX `delivery_offer_rider_status_idx` ON `deliveryOffers` (`riderId`,`status`);--> statement-breakpoint
CREATE INDEX `delivery_business_status_idx` ON `deliveryRequests` (`businessId`,`status`);