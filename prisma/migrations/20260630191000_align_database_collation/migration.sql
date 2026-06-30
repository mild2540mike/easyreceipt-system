DECLARE @databaseName SYSNAME = DB_NAME();
DECLARE @targetCollation NVARCHAR(128) = N'SQL_Latin1_General_CP1_CI_AS';
DECLARE @currentCollation NVARCHAR(128) =
  CONVERT(NVARCHAR(128), DATABASEPROPERTYEX(@databaseName, 'Collation'));

IF @currentCollation <> @targetCollation
BEGIN
  DECLARE @statement NVARCHAR(MAX) =
    N'ALTER DATABASE ' + QUOTENAME(@databaseName) + N' COLLATE ' + @targetCollation;

  EXEC (@statement);
END;
