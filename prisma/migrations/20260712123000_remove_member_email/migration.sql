ALTER TABLE [dbo].[members]
DROP CONSTRAINT [members_organizationId_email_key];

ALTER TABLE [dbo].[members]
DROP COLUMN [email];
