export interface Profile {
  id: string;
  name: string;
  isDefault: boolean;
  isPublic?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  channels?: ProfileChannel[];
  keywords?: ProfileKeyword[];
  _count?: { channels: number; keywords: number; followers?: number };
  owner?: { name: string; avatarUrl?: string };
  isFollowing?: boolean;
}

export interface CommunityProfile {
  id: string;
  name: string;
  isPublic: boolean;
  user: { name: string; avatarUrl: string | null };
  _count: { followers: number };
  isFollowing: boolean;
  isOwn?: boolean;
}

export interface CommunityProfilesResponse {
  profiles: CommunityProfile[];
  total: number;
  page: number;
  limit: number;
}

export interface ProfileChannel {
  id: string;
  profileId: string;
  youtubeChannelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface ProfileKeyword {
  id: string;
  profileId: string;
  keyword: string;
  createdAt: string;
}
