CREATE TABLE `aire_subject_calibration` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`subject` varchar(64) NOT NULL DEFAULT 'other',
	`multiplier` varchar(8) NOT NULL DEFAULT '1.0',
	`sampleCount` int NOT NULL DEFAULT 0,
	`lastFeedbackAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aire_subject_calibration_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`title` varchar(255),
	`subject` varchar(64),
	`gradeLevel` varchar(32),
	`messagesJson` text NOT NULL,
	`tags` text,
	`pinned` boolean NOT NULL DEFAULT false,
	`messageCount` int NOT NULL DEFAULT 0,
	`sessionCreatedAt` timestamp NOT NULL,
	`sessionUpdatedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `solve_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`problem` text NOT NULL,
	`answer` text,
	`subject` varchar(64),
	`solutionJson` text,
	`bookmarked` boolean NOT NULL DEFAULT false,
	`solvedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `solve_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookmarkId` varchar(64) NOT NULL,
	`itemJson` text NOT NULL,
	`subject` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_bookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noteId` varchar(64) NOT NULL,
	`noteJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`progressJson` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_progress_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `aire_feedback` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `aire_subject_calibration` ADD CONSTRAINT `aire_subject_calibration_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solve_history` ADD CONSTRAINT `solve_history_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_bookmarks` ADD CONSTRAINT `user_bookmarks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notes` ADD CONSTRAINT `user_notes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `aire_calib_userId_subject_idx` ON `aire_subject_calibration` (`userId`,`subject`);--> statement-breakpoint
CREATE INDEX `chat_sessions_userId_idx` ON `chat_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `chat_sessions_sessionId_idx` ON `chat_sessions` (`userId`,`sessionId`);--> statement-breakpoint
CREATE INDEX `solve_history_userId_idx` ON `solve_history` (`userId`,`solvedAt`);--> statement-breakpoint
CREATE INDEX `user_bookmarks_userId_idx` ON `user_bookmarks` (`userId`);--> statement-breakpoint
CREATE INDEX `user_bookmarks_bookmarkId_idx` ON `user_bookmarks` (`userId`,`bookmarkId`);--> statement-breakpoint
CREATE INDEX `user_notes_userId_idx` ON `user_notes` (`userId`);--> statement-breakpoint
CREATE INDEX `user_notes_noteId_idx` ON `user_notes` (`userId`,`noteId`);