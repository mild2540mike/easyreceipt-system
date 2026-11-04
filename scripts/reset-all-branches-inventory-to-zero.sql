/* ALL branches in the selected database, including inactive branches.
   Back up production first. Run the whole file with @Apply=0 to review,
   then @Apply=1 to apply during a quiet period.
   Positive and negative on-hand balances become zero. Prices, reservations,
   purchase/usage history and previous physical counts remain unchanged.
   Stops if an affected item has reserved stock. All writes are atomic.
   A completion marker prevents reruns from resetting newly received stock.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Apply bit = 0;
DECLARE @ExpectedDatabase sysname = N'EasyReceiptSystem';
DECLARE @OperationId nvarchar(64) = N'reset-all-inventory-20261104';
DECLARE @Now datetime2 = SYSUTCDATETIME();

IF DB_NAME() <> @ExpectedDatabase
    THROW 50001, 'Select the intended application database before running.', 1;
IF @@TRANCOUNT <> 0
    THROW 50002, 'Run outside an existing transaction.', 1;
DROP TABLE IF EXISTS #ResetAllBranches, #ResetAllStock;

BEGIN TRY
    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM audit_logs WITH (UPDLOCK, HOLDLOCK)
               WHERE action=N'inventory_reset_completed' AND entityId=@OperationId)
    BEGIN
        COMMIT;
        SELECT N'This reset was already applied. New stock is preserved.' AS result;
        RETURN;
    END;

    SELECT id, code, name, organizationId INTO #ResetAllBranches
    FROM branches WITH (UPDLOCK, HOLDLOCK);
    IF NOT EXISTS (SELECT 1 FROM #ResetAllBranches)
        THROW 50003, 'No branches found. Check the selected database.', 1;

    SELECT bi.id, bi.branchId, b.organizationId, bi.ingredientId,
           i.name, i.unit, bi.onHand AS beforeQuantity,
           bi.reservedQuantity, bi.costPerUnit, bi.lastUpdatedAt, bi.updatedAt
    INTO #ResetAllStock
    FROM branch_inventory bi WITH (UPDLOCK, HOLDLOCK)
    JOIN #ResetAllBranches b ON b.id=bi.branchId
    JOIN ingredients i ON i.id=bi.ingredientId
    WHERE bi.onHand<>0;

    SELECT DB_NAME() AS database_name, @Apply AS apply_changes,
           b.code AS branch_code, b.name AS branch_name, b.id AS branch_id,
           COUNT(r.id) AS affected_rows,
           COUNT(CASE WHEN r.beforeQuantity>0 THEN 1 END) AS positive_rows,
           COUNT(CASE WHEN r.beforeQuantity<0 THEN 1 END) AS negative_rows,
           COUNT(CASE WHEN r.reservedQuantity<>0 THEN 1 END) AS reserved_rows
    FROM #ResetAllBranches b LEFT JOIN #ResetAllStock r ON r.branchId=b.id
    GROUP BY b.id,b.code,b.name ORDER BY b.code,b.id;
    SELECT b.code AS branch_code, b.name AS branch_name, r.id, r.name,
           r.beforeQuantity, CAST(0 AS decimal(18,3)) AS afterQuantity,
           r.unit, r.costPerUnit AS unchanged_unit_cost, r.reservedQuantity
    FROM #ResetAllStock r JOIN #ResetAllBranches b ON b.id=r.branchId
    ORDER BY b.code,r.name,r.id;

    IF @Apply=0
    BEGIN
        ROLLBACK;
        SELECT N'Preview only. No data changed. Set @Apply=1 to apply.' AS result;
        RETURN;
    END;
    IF EXISTS (SELECT 1 FROM #ResetAllStock WHERE reservedQuantity<>0)
        THROW 50004, 'Some affected items have reserved stock. Resolve reservations first. Nothing reset.', 1;

    DECLARE @Expected int=(SELECT COUNT(*) FROM #ResetAllStock);
    INSERT INTO stock_movements (id,branchId,ingredientId,movementType,quantity,
        unit,unitCost,beforeQuantity,afterQuantity,referenceType,referenceId,occurredAt)
    SELECT CONVERT(nvarchar(36),NEWID()),branchId,ingredientId,
        CASE WHEN beforeQuantity>0 THEN N'count_adjustment_out' ELSE N'count_adjustment_in' END,
        ABS(beforeQuantity),unit,costPerUnit,beforeQuantity,0,N'inventory_reset',@OperationId,@Now
    FROM #ResetAllStock;
    IF @@ROWCOUNT<>@Expected THROW 50005, 'Adjustment count mismatch.', 1;

    INSERT INTO audit_logs (id,organizationId,branchId,action,entityType,entityId,metadataJson,createdAt)
    SELECT CONVERT(nvarchar(36),NEWID()),r.organizationId,r.branchId,
        N'inventory_balance_reset',N'branch_inventory',r.id,
        (SELECT @OperationId AS operationId,r.ingredientId AS ingredientId,
                r.beforeQuantity AS beforeQuantity,0 AS afterQuantity,
                r.costPerUnit AS unchangedUnitCost,r.lastUpdatedAt AS previousLastUpdatedAt,
                r.updatedAt AS previousUpdatedAt,N'Owner requested all branch balances reset' AS reason
         FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),@Now
    FROM #ResetAllStock r;
    IF @@ROWCOUNT<>@Expected THROW 50006, 'Audit count mismatch.', 1;

    UPDATE bi SET onHand=0,lastUpdatedAt=@Now,updatedAt=@Now
    FROM branch_inventory bi JOIN #ResetAllStock r ON r.id=bi.id
    WHERE bi.branchId=r.branchId AND bi.onHand=r.beforeQuantity;
    IF @@ROWCOUNT<>@Expected THROW 50007, 'Update count mismatch.', 1;

    -- One completion marker for each organization, including branches already at zero.
    INSERT INTO audit_logs (id,organizationId,action,entityType,entityId,metadataJson,createdAt)
    SELECT CONVERT(nvarchar(36),NEWID()),o.organizationId,N'inventory_reset_completed',
        N'inventory_reset',@OperationId,
        (SELECT @OperationId AS operationId,@Expected AS totalAffectedRows,
                N'all branches in database' AS scope FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),@Now
    FROM (SELECT DISTINCT organizationId FROM #ResetAllBranches) o;

    COMMIT;
    SELECT N'All branch inventory balances reset to zero' AS result,
           @Expected AS changed_rows,@OperationId AS operation_id;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    THROW;
END CATCH;
