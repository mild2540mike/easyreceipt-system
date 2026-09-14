/*
  timetoeat / EasyReceipt - full SQL Server database backup
  Run in SQL Server Management Studio (SSMS) on the server holding the data.
  1. Set @DatabaseName to the database used by the application.
  2. Leave @BackupDirectory NULL to use SQL Server's default backup folder,
     or supply an existing server-side folder, e.g. N'D:\SQLBackups'.
  The SQL Server service account must be able to write to that folder.
  Requires BACKUP DATABASE permission and permission for RESTORE VERIFYONLY.
  This backs up database data only; public/uploads files are separate.
*/
SET NOCOUNT ON;

DECLARE @DatabaseName sysname = N'EasyReceiptSystem';
DECLARE @BackupDirectory nvarchar(2048) = NULL;

IF DB_ID(@DatabaseName) IS NULL
    THROW 50001, 'Database not found or not accessible. Check @DatabaseName.', 1;

IF @DatabaseName IN (N'master', N'model', N'msdb', N'tempdb')
    THROW 50002, 'Select the application database, not a system database.', 1;

IF @BackupDirectory IS NULL
    SET @BackupDirectory = CONVERT(nvarchar(2048), SERVERPROPERTY('InstanceDefaultBackupPath'));

IF NULLIF(LTRIM(RTRIM(@BackupDirectory)), N'') IS NULL
    THROW 50003, 'Set @BackupDirectory to an existing folder on the SQL Server machine.', 1;

DECLARE @Separator nchar(1) = CASE WHEN LEFT(@BackupDirectory, 1) = N'/' THEN N'/' ELSE N'\' END;
IF RIGHT(@BackupDirectory, 1) NOT IN (N'/', N'\')
    SET @BackupDirectory = @BackupDirectory + @Separator;

-- A timestamp and unique suffix create a new file for each run.
DECLARE @Timestamp varchar(32) = REPLACE(REPLACE(CONVERT(varchar(23), GETUTCDATE(), 126), ':', ''), '.', '');
DECLARE @BackupFile nvarchar(4000) = @BackupDirectory
    + N'timetoeat_' + @Timestamp + N'Z_' + CONVERT(nvarchar(36), NEWID()) + N'.bak';
DECLARE @Sql nvarchar(max);

SELECT @DatabaseName AS database_name, @BackupFile AS backup_file_on_sql_server;

-- COPY_ONLY preserves the existing differential backup base.
-- NOINIT avoids overwriting any existing backup media.
SET @Sql = N'BACKUP DATABASE ' + QUOTENAME(@DatabaseName)
    + N' TO DISK = N''' + REPLACE(@BackupFile, N'''', N'''''')
    + N''' WITH COPY_ONLY, NOINIT, CHECKSUM, STOP_ON_ERROR, STATS = 10;';
EXEC sys.sp_executesql @Sql;

-- Checks readability and backup checksums without restoring any database.
SET @Sql = N'RESTORE VERIFYONLY FROM DISK = N'''
    + REPLACE(@BackupFile, N'''', N'''''')
    + N''' WITH CHECKSUM, STOP_ON_ERROR;';
EXEC sys.sp_executesql @Sql;

SELECT N'Backup completed and VERIFYONLY passed' AS result,
       @DatabaseName AS database_name,
       @BackupFile AS backup_file_on_sql_server;
