/* PRODUCTION PATCH - SQL Server / timetoeat (single standalone script)
   Repairs zero costs across ALL branches AND restores original usage grouping
   hidden by older cost-patch audit records. No other SQL file is required.
   Open the application database in SSMS. Run with @Apply = 0 first.
   Set @Apply = 1 to apply ONLY rows marked READY, atomically with an audit trail.
   Back up the database before applying and deploy the usage-reversal code fix.

   Policy: latest SAVED receipt recorded BEFORE the usage, same ingredient ID,
   branch and exact unit. Inventory uses the latest receipt as of this run.
   When no prior receipt exists, use the CURRENT shared catalog price as an
   explicitly labelled reference estimate (not an actual historical purchase cost).
   Existing positive costs, quantities and purchases are untouched.
   Zero cost alone is not proof of an error: review READY rows before applying.
   Unknown prices, explicit manual cost edits and intervening deleted purchases
   are reported for review, not guessed. This is not a general data-cleaning script.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Apply bit = 0;
DECLARE @RunId nvarchar(36) = CONVERT(nvarchar(36), NEWID());
DECLARE @AsOf datetime2 = SYSUTCDATETIME();

IF @@TRANCOUNT <> 0 THROW 50001, 'Run outside any existing transaction.', 1;
DROP TABLE IF EXISTS #Receipts, #History, #Targets, #Plan, #Catalog;

BEGIN TRY
    BEGIN TRANSACTION;

    SELECT id, unit, defaultPrice, lastPriceUpdatedAt
    INTO #Catalog FROM ingredients WITH (UPDLOCK, HOLDLOCK);

    -- Lock the source tables until review/patch completes to avoid racing receipts.
    SELECT sm.id, sm.branchId, sm.ingredientId, sm.unit, sm.unitCost, sm.occurredAt,
           pi.id AS purchaseItemId, p.id AS purchaseId, pi.unitPrice,
           pi.unit AS purchaseUnit, pi.quantity AS purchaseQuantity,
           sm.quantity AS receiptQuantity, p.status, p.createdAt,
           p.branchId AS purchaseBranchId, pi.ingredientId AS purchaseIngredientId
    INTO #Receipts
    FROM stock_movements sm WITH (UPDLOCK, HOLDLOCK)
    LEFT JOIN purchase_items pi WITH (UPDLOCK, HOLDLOCK) ON pi.id = sm.purchaseItemId
    LEFT JOIN purchases p WITH (UPDLOCK, HOLDLOCK) ON p.id = pi.purchaseId
    WHERE sm.movementType = N'purchase_in';

    SELECT branchId, entityId, action, metadataJson, createdAt
    INTO #History FROM audit_logs WITH (UPDLOCK, HOLDLOCK)
    WHERE action IN (N'inventory_updated', N'purchase_deleted');

    SELECT N'stock_movement' AS entityType, sm.id, sm.branchId, sm.ingredientId,
           sm.unit, sm.quantity, sm.unitCost AS oldCost, sm.occurredAt AS priceAt
    INTO #Targets
    FROM stock_movements sm WITH (UPDLOCK, HOLDLOCK)
    WHERE sm.movementType = N'usage_out' AND sm.unitCost = 0
    UNION ALL
    SELECT N'branch_inventory', bi.id, bi.branchId, bi.ingredientId,
           i.unit, bi.onHand, bi.costPerUnit, @AsOf
    FROM branch_inventory bi WITH (UPDLOCK, HOLDLOCK)
    JOIN #Catalog i ON i.id = bi.ingredientId
    WHERE bi.costPerUnit = 0;

    -- New app versions distinguish an intentional zero from a missing cost.
    IF COL_LENGTH('stock_movements', 'costStatus') IS NOT NULL
      EXEC(N'DELETE t FROM #Targets t JOIN stock_movements sm ON sm.id=t.id
        WHERE t.entityType=''stock_movement'' AND sm.costStatus=''confirmed_zero'';');

    SELECT t.*, r.id AS sourceMovementId, r.purchaseId, r.occurredAt AS sourceAt,
           r.unitPrice AS newCost,
           CAST(N'BRANCH_RECEIPT' AS nvarchar(40)) AS priceSource,
           CAST(0 AS bit) AS isReferenceCost,
           CAST(NULL AS datetime2) AS catalogPriceUpdatedAt,
           CAST(CASE
             WHEN r.id IS NULL THEN N'NO_PRIOR_RECEIPT'
             WHEN r.status <> N'saved' OR r.purchaseId IS NULL THEN N'INVALID_RECEIPT'
             WHEN r.purchaseBranchId <> t.branchId OR r.purchaseIngredientId <> t.ingredientId
               THEN N'RECEIPT_MISMATCH'
             WHEN r.createdAt > t.priceAt THEN N'RECEIPT_RECORDED_LATER'
             WHEN r.unit COLLATE Latin1_General_100_BIN2 <> t.unit COLLATE Latin1_General_100_BIN2
               OR r.purchaseUnit COLLATE Latin1_General_100_BIN2 <> t.unit COLLATE Latin1_General_100_BIN2
               THEN N'UNIT_MISMATCH'
             WHEN r.unitPrice <= 0 THEN N'LATEST_RECEIPT_ZERO_PRICE'
             WHEN r.unitCost <> r.unitPrice OR r.receiptQuantity <> r.purchaseQuantity
               THEN N'RECEIPT_MISMATCH'
             WHEN (SELECT COUNT(*) FROM #Receipts sameTime
                   WHERE sameTime.branchId = t.branchId AND sameTime.ingredientId = t.ingredientId
                     AND sameTime.occurredAt = r.occurredAt) > 1 THEN N'AMBIGUOUS_RECEIPT_TIME'
             WHEN EXISTS (SELECT 1 FROM #History h
                   WHERE h.branchId = t.branchId AND h.createdAt >= r.occurredAt
                     AND h.createdAt <= t.priceAt AND h.action = N'purchase_deleted')
               THEN N'PURCHASE_DELETED_REVIEW'
             WHEN EXISTS (SELECT 1 FROM #History h
                   WHERE h.branchId = t.branchId AND h.entityId = t.ingredientId
                     AND h.createdAt >= r.occurredAt AND h.createdAt <= t.priceAt
                     AND h.action = N'inventory_updated'
                     AND (h.metadataJson IS NULL OR ISJSON(h.metadataJson) = 0
                          OR h.metadataJson LIKE N'%"costPerUnit"%'))
               THEN N'MANUAL_COST_EDIT_REVIEW'
             ELSE N'READY' END AS nvarchar(40)) AS decision
    INTO #Plan
    FROM #Targets t
    OUTER APPLY (SELECT TOP (1) * FROM #Receipts receipt
                 WHERE receipt.branchId = t.branchId AND receipt.ingredientId = t.ingredientId
                   AND receipt.occurredAt <= t.priceAt
                 ORDER BY receipt.occurredAt DESC, receipt.id DESC) r;

    -- Explicitly authorized fallback: current catalog price, never disguised
    -- as a historical receipt. Do not bypass invalid receipts or manual edits.
    UPDATE p SET
        newCost = CASE WHEN c.defaultPrice > 0 THEN c.defaultPrice END,
        priceSource = N'CATALOG_REFERENCE', isReferenceCost = 1,
        catalogPriceUpdatedAt = c.lastPriceUpdatedAt,
        decision = CASE
          WHEN c.unit COLLATE Latin1_General_100_BIN2 <> p.unit COLLATE Latin1_General_100_BIN2
            THEN N'UNIT_MISMATCH'
          WHEN c.defaultPrice <= 0 THEN N'NO_CATALOG_PRICE'
          WHEN EXISTS (SELECT 1 FROM #History h
                WHERE h.branchId = p.branchId AND h.entityId = p.ingredientId
                  AND h.createdAt <= p.priceAt AND h.action = N'inventory_updated'
                  AND (h.metadataJson IS NULL OR ISJSON(h.metadataJson) = 0
                       OR h.metadataJson LIKE N'%"costPerUnit"%'))
            THEN N'MANUAL_COST_EDIT_REVIEW'
          ELSE N'READY' END
    FROM #Plan p JOIN #Catalog c ON c.id = p.ingredientId
    WHERE p.decision = N'NO_PRIOR_RECEIPT';

    SELECT @RunId AS run_id, @Apply AS apply_changes, entityType, decision, priceSource, COUNT(*) AS row_count
    FROM #Plan GROUP BY entityType, decision, priceSource ORDER BY entityType, decision, priceSource;

    -- Omit thousands of empty, never-purchased inventory rows from the detail view.
    SELECT p.entityType, p.id, b.name AS branch, i.name AS ingredient, p.unit,
           p.quantity, p.priceAt, p.oldCost, p.newCost, p.decision,
           p.purchaseId, p.sourceMovementId, p.sourceAt,
           p.priceSource, p.isReferenceCost, p.catalogPriceUpdatedAt,
           CASE WHEN p.entityType = N'stock_movement' AND p.decision = N'READY'
                THEN p.quantity * p.newCost END AS repaired_usage_total
    FROM #Plan p JOIN branches b ON b.id = p.branchId JOIN ingredients i ON i.id = p.ingredientId
    WHERE p.entityType = N'stock_movement' OR p.quantity <> 0 OR p.sourceMovementId IS NOT NULL OR p.decision = N'READY'
    ORDER BY p.decision, b.name, i.name, p.priceAt;

    IF @Apply = 0
    BEGIN
        SELECT COUNT(*) AS grouping_audits_to_reclassify
        FROM audit_logs WITH (UPDLOCK, HOLDLOCK)
        WHERE entityType = N'stock_movement'
          AND action IN (N'zero_cost_patched', N'usage_cost_repaired');
        ROLLBACK;
        SELECT N'Preview only. No data changed. Review READY rows, then set @Apply = 1.' AS result;
        RETURN;
    END;

    DECLARE @Expected int = (SELECT COUNT(*) FROM #Plan WHERE decision = N'READY');
    DECLARE @Changed int = 0;
    DECLARE @GroupingFixed int = 0;

    -- Older app versions read the newest stock_movement audit as group metadata.
    -- Keep every repair audit but separate it from the original usage_out audit.
    -- This must run even if there are no remaining zero-cost rows to patch.
    UPDATE audit_logs SET entityType = N'stock_movement_cost'
    WHERE entityType = N'stock_movement'
      AND action IN (N'zero_cost_patched', N'usage_cost_repaired');
    SET @GroupingFixed = @@ROWCOUNT;
    UPDATE sm SET unitCost = p.newCost
    FROM stock_movements sm JOIN #Plan p ON p.id = sm.id
    WHERE p.entityType = N'stock_movement' AND p.decision = N'READY' AND sm.unitCost = p.oldCost;
    SET @Changed = @@ROWCOUNT;

    UPDATE bi SET costPerUnit = p.newCost, lastUpdatedAt = @AsOf, updatedAt = @AsOf
    FROM branch_inventory bi JOIN #Plan p ON p.id = bi.id
    WHERE p.entityType = N'branch_inventory' AND p.decision = N'READY' AND bi.costPerUnit = p.oldCost;
    SET @Changed = @Changed + @@ROWCOUNT;
    IF @Changed <> @Expected THROW 50002, 'Data changed during patch. All changes rolled back.', 1;

    INSERT INTO audit_logs (id, organizationId, branchId, memberId, action, entityType, entityId, metadataJson, createdAt)
    SELECT CONVERT(nvarchar(36), NEWID()), b.organizationId, p.branchId, NULL,
           N'zero_cost_patched',
           CASE WHEN p.entityType = N'stock_movement' THEN N'stock_movement_cost' ELSE p.entityType END, p.id,
           (SELECT @RunId AS runId, p.priceSource AS policy,
                   p.isReferenceCost AS isReferenceCost, p.catalogPriceUpdatedAt AS catalogPriceUpdatedAt,
                   p.ingredientId AS ingredientId, p.oldCost AS beforeCost, p.newCost AS afterCost,
                   p.quantity AS quantity, p.purchaseId AS purchaseId,
                   p.sourceMovementId AS sourceMovementId, p.sourceAt AS sourceAt
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER), @AsOf
    FROM #Plan p JOIN branches b ON b.id = p.branchId WHERE p.decision = N'READY';
    IF @@ROWCOUNT <> @Expected THROW 50003, 'Audit count mismatch. All changes rolled back.', 1;

    IF COL_LENGTH('stock_movements', 'costStatus') IS NOT NULL
      EXEC(N'UPDATE sm SET costStatus=CASE WHEN p.isReferenceCost=1 THEN ''estimated'' ELSE ''recorded'' END,
        costSource=CASE WHEN p.isReferenceCost=1 THEN ''catalog_reference'' ELSE ''purchase'' END
        FROM stock_movements sm JOIN #Plan p ON p.id=sm.id
        WHERE p.entityType=''stock_movement'' AND p.decision=''READY'';');
    IF COL_LENGTH('branch_inventory', 'costSource') IS NOT NULL
      EXEC(N'UPDATE bi SET costSource=CASE WHEN p.isReferenceCost=1 THEN ''catalog_reference'' ELSE ''purchase'' END
        FROM branch_inventory bi JOIN #Plan p ON p.id=bi.id
        WHERE p.entityType=''branch_inventory'' AND p.decision=''READY'';');
    COMMIT;
    SELECT N'Patch complete' AS result, @RunId AS run_id, @Changed AS changed_rows,
           @GroupingFixed AS grouping_audits_reclassified;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;
