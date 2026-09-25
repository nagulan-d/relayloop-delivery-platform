CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`category` varchar(80) NOT NULL,
	`status` enum('PENDING','ACTIVE','SUSPENDED') NOT NULL DEFAULT 'PENDING',
	`city` varchar(80) NOT NULL,
	`walletBalance` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveryAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryId` int NOT NULL,
	`riderId` int NOT NULL,
	`matchScore` decimal(6,2) NOT NULL DEFAULT '0',
	`acceptedAt` timestamp,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveryRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`pricingModel` enum('PER_DROP','PER_HOUR') NOT NULL DEFAULT 'PER_DROP',
	`status` varchar(32) NOT NULL DEFAULT 'CREATED',
	`pickupLabel` varchar(200) NOT NULL,
	`dropLabel` varchar(200) NOT NULL,
	`distanceKm` decimal(7,2) NOT NULL DEFAULT '0',
	`packageNote` text,
	`priority` varchar(20) NOT NULL DEFAULT 'STANDARD',
	`businessCharge` decimal(12,2) NOT NULL,
	`riderPayout` decimal(12,2) NOT NULL,
	`platformCommission` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveryRequests_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `deliveryStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryId` int NOT NULL,
	`status` varchar(32) NOT NULL,
	`actorUserId` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hourlyShifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`shiftDate` varchar(20) NOT NULL,
	`startAt` varchar(10) NOT NULL,
	`endAt` varchar(10) NOT NULL,
	`ridersRequired` int NOT NULL DEFAULT 1,
	`hourlyRate` decimal(12,2) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'REQUESTED',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hourlyShifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(40) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricingRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`baseFee` decimal(12,2) NOT NULL DEFAULT '30',
	`perKmFee` decimal(12,2) NOT NULL DEFAULT '8',
	`priorityFee` decimal(12,2) NOT NULL DEFAULT '0',
	`commissionPercent` decimal(5,2) NOT NULL DEFAULT '15',
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `pricingRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryId` int NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`stars` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(30),
	`verificationStatus` enum('PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
	`availability` enum('OFFLINE','ONLINE','BUSY','ON_DELIVERY','ON_SHIFT','SUSPENDED') NOT NULL DEFAULT 'OFFLINE',
	`vehicleType` varchar(40) NOT NULL DEFAULT 'Bike',
	`rating` decimal(3,2) NOT NULL DEFAULT '5.00',
	`reliabilityScore` int NOT NULL DEFAULT 80,
	`currentLat` decimal(10,7),
	`currentLng` decimal(10,7),
	`serviceRadiusKm` int NOT NULL DEFAULT 8,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `riders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`category` varchar(40) NOT NULL,
	`subject` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'OPEN',
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportTickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` varchar(32) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'INR',
	`referenceId` varchar(64),
	`status` varchar(20) NOT NULL DEFAULT 'POSTED',
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
