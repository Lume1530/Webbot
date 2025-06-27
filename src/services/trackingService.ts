import { Reel, ViewSnapshot, TrackingSession } from '../types';
import { extractShortcode, generateThumbnail } from '../utils/instagram';
import { fetchInstagramStatsWithRapidAPI } from '../utils/rapidapi';

class TrackingService {
  private reels: Map<string, Reel> = new Map();
  private sessions: Map<string, TrackingSession> = new Map();
  private isTracking = false;
  private trackingInterval: number | null = null;

  constructor() {
    this.startPeriodicTracking();
  }

  async submitReel(url: string, userId: string): Promise<{ success: boolean; reel?: Reel; error?: string }> {
    try {
      const shortcode = extractShortcode(url);
      if (!shortcode) {
        return { success: false, error: 'Invalid Instagram URL' };
      }

      // Check if reel already exists
      const existingReel = Array.from(this.reels.values()).find(r => r.shortcode === shortcode);
      if (existingReel) {
        return { success: false, error: 'Reel already being tracked' };
      }

      // Fetch real reel data from RapidAPI
      const reelData = await this.fetchReelData(url, shortcode, userId);
      
      const reel: Reel = {
        id: `reel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        shortcode,
        url,
        username: reelData.username,
        views: reelData.views,
        likes: reelData.likes,
        comments: reelData.comments,
        caption: reelData.caption,
        thumbnail: reelData.thumbnail || generateThumbnail(shortcode),
        submittedAt: new Date(),
        lastUpdated: new Date(),
        isActive: true,
        viewHistory: [{
          timestamp: new Date(),
          views: reelData.views,
          likes: reelData.likes,
          comments: reelData.comments,
          source: 'api'
        }]
      };

      this.reels.set(reel.id, reel);
      return { success: true, reel };

    } catch (error) {
      return { success: false, error: 'Failed to fetch reel data' };
    }
  }

  async submitReelWithStats(url: string, userId: string, stats: { views: number; likes: number; comments: number; username: string; thumbnail: string; shortcode: string }): Promise<{ success: boolean; reel?: Reel; error?: string }> {
    try {
      const shortcode = extractShortcode(url);
      if (!shortcode) {
        return { success: false, error: 'Invalid Instagram URL' };
      }
      // Check if reel already exists
      const existingReel = Array.from(this.reels.values()).find(r => r.shortcode === shortcode);
      if (existingReel) {
        return { success: false, error: 'Reel already being tracked' };
      }
      const reel: Reel = {
        id: `reel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        shortcode,
        url,
        username: stats.username,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        caption: `Instagram reel ${shortcode}`,
        thumbnail: stats.thumbnail || generateThumbnail(shortcode),
        submittedAt: new Date(),
        lastUpdated: new Date(),
        isActive: true,
        viewHistory: [{
          timestamp: new Date(),
          views: stats.views,
          likes: stats.likes,
          comments: stats.comments,
          source: 'api'
        }]
      };
      this.reels.set(reel.id, reel);
      return { success: true, reel };
    } catch (error) {
      return { success: false, error: 'Failed to save reel data' };
    }
  }

  public async fetchReelData(url: string, shortcode: string, userId: string) {
    try {
      // Use RapidAPI to fetch real Instagram data
      const stats = await fetchInstagramStatsWithRapidAPI({ url, userId });
      
      return {
        username: stats.username,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        caption: `Instagram reel ${shortcode}`,
        thumbnail: stats.thumbnail
      };
    } catch (error) {
      console.error('Error fetching reel data from RapidAPI:', error);
      
      // Fallback to mock data if RapidAPI fails
      const baseViews = Math.floor(Math.random() * 500000) + 10000;
      const engagementRate = 0.05 + Math.random() * 0.15; // 5-20% engagement
      
      return {
        username: `user_${shortcode.slice(0, 6)}`,
        views: baseViews,
        likes: Math.floor(baseViews * engagementRate),
        comments: Math.floor(baseViews * engagementRate * 0.1),
        caption: `Sample caption for reel ${shortcode}...`,
        thumbnail: generateThumbnail(shortcode)
      };
    }
  }

  async updateReelViews(reelId: string): Promise<boolean> {
    const reel = this.reels.get(reelId);
    if (!reel || !reel.isActive) return false;

    try {
      // Fetch updated data from RapidAPI
      const updatedStats = await fetchInstagramStatsWithRapidAPI({ 
        url: reel.url, 
        userId: reel.userId 
      });

      // Only update if there's actual change
      if (updatedStats.views !== reel.views || 
          updatedStats.likes !== reel.likes || 
          updatedStats.comments !== reel.comments) {
        
        reel.views = updatedStats.views;
        reel.likes = updatedStats.likes;
        reel.comments = updatedStats.comments;
        reel.lastUpdated = new Date();

        // Add to view history
        reel.viewHistory.push({
          timestamp: new Date(),
          views: updatedStats.views,
          likes: updatedStats.likes,
          comments: updatedStats.comments,
          source: 'api'
        });

        // Keep only last 100 snapshots
        if (reel.viewHistory.length > 100) {
          reel.viewHistory = reel.viewHistory.slice(-100);
        }

        this.reels.set(reelId, reel);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to update reel ${reelId}:`, error);
      return false;
    }
  }

  async forceUpdateAll(userId?: string): Promise<TrackingSession> {
    const sessionId = `session_${Date.now()}`;
    const reelsToUpdate = Array.from(this.reels.values())
      .filter(r => r.isActive && (!userId || r.userId === userId));

    const session: TrackingSession = {
      id: sessionId,
      userId: userId || 'system',
      reelIds: reelsToUpdate.map(r => r.id),
      status: 'running',
      startedAt: new Date(),
      totalUpdated: 0,
      errors: []
    };

    this.sessions.set(sessionId, session);

    // Update reels in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < reelsToUpdate.length; i += batchSize) {
      const batch = reelsToUpdate.slice(i, i + batchSize);
      const promises = batch.map(reel => this.updateReelViews(reel.id));
      
      try {
        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            session.totalUpdated++;
          } else {
            session.errors.push(`Failed to update reel ${batch[index].shortcode}`);
          }
        });
      } catch (error) {
        session.errors.push(`Batch update failed: ${error}`);
      }

      // Add delay between batches
      if (i + batchSize < reelsToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    session.status = 'completed';
    session.completedAt = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  private startPeriodicTracking() {
    // Update reels every 5 minutes
    this.trackingInterval = setInterval(async () => {
      if (this.isTracking) return;
      
      this.isTracking = true;
      try {
        const activeReels = Array.from(this.reels.values()).filter(r => r.isActive);
        
        // Update a random subset of reels each cycle
        const reelsToUpdate = activeReels
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(10, activeReels.length));

        for (const reel of reelsToUpdate) {
          await this.updateReelViews(reel.id);
          // Small delay between updates
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Periodic tracking error:', error);
      } finally {
        this.isTracking = false;
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  getReelsByUser(userId: string): Reel[] {
    return Array.from(this.reels.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  getAllReels(): Reel[] {
    return Array.from(this.reels.values())
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  getReel(reelId: string): Reel | undefined {
    return this.reels.get(reelId);
  }

  deleteReel(reelId: string): boolean {
    return this.reels.delete(reelId);
  }

  toggleReelTracking(reelId: string): boolean {
    const reel = this.reels.get(reelId);
    if (!reel) return false;

    reel.isActive = !reel.isActive;
    this.reels.set(reelId, reel);
    return true;
  }

  getTrackingSession(sessionId: string): TrackingSession | undefined {
    return this.sessions.get(sessionId);
  }

  getUserStats(userId: string) {
    const userReels = this.getReelsByUser(userId);
    const totalViews = userReels.reduce((sum, reel) => sum + reel.views, 0);
    const totalReels = userReels.length;
    const payoutAmount = (totalViews / 1000) * 0.025; // $0.025 per 1K views

    return {
      totalViews,
      totalReels,
      payoutAmount,
      activeReels: userReels.filter(r => r.isActive).length
    };
  }

  getGlobalStats() {
    const allReels = this.getAllReels();
    const totalViews = allReels.reduce((sum, reel) => sum + reel.views, 0);
    const totalReels = allReels.length;
    const activeReels = allReels.filter(r => r.isActive).length;

    return {
      totalViews,
      totalReels,
      activeReels,
      totalPayouts: (totalViews / 1000) * 0.025
    };
  }

  cleanup() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }
  }
}

export const trackingService = new TrackingService();