CREATE TABLE `assignment_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`assignmentId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`body` text NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedByUserId` int,
	`moderationReason` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignment_comments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assignment_comments_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `assignment_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`assignmentId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','complete') NOT NULL DEFAULT 'pending',
	`responseText` text,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignment_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assignment_submissions_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `assignment_submissions_assignment_user_uq` UNIQUE(`assignmentId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`classroomId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`instructions` text NOT NULL,
	`subject` varchar(64) NOT NULL,
	`dueAt` timestamp,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assignments_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `classroom_join_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ipAddress` varchar(45),
	`codeHash` varchar(64) NOT NULL,
	`outcome` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classroom_join_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classroom_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classroomId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('teacher','learner') NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classroom_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `classroom_members_class_user_uq` UNIQUE(`classroomId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `classrooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`teacherId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`joinCode` varchar(8) NOT NULL,
	`subject` varchar(64) NOT NULL,
	`gradeLevel` varchar(32),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classrooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `classrooms_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `classrooms_joinCode_unique` UNIQUE(`joinCode`)
);
--> statement-breakpoint
ALTER TABLE `assignment_comments` ADD CONSTRAINT `assignment_comments_assignmentId_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_comments` ADD CONSTRAINT `assignment_comments_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_comments` ADD CONSTRAINT `assignment_comments_deletedByUserId_users_id_fk` FOREIGN KEY (`deletedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_assignmentId_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_classroomId_classrooms_id_fk` FOREIGN KEY (`classroomId`) REFERENCES `classrooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classroom_join_attempts` ADD CONSTRAINT `classroom_join_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classroom_members` ADD CONSTRAINT `classroom_members_classroomId_classrooms_id_fk` FOREIGN KEY (`classroomId`) REFERENCES `classrooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classroom_members` ADD CONSTRAINT `classroom_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classrooms` ADD CONSTRAINT `classrooms_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assignment_comments_assignment_created_idx` ON `assignment_comments` (`assignmentId`,`createdAt`,`id`);--> statement-breakpoint
CREATE INDEX `assignment_comments_author_created_idx` ON `assignment_comments` (`authorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `assignment_submissions_status_idx` ON `assignment_submissions` (`assignmentId`,`status`);--> statement-breakpoint
CREATE INDEX `assignment_submissions_user_updated_idx` ON `assignment_submissions` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `assignments_class_status_due_idx` ON `assignments` (`classroomId`,`status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `assignments_class_updated_idx` ON `assignments` (`classroomId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `classroom_join_user_created_idx` ON `classroom_join_attempts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `classroom_join_ip_created_idx` ON `classroom_join_attempts` (`ipAddress`,`createdAt`);--> statement-breakpoint
CREATE INDEX `classroom_join_hash_created_idx` ON `classroom_join_attempts` (`codeHash`,`createdAt`);--> statement-breakpoint
CREATE INDEX `classroom_members_user_joined_idx` ON `classroom_members` (`userId`,`joinedAt`);--> statement-breakpoint
CREATE INDEX `classroom_members_class_role_idx` ON `classroom_members` (`classroomId`,`role`);--> statement-breakpoint
CREATE INDEX `classrooms_teacher_idx` ON `classrooms` (`teacherId`);--> statement-breakpoint
CREATE INDEX `classrooms_active_updated_idx` ON `classrooms` (`isActive`,`updatedAt`);