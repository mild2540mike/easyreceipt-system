/* Run in the application database. Separates cost-repair audits from the
   original usage metadata; preserves costs, quantities and all audit entries.
   Compatible with older application versions. Safe to run again.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE audit_logs
    SET entityType = N'stock_movement_cost'
    WHERE entityType = N'stock_movement'
      AND action IN (N'zero_cost_patched', N'usage_cost_repaired');
    SELECT @@ROWCOUNT AS repair_audits_reclassified;
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;
