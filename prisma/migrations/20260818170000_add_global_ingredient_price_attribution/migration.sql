BEGIN TRY

BEGIN TRAN;

-- Additive metadata for the organization-wide latest ingredient price.
ALTER TABLE [dbo].[ingredients] ADD
    [lastPriceUpdatedByMemberId] NVARCHAR(64),
    [lastPriceUpdatedBranchId] NVARCHAR(64),
    [lastPriceUpdatedAt] DATETIME2,
    [lastPriceSource] NVARCHAR(32);

CREATE NONCLUSTERED INDEX [ingredients_lastPriceUpdatedByMemberId_idx]
ON [dbo].[ingredients]([lastPriceUpdatedByMemberId]);

CREATE NONCLUSTERED INDEX [ingredients_lastPriceUpdatedBranchId_idx]
ON [dbo].[ingredients]([lastPriceUpdatedBranchId]);

CREATE NONCLUSTERED INDEX [ingredients_lastPriceUpdatedAt_idx]
ON [dbo].[ingredients]([lastPriceUpdatedAt]);

ALTER TABLE [dbo].[ingredients]
ADD CONSTRAINT [ingredients_lastPriceUpdatedByMemberId_fkey]
FOREIGN KEY ([lastPriceUpdatedByMemberId]) REFERENCES [dbo].[members]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ingredients]
ADD CONSTRAINT [ingredients_lastPriceUpdatedBranchId_fkey]
FOREIGN KEY ([lastPriceUpdatedBranchId]) REFERENCES [dbo].[branches]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
