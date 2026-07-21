ALTER TABLE `otp_codes` ADD `purpose` varchar(20) DEFAULT 'signin' NOT NULL;--> statement-breakpoint
ALTER TABLE `otp_codes` ADD `ipAddress` varchar(45);