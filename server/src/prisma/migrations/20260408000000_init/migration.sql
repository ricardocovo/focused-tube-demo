BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [googleId] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [avatarUrl] NVARCHAR(1000),
    [accessToken] NVARCHAR(1000) NOT NULL,
    [refreshToken] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Profile] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [isDefault] BIT NOT NULL CONSTRAINT [Profile_isDefault_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Profile_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Profile_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProfileChannel] (
    [id] NVARCHAR(1000) NOT NULL,
    [profileId] NVARCHAR(1000) NOT NULL,
    [youtubeChannelId] NVARCHAR(1000) NOT NULL,
    [channelTitle] NVARCHAR(1000) NOT NULL,
    [thumbnailUrl] NVARCHAR(1000),
    CONSTRAINT [ProfileChannel_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProfileKeyword] (
    [id] NVARCHAR(1000) NOT NULL,
    [profileId] NVARCHAR(1000) NOT NULL,
    [keyword] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ProfileKeyword_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [User_googleId_key] ON [dbo].[User]([googleId]);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [User_email_key] ON [dbo].[User]([email]);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [Profile_userId_name_key] ON [dbo].[Profile]([userId], [name]);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [ProfileChannel_profileId_youtubeChannelId_key] ON [dbo].[ProfileChannel]([profileId], [youtubeChannelId]);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [ProfileKeyword_profileId_keyword_key] ON [dbo].[ProfileKeyword]([profileId], [keyword]);

-- AddForeignKey
ALTER TABLE [dbo].[Profile] ADD CONSTRAINT [Profile_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProfileChannel] ADD CONSTRAINT [ProfileChannel_profileId_fkey] FOREIGN KEY ([profileId]) REFERENCES [dbo].[Profile]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProfileKeyword] ADD CONSTRAINT [ProfileKeyword_profileId_fkey] FOREIGN KEY ([profileId]) REFERENCES [dbo].[Profile]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
