import { Quest } from './quest.model';

export interface Badge {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  iconType: 'emoji' | 'image';
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpBonus: number;
}

export interface User {
  _id: string;
  clerkId?: string;
  username: string;
  email?: string;
  avatar: string;
  bio: string;
  fullName?: string;
  xp: number;
  level: 'Beginner' | 'Intermediate' | 'Pro' | 'Legend';
  reputation: number;
  badges: Badge[];
  acceptedQuests: Quest[] | string[];
  completedQuests: Quest[] | string[];
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  warnings: number;
  isBanned: boolean;
  role: 'user' | 'moderator' | 'admin';
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalVotesCast: number;
  voteWeight?: number;
  followers: string[];
  following: string[];
  createdAt: string;
}

export interface XpProgress {
  currentLevelXp: number;
  levelRangeXp: number;
  pct: number;
  nextLevel: string | null;
  xpToNextLevel: number;
}

export interface LeaderboardEntry {
  _id: string;
  userId: string | User;
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  globalRank: number;
  weeklyRank?: number;
  monthlyRank?: number;
  username: string;
  avatar: string;
  level: string;
  reputation: number;
  badges: Badge[];
  completedQuestCount: number;
}
