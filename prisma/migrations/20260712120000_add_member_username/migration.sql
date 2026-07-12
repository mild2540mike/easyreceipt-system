ALTER TABLE [dbo].[members]
ADD [username] NVARCHAR(80);

EXEC(N'
UPDATE [dbo].[members]
SET [username] = LOWER(LEFT([email], CHARINDEX(''@'', [email] + ''@'') - 1))
WHERE [username] IS NULL;
');

EXEC(N'
ALTER TABLE [dbo].[members]
ALTER COLUMN [username] NVARCHAR(80) NOT NULL;
');

ALTER TABLE [dbo].[members]
ADD CONSTRAINT [members_organizationId_username_key] UNIQUE NONCLUSTERED ([organizationId], [username]);
