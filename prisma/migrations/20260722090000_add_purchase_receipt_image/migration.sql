BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[purchases] ADD [receiptImageMimeType] NVARCHAR(64),
[receiptImageOriginalName] NVARCHAR(255),
[receiptImageSizeBytes] INT,
[receiptImageStoredName] NVARCHAR(255);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
