CREATE TABLE [dbo].[usage_reasons] (
    [id] NVARCHAR(64) NOT NULL,
    [organizationId] NVARCHAR(64) NOT NULL,
    [label] NVARCHAR(180) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [usage_reasons_isActive_df] DEFAULT 1,
    [createdByMemberId] NVARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [usage_reasons_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [usage_reasons_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [usage_reasons_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [usage_reasons_organizationId_label_key] UNIQUE NONCLUSTERED ([organizationId], [label])
);

CREATE INDEX [usage_reasons_organizationId_isActive_label_idx]
ON [dbo].[usage_reasons]([organizationId], [isActive], [label]);

CREATE INDEX [usage_reasons_createdByMemberId_idx]
ON [dbo].[usage_reasons]([createdByMemberId]);

ALTER TABLE [dbo].[usage_reasons]
ADD CONSTRAINT [usage_reasons_organizationId_fkey]
FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[usage_reasons]
ADD CONSTRAINT [usage_reasons_createdByMemberId_fkey]
FOREIGN KEY ([createdByMemberId]) REFERENCES [dbo].[members]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;
