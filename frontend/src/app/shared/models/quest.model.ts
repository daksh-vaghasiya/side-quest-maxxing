export type QuestCategory = 'fitness' | 'mindfulness' | 'creativity' | 'social' | 'learning' | 'outdoor' | 'food' | 'tech' | 'finance' | 'other';
export type QuestDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Legendary';
export type QuestStatus = 'active' | 'inactive' | 'archived';

export interface Quest {
  _id: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  xpReward: number;
  status: QuestStatus;
  coverImage?: string;
  createdBy: { _id: string; username: string; avatar: string; level: string };
  isOfficial: boolean;
  acceptedCount: number;
  completedCount: number;
  submissionCount: number;
  tags: string[];
  requirements: string[];
  timeLimitDays?: number;
  isRepeatable: boolean;
  createdAt: string;
  // UI state (attached by API)
  isAccepted?: boolean;
  isCompleted?: boolean;
  userStatus?: 'none' | 'accepted' | 'completed';
  submissionStatus?: 'pending' | 'approved' | 'rejected' | null;
}

export interface CommunityQuest {
  _id: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  suggestedXpReward: number;
  requirements: string[];
  tags: string[];
  submittedBy: { _id: string; username: string; avatar: string; level: string };
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  hasUpvoted?: boolean;
  hasDownvoted?: boolean;
  createdAt: string;
}

export const CATEGORY_ICONS: Record<QuestCategory, string> = {
  fitness:     '🏋️',
  mindfulness: '🧘',
  creativity:  '🎨',
  social:      '🤝',
  learning:    '📚',
  outdoor:     '🌄',
  food:        '🍳',
  tech:        '💻',
  finance:     '💰',
  other:       '⚡',
};

export const DIFFICULTY_XP_GUIDE: Record<QuestDifficulty, string> = {
  Easy:      '50-150 XP',
  Medium:    '150-300 XP',
  Hard:      '300-500 XP',
  Legendary: '500-800 XP',
};
