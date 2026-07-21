CREATE TABLE `otp_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`purpose` varchar(20) NOT NULL DEFAULT 'signin',
	`ipAddress` varchar(45),
	`outcome` varchar(30) NOT NULL DEFAULT 'sent',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduler_locks` (
	`jobName` varchar(100) NOT NULL,
	`instanceId` varchar(200) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduler_locks_jobName` PRIMARY KEY(`jobName`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_email_created` ON `otp_audit` (`email`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_audit_ip_created` ON `otp_audit` (`ipAddress`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_otp_email_purpose` ON `otp_codes` (`email`,`purpose`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_otp_expires` ON `otp_codes` (`expiresAt`);