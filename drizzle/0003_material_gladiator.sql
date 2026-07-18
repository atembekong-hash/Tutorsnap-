CREATE TABLE `fraud_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`alertType` varchar(50) NOT NULL,
	`ipAddress` varchar(45),
	`deviceId` varchar(255),
	`severity` varchar(20) NOT NULL DEFAULT 'medium',
	`description` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`actionTaken` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fraud_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `redemption_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`codeId` int,
	`code` varchar(50) NOT NULL,
	`ipAddress` varchar(45),
	`deviceId` varchar(255),
	`userAgent` text,
	`success` boolean NOT NULL DEFAULT true,
	`failureReason` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `redemption_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fraud_alerts` ADD CONSTRAINT `fraud_alerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redemption_history` ADD CONSTRAINT `redemption_history_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;