BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[organizations] (
    [id] NVARCHAR(64) NOT NULL,
    [code] NVARCHAR(32) NOT NULL,
    [name] NVARCHAR(160) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [organizations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [organizations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [organizations_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[branches] (
    [id] NVARCHAR(64) NOT NULL,
    [organizationId] NVARCHAR(64) NOT NULL,
    [code] NVARCHAR(20) NOT NULL,
    [name] NVARCHAR(160) NOT NULL,
    [location] NVARCHAR(180) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [branches_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [branches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [branches_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [branches_organizationId_code_key] UNIQUE NONCLUSTERED ([organizationId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[members] (
    [id] NVARCHAR(64) NOT NULL,
    [organizationId] NVARCHAR(64) NOT NULL,
    [primaryBranchId] NVARCHAR(64),
    [name] NVARCHAR(160) NOT NULL,
    [email] NVARCHAR(180) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(24) NOT NULL,
    [status] NVARCHAR(24) NOT NULL,
    [lastActiveAt] DATETIME2,
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [members_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [members_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [members_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [members_organizationId_email_key] UNIQUE NONCLUSTERED ([organizationId],[email])
);

-- CreateTable
CREATE TABLE [dbo].[member_branch_access] (
    [memberId] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [member_branch_access_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [member_branch_access_pkey] PRIMARY KEY CLUSTERED ([memberId],[branchId])
);

-- CreateTable
CREATE TABLE [dbo].[ingredients] (
    [id] NVARCHAR(64) NOT NULL,
    [organizationId] NVARCHAR(64) NOT NULL,
    [name] NVARCHAR(160) NOT NULL,
    [category] NVARCHAR(100) NOT NULL,
    [unit] NVARCHAR(32) NOT NULL,
    [defaultPrice] DECIMAL(18,2) NOT NULL CONSTRAINT [ingredients_defaultPrice_df] DEFAULT 0,
    [supplier] NVARCHAR(180) NOT NULL CONSTRAINT [ingredients_supplier_df] DEFAULT '-',
    [isActive] BIT NOT NULL CONSTRAINT [ingredients_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ingredients_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ingredients_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ingredients_organizationId_name_unit_key] UNIQUE NONCLUSTERED ([organizationId],[name],[unit])
);

-- CreateTable
CREATE TABLE [dbo].[branch_inventory] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [ingredientId] NVARCHAR(64) NOT NULL,
    [onHand] DECIMAL(18,3) NOT NULL CONSTRAINT [branch_inventory_onHand_df] DEFAULT 0,
    [reservedQuantity] DECIMAL(18,3) NOT NULL CONSTRAINT [branch_inventory_reservedQuantity_df] DEFAULT 0,
    [reorderPoint] DECIMAL(18,3) NOT NULL CONSTRAINT [branch_inventory_reorderPoint_df] DEFAULT 0,
    [costPerUnit] DECIMAL(18,2) NOT NULL CONSTRAINT [branch_inventory_costPerUnit_df] DEFAULT 0,
    [lastUpdatedAt] DATETIME2 NOT NULL CONSTRAINT [branch_inventory_lastUpdatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [branch_inventory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [branch_inventory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [branch_inventory_branchId_ingredientId_key] UNIQUE NONCLUSTERED ([branchId],[ingredientId])
);

-- CreateTable
CREATE TABLE [dbo].[purchases] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [createdByMemberId] NVARCHAR(64),
    [purchaseDate] DATETIME2 NOT NULL,
    [vendor] NVARCHAR(180) NOT NULL CONSTRAINT [purchases_vendor_df] DEFAULT '-',
    [status] NVARCHAR(24) NOT NULL CONSTRAINT [purchases_status_df] DEFAULT 'posted',
    [totalAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [purchases_totalAmount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [purchases_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [purchases_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[purchase_items] (
    [id] NVARCHAR(64) NOT NULL,
    [purchaseId] NVARCHAR(64) NOT NULL,
    [ingredientId] NVARCHAR(64) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [unit] NVARCHAR(32) NOT NULL,
    [unitPrice] DECIMAL(18,2) NOT NULL,
    [lineTotal] DECIMAL(18,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [purchase_items_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [purchase_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[recipes] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [name] NVARCHAR(180) NOT NULL,
    [menuCategory] NVARCHAR(100) NOT NULL,
    [yield] INT NOT NULL,
    [pricePerServing] DECIMAL(18,2) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [recipes_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [recipes_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [recipes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [recipes_branchId_name_key] UNIQUE NONCLUSTERED ([branchId],[name])
);

-- CreateTable
CREATE TABLE [dbo].[recipe_items] (
    [id] NVARCHAR(64) NOT NULL,
    [recipeId] NVARCHAR(64) NOT NULL,
    [ingredientId] NVARCHAR(64) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [recipe_items_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [recipe_items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [recipe_items_recipeId_ingredientId_key] UNIQUE NONCLUSTERED ([recipeId],[ingredientId])
);

-- CreateTable
CREATE TABLE [dbo].[recipe_plans] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [recipeId] NVARCHAR(64) NOT NULL,
    [plannedByMemberId] NVARCHAR(64),
    [status] NVARCHAR(24) NOT NULL CONSTRAINT [recipe_plans_status_df] DEFAULT 'pinned',
    [batchCount] INT NOT NULL CONSTRAINT [recipe_plans_batchCount_df] DEFAULT 1,
    [plannedAt] DATETIME2 NOT NULL CONSTRAINT [recipe_plans_plannedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [cookedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [recipe_plans_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [recipe_plans_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[stock_reservations] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [recipePlanId] NVARCHAR(64) NOT NULL,
    [ingredientId] NVARCHAR(64) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [status] NVARCHAR(24) NOT NULL CONSTRAINT [stock_reservations_status_df] DEFAULT 'active',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [stock_reservations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [releasedAt] DATETIME2,
    CONSTRAINT [stock_reservations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[cooking_runs] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [recipeId] NVARCHAR(64) NOT NULL,
    [recipePlanId] NVARCHAR(64),
    [cookedByMemberId] NVARCHAR(64),
    [servingsProduced] INT NOT NULL,
    [status] NVARCHAR(24) NOT NULL CONSTRAINT [cooking_runs_status_df] DEFAULT 'completed',
    [cookedAt] DATETIME2 NOT NULL CONSTRAINT [cooking_runs_cookedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [cooking_runs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [cooking_runs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[stock_movements] (
    [id] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64) NOT NULL,
    [ingredientId] NVARCHAR(64) NOT NULL,
    [purchaseItemId] NVARCHAR(64),
    [cookingRunId] NVARCHAR(64),
    [createdByMemberId] NVARCHAR(64),
    [movementType] NVARCHAR(32) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [unit] NVARCHAR(32) NOT NULL,
    [unitCost] DECIMAL(18,2) NOT NULL CONSTRAINT [stock_movements_unitCost_df] DEFAULT 0,
    [beforeQuantity] DECIMAL(18,3) NOT NULL CONSTRAINT [stock_movements_beforeQuantity_df] DEFAULT 0,
    [afterQuantity] DECIMAL(18,3) NOT NULL CONSTRAINT [stock_movements_afterQuantity_df] DEFAULT 0,
    [referenceType] NVARCHAR(48),
    [referenceId] NVARCHAR(64),
    [occurredAt] DATETIME2 NOT NULL CONSTRAINT [stock_movements_occurredAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [stock_movements_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(64) NOT NULL,
    [organizationId] NVARCHAR(64) NOT NULL,
    [branchId] NVARCHAR(64),
    [memberId] NVARCHAR(64),
    [action] NVARCHAR(80) NOT NULL,
    [entityType] NVARCHAR(80) NOT NULL,
    [entityId] NVARCHAR(64) NOT NULL,
    [metadataJson] NVARCHAR(4000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [audit_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [branches_organizationId_idx] ON [dbo].[branches]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [members_organizationId_role_status_idx] ON [dbo].[members]([organizationId], [role], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [members_primaryBranchId_idx] ON [dbo].[members]([primaryBranchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [member_branch_access_branchId_idx] ON [dbo].[member_branch_access]([branchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ingredients_organizationId_category_idx] ON [dbo].[ingredients]([organizationId], [category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [branch_inventory_ingredientId_idx] ON [dbo].[branch_inventory]([ingredientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [purchases_branchId_purchaseDate_idx] ON [dbo].[purchases]([branchId], [purchaseDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [purchases_createdByMemberId_idx] ON [dbo].[purchases]([createdByMemberId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [purchase_items_purchaseId_idx] ON [dbo].[purchase_items]([purchaseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [purchase_items_ingredientId_idx] ON [dbo].[purchase_items]([ingredientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [recipes_branchId_menuCategory_idx] ON [dbo].[recipes]([branchId], [menuCategory]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [recipe_items_ingredientId_idx] ON [dbo].[recipe_items]([ingredientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [recipe_plans_branchId_status_idx] ON [dbo].[recipe_plans]([branchId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [recipe_plans_recipeId_idx] ON [dbo].[recipe_plans]([recipeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [recipe_plans_plannedByMemberId_idx] ON [dbo].[recipe_plans]([plannedByMemberId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_reservations_branchId_status_idx] ON [dbo].[stock_reservations]([branchId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_reservations_recipePlanId_idx] ON [dbo].[stock_reservations]([recipePlanId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_reservations_ingredientId_idx] ON [dbo].[stock_reservations]([ingredientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [cooking_runs_branchId_cookedAt_idx] ON [dbo].[cooking_runs]([branchId], [cookedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [cooking_runs_recipeId_idx] ON [dbo].[cooking_runs]([recipeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [cooking_runs_recipePlanId_idx] ON [dbo].[cooking_runs]([recipePlanId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [cooking_runs_cookedByMemberId_idx] ON [dbo].[cooking_runs]([cookedByMemberId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_movements_branchId_ingredientId_occurredAt_idx] ON [dbo].[stock_movements]([branchId], [ingredientId], [occurredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_movements_purchaseItemId_idx] ON [dbo].[stock_movements]([purchaseItemId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_movements_cookingRunId_idx] ON [dbo].[stock_movements]([cookingRunId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stock_movements_createdByMemberId_idx] ON [dbo].[stock_movements]([createdByMemberId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_organizationId_createdAt_idx] ON [dbo].[audit_logs]([organizationId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_branchId_createdAt_idx] ON [dbo].[audit_logs]([branchId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_memberId_idx] ON [dbo].[audit_logs]([memberId]);

-- AddForeignKey
ALTER TABLE [dbo].[branches] ADD CONSTRAINT [branches_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[members] ADD CONSTRAINT [members_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[members] ADD CONSTRAINT [members_primaryBranchId_fkey] FOREIGN KEY ([primaryBranchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[member_branch_access] ADD CONSTRAINT [member_branch_access_memberId_fkey] FOREIGN KEY ([memberId]) REFERENCES [dbo].[members]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[member_branch_access] ADD CONSTRAINT [member_branch_access_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ingredients] ADD CONSTRAINT [ingredients_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[branch_inventory] ADD CONSTRAINT [branch_inventory_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[branch_inventory] ADD CONSTRAINT [branch_inventory_ingredientId_fkey] FOREIGN KEY ([ingredientId]) REFERENCES [dbo].[ingredients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [purchases_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchases] ADD CONSTRAINT [purchases_createdByMemberId_fkey] FOREIGN KEY ([createdByMemberId]) REFERENCES [dbo].[members]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchase_items] ADD CONSTRAINT [purchase_items_purchaseId_fkey] FOREIGN KEY ([purchaseId]) REFERENCES [dbo].[purchases]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[purchase_items] ADD CONSTRAINT [purchase_items_ingredientId_fkey] FOREIGN KEY ([ingredientId]) REFERENCES [dbo].[ingredients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recipes] ADD CONSTRAINT [recipes_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recipe_items] ADD CONSTRAINT [recipe_items_recipeId_fkey] FOREIGN KEY ([recipeId]) REFERENCES [dbo].[recipes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recipe_items] ADD CONSTRAINT [recipe_items_ingredientId_fkey] FOREIGN KEY ([ingredientId]) REFERENCES [dbo].[ingredients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recipe_plans] ADD CONSTRAINT [recipe_plans_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recipe_plans] ADD CONSTRAINT [recipe_plans_recipeId_fkey] FOREIGN KEY ([recipeId]) REFERENCES [dbo].[recipes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recipe_plans] ADD CONSTRAINT [recipe_plans_plannedByMemberId_fkey] FOREIGN KEY ([plannedByMemberId]) REFERENCES [dbo].[members]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_reservations] ADD CONSTRAINT [stock_reservations_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_reservations] ADD CONSTRAINT [stock_reservations_recipePlanId_fkey] FOREIGN KEY ([recipePlanId]) REFERENCES [dbo].[recipe_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_reservations] ADD CONSTRAINT [stock_reservations_ingredientId_fkey] FOREIGN KEY ([ingredientId]) REFERENCES [dbo].[ingredients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cooking_runs] ADD CONSTRAINT [cooking_runs_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cooking_runs] ADD CONSTRAINT [cooking_runs_recipeId_fkey] FOREIGN KEY ([recipeId]) REFERENCES [dbo].[recipes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cooking_runs] ADD CONSTRAINT [cooking_runs_recipePlanId_fkey] FOREIGN KEY ([recipePlanId]) REFERENCES [dbo].[recipe_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cooking_runs] ADD CONSTRAINT [cooking_runs_cookedByMemberId_fkey] FOREIGN KEY ([cookedByMemberId]) REFERENCES [dbo].[members]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_movements] ADD CONSTRAINT [stock_movements_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_movements] ADD CONSTRAINT [stock_movements_ingredientId_fkey] FOREIGN KEY ([ingredientId]) REFERENCES [dbo].[ingredients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_movements] ADD CONSTRAINT [stock_movements_purchaseItemId_fkey] FOREIGN KEY ([purchaseItemId]) REFERENCES [dbo].[purchase_items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_movements] ADD CONSTRAINT [stock_movements_cookingRunId_fkey] FOREIGN KEY ([cookingRunId]) REFERENCES [dbo].[cooking_runs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stock_movements] ADD CONSTRAINT [stock_movements_createdByMemberId_fkey] FOREIGN KEY ([createdByMemberId]) REFERENCES [dbo].[members]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_memberId_fkey] FOREIGN KEY ([memberId]) REFERENCES [dbo].[members]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
