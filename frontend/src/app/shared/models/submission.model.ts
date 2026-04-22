import { User } from './user.model';
import { Quest } from './quest.model';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  _id: string;
  questId: Quest | string;
  userId: User | string;
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
  description: string;
  rawVoteCount: number;
  legitimVotes: number;
  notLegitVotes: number;
  approvalPct: number;
  status: SubmissionStatus;
  isControversial: boolean;
  resolvedAt?: string;
  xpAwarded: boolean;
  xpAmount: number;
  likes: string[];
  likeCount: number;
  commentCount: number;
  flaggedForReview: boolean;
  isLiked?: boolean;
  hasUserVoted?: 'legit' | 'not_legit' | null;
  createdAt: string;
}

export interface VoteSummary {
  rawVoteCount: number;
  legitimVotes: number;
  notLegitVotes: number;
  approvalPct: number; // 0-100
  isControversial: boolean;
  status: SubmissionStatus;
  votesNeeded: number;
  userVote: 'legit' | 'not_legit' | null;
}

export interface Comment {
  _id: string;
  targetId: string;
  targetType: 'submission' | 'community_quest';
  authorId: User;
  text: string;
  likes: string[];
  likeCount: number;
  parentId?: string;
  replyCount: number;
  isDeleted: boolean;
  isLiked?: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  [key: string]: any;
}
