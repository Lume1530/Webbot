import { useState, useEffect, useCallback } from 'react';
import { Reel, User, AnalyticsData } from '../types';
import { validateInstagramUrl, extractShortcode, generateThumbnail, calculatePayout } from '../utils/instagram';
import { useLocalStorage } from './useLocalStorage';

export function useReelTracker() {
  const [reels, setReels] = useLocalStorage<Reel[]>('reels', []);
  const [user, setUser] = useLocalStorage<User>('user', {
    id: '1',
    username: 'creator',
    email: '',
    totalViews: 0,
    totalReels: 0,
    payoutAmount: 0,
    linkedAccounts: [],
    paymentMethods: {},
    approved: true,
    createdAt: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate view tracking updates
  useEffect(() => {
    const interval = setInterval(() => {
      setReels(currentReels => {
        const shouldUpdate = Math.random() > 0.7; // 30% chance to update
        if (!shouldUpdate || currentReels.length === 0) return currentReels;

        return currentReels.map(reel => {
          // Randomly select some reels to update
          if (Math.random() > 0.8) return reel;

          const viewGrowth = Math.floor(Math.random() * 1000) + 100;
          const likeGrowth = Math.floor(Math.random() * 50) + 10;
          const commentGrowth = Math.floor(Math.random() * 20) + 1;

          const newViews = reel.views + viewGrowth;
          const newLikes = reel.likes + likeGrowth;
          const newComments = reel.comments + commentGrowth;

          return {
            ...reel,
            views: newViews,
            likes: newLikes,
            comments: newComments,
            lastUpdated: new Date(),
            viewHistory: [
              ...reel.viewHistory,
              {
                timestamp: new Date(),
                views: newViews,
                likes: newLikes,
                comments: newComments
              }
            ].slice(-24) // Keep last 24 snapshots
          };
        });
      });
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, [setReels]);

  // Update user stats when reels change
  useEffect(() => {
    const totalViews = reels.reduce((sum, reel) => sum + reel.views, 0);
    const totalReels = reels.length;
    const payoutAmount = calculatePayout(totalViews);

    setUser(prev => ({
      ...prev,
      totalViews,
      totalReels,
      payoutAmount
    }));
  }, [reels, setUser]);

  const submitReel = useCallback(async (url: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!validateInstagramUrl(url)) {
        throw new Error('Invalid Instagram URL format');
      }

      const shortcode = extractShortcode(url);
      if (!shortcode) {
        throw new Error('Could not extract reel ID from URL');
      }

      // Check for duplicates
      if (reels.some(reel => reel.shortcode === shortcode)) {
        throw new Error('This reel has already been submitted');
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate reel data fetching
      const mockViews = Math.floor(Math.random() * 500000) + 1000;
      const mockLikes = Math.floor(mockViews * 0.1);
      const mockComments = Math.floor(mockViews * 0.02);

      const newReel: Reel = {
        id: `reel_${Date.now()}`,
        shortcode,
        url,
        username: `user_${shortcode.slice(0, 6)}`,
        views: mockViews,
        likes: mockLikes,
        comments: mockComments,
        caption: 'Sample Instagram reel caption...',
        thumbnail: generateThumbnail(shortcode),
        submittedAt: new Date(),
        lastUpdated: new Date(),
        viewHistory: [{
          timestamp: new Date(),
          views: mockViews,
          likes: mockLikes,
          comments: mockComments
        }]
      };

      setReels(prev => [newReel, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reel');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [reels, setReels]);

  const bulkSubmitReels = useCallback(async (urls: string[]): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const validUrls = urls.filter(url => validateInstagramUrl(url));
      if (validUrls.length === 0) {
        throw new Error('No valid Instagram URLs found');
      }

      // Process in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < validUrls.length; i += batchSize) {
        const batch = validUrls.slice(i, i + batchSize);
        await Promise.all(batch.map(url => submitReel(url).catch(() => {})));
        
        // Add delay between batches
        if (i + batchSize < validUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reels');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [submitReel]);

  const deleteReel = useCallback((reelId: string) => {
    setReels(prev => prev.filter(reel => reel.id !== reelId));
  }, [setReels]);

  const getAnalytics = useCallback((): AnalyticsData => {
    const totalViews = reels.reduce((sum, reel) => sum + reel.views, 0);
    const totalReels = reels.length;
    
    // Calculate view growth (comparing last 24h vs previous 24h)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    let recentViews = 0;
    let previousViews = 0;

    reels.forEach(reel => {
      reel.viewHistory.forEach(snapshot => {
        if (snapshot.timestamp >= oneDayAgo) {
          recentViews += snapshot.views;
        } else if (snapshot.timestamp >= twoDaysAgo) {
          previousViews += snapshot.views;
        }
      });
    });

    const viewGrowth = previousViews > 0 ? ((recentViews - previousViews) / previousViews) * 100 : 0;
    const topPerformingReel = reels.sort((a, b) => b.views - a.views)[0] || null;
    const recentActivity = reels
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, 5);

    return {
      totalViews,
      totalReels,
      viewGrowth,
      topPerformingReel,
      recentActivity
    };
  }, [reels]);

  const forceUpdate = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate force update API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setReels(currentReels => 
        currentReels.map(reel => {
          const viewBoost = Math.floor(Math.random() * 5000) + 1000;
          const newViews = reel.views + viewBoost;
          const newLikes = reel.likes + Math.floor(viewBoost * 0.1);
          const newComments = reel.comments + Math.floor(viewBoost * 0.02);

          return {
            ...reel,
            views: newViews,
            likes: newLikes,
            comments: newComments,
            lastUpdated: new Date(),
            viewHistory: [
              ...reel.viewHistory,
              {
                timestamp: new Date(),
                views: newViews,
                likes: newLikes,
                comments: newComments
              }
            ].slice(-24)
          };
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [setReels]);

  return {
    reels,
    user,
    setUser,
    isLoading,
    error,
    submitReel,
    bulkSubmitReels,
    deleteReel,
    getAnalytics,
    forceUpdate,
    clearError: () => setError(null)
  };
}