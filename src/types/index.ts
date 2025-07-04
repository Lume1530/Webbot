export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'staff';
  isApproved: boolean;
  totalViews: number;
  totalReels: number;
  payoutAmount: number;
  createdAt: Date;
  lastLogin: Date;
  instagramAccounts: string[];
  paymentMethods: {
    usdt?: string;
    paypal?: string;
    upi?: string;
    telegram?: string;
  };
}

export interface Campaign {
  id: string;
  name: string;
  pay_rate: number;
  total_budget: number;
  description?: string;
  requirements?: string;
  platform: string;
  created_at: Date;
  status: 'active' | 'payment_processing' | 'budget_ended' | 'maintenance' | 'coming_soon';
}

export interface CampaignAssignment {
  id: string;
  user_id: string;
  campaign_id: string;
  assigned_at: Date;
  status: 'active' | 'completed' | 'cancelled';
  campaign?: Campaign;
}

export interface Reel {
  id: string;
  userId: string;
  shortcode: string;
  url: string;
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
  submittedAt: Date;
  lastUpdated: Date;
  isActive: boolean;
  campaign_id?: string;
  campaign?: Campaign;
  viewHistory: ViewSnapshot[];
}

export interface ViewSnapshot {
  timestamp: Date;
  views: number;
  likes: number;
  comments: number;
  source: 'auto' | 'manual' | 'api';
}

export interface TrackingSession {
  id: string;
  userId: string;
  reelIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  totalUpdated: number;
  errors: string[];
}

export interface AnalyticsData {
  totalViews: number;
  totalReels: number;
  totalUsers: number;
  viewGrowth: number;
  topPerformingReel: Reel | null;
  recentActivity: Reel[];
  dailyStats: {
    date: string;
    views: number;
    reels: number;
  }[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}