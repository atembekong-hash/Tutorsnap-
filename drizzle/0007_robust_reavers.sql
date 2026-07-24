CREATE TABLE `aire_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`difficulty` int NOT NULL,
	`subject` varchar(64) NOT NULL DEFAULT 'other',
	`steps` int NOT NULL DEFAULT 1,
	`rating` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aire_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `aire_feedback` ADD CONSTRAINT `aire_feedback_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `aire_feedback_userId_idx` ON `aire_feedback` (`userId`);