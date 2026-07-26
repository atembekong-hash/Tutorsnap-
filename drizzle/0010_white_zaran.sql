CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`revenueCatUserId` varchar(255) NOT NULL,
	`productId` varchar(255) NOT NULL,
	`status` enum('active','cancelled','expired','refunded') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_subscriptions_userId` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_rcUserId` ON `subscriptions` (`revenueCatUserId`);