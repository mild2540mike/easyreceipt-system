BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[branch_inventory] ADD [lastStockCheckItemId] NVARCHAR(64);

-- CreateTable
CREATE TABLE [dbo].[stock_checks] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [createdByMemberId] NVARCHAR(64) NOT NULL,
    [createdByName] NVARCHAR(160) NOT NULL,
    [requestId] NVARCHAR(64) NOT NULL,
    [requestHash] NVARCHAR(64) NOT NULL,
    [startedAt] DATETIME2 NOT NULL,
    [savedAt] DATETIME2 NOT NULL CONSTRAINT [stock_checks_savedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [stock_checks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [stock_checks_branchId_requestId_key] UNIQUE NONCLUSTERED ([branchId],[requestId])
);

-- CreateTable
CREATE TABLE [dbo].[stock_check_items] (
    [id] NVARCHAR(64) NOT NULL,
    [stockCheckId] NVARCHAR(64) NOT NULL,
    [ingredientId] NVARCHAR(64) NOT NULL,
    [name] NVARCHAR(160) NOT NULL,
    [unit] NVARCHAR(32) NOT NULL,
    [systemQuantity] DECIMAL(18,3) NOT NULL,
    [actualQuantity] DECIMAL(18,3) NOT NULL,
    [difference] DECIMAL(18,3) NOT NULL,
    [countedAt] DATETIME2 NOT NULL,
    CONSTRAINT [stock_check_items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [stock_check_items_stockCheckId_ingredientId_key] UNIQUE NONCLUSTERED ([stockCheckId],[ingredientId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_checks_branchId_savedAt_idx] ON [dbo].[stock_checks]([branchId], [savedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_checks_createdByMemberId_idx] ON [dbo].[stock_checks]([createdByMemberId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_check_items_ingredientId_idx] ON [dbo].[stock_check_items]([ingredientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [branch_inventory_lastStockCheckItemId_idx] ON [dbo].[branch_inventory]([lastStockCheckItemId]);

-- AddForeignKey
ALTER TABLE [dbo].[branch_inventory] ADD CONSTRAINT [branch_inventory_lastStockCheckItemId_fkey] FOREIGN KEY ([lastStockCheckItemId]) REFERENCES [dbo].[stock_check_items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_checks] ADD CONSTRAINT [stock_checks_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_checks] ADD CONSTRAINT [stock_checks_createdByMemberId_fkey] FOREIGN KEY ([createdByMemberId]) REFERENCES [dbo].[members]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_check_items] ADD CONSTRAINT [stock_check_items_stockCheckId_fkey] FOREIGN KEY ([stockCheckId]) REFERENCES [dbo].[stock_checks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_check_items] ADD CONSTRAINT [stock_check_items_ingredientId_fkey] FOREIGN KEY ([ingredientId]) REFERENCES [dbo].[ingredients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

