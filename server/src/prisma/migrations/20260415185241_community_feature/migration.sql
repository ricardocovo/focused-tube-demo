BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Profile] ADD [isPublic] BIT NOT NULL CONSTRAINT [Profile_isPublic_df] DEFAULT 0;

-- CreateTable
CREATE TABLE [dbo].[ProfileFollow] (
    [id] NVARCHAR(1000) NOT NULL,
    [followerId] NVARCHAR(1000) NOT NULL,
    [profileId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProfileFollow_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProfileFollow_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProfileFollow_followerId_profileId_key] UNIQUE NONCLUSTERED ([followerId],[profileId])
);

-- AddForeignKey
ALTER TABLE [dbo].[ProfileFollow] ADD CONSTRAINT [ProfileFollow_followerId_fkey] FOREIGN KEY ([followerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProfileFollow] ADD CONSTRAINT [ProfileFollow_profileId_fkey] FOREIGN KEY ([profileId]) REFERENCES [dbo].[Profile]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
