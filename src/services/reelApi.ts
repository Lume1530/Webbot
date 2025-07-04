import { Reel } from '../types';

const API_BASE_URL = '/api';

class ReelApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async submitReel(reelData: {
    url: string;
    shortcode: string;
    username: string;
    views: number;
    likes: number;
    comments: number;
    thumbnail: string;
    isActive: boolean;
    campaign_id?: string;
  }): Promise<{ success: boolean; reel?: Reel; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reels`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(reelData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to submit reel' };
      }

      return { success: true, reel: data };
    } catch (error) {
      console.error('Submit reel error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async getReels(): Promise<Reel[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/reels`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reels');
      }

      return await response.json();
    } catch (error) {
      console.error('Get reels error:', error);
      return [];
    }
  }

  async updateReel(reelId: string, updates: Partial<Reel>): Promise<{ success: boolean; reel?: Reel; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reels/${reelId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update reel' };
      }

      return { success: true, reel: data };
    } catch (error) {
      console.error('Update reel error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async deleteReel(reelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reels/${reelId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to delete reel' };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete reel error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async getTotalViews(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/reels/total-views`, {
        headers: this.getAuthHeaders(),
      });
      const data = await response.json();
      return data.totalViews;
    } catch (error) {
      console.error('Get total views error:', error);
      return 0;
    }
  }
}

export const reelApiService = new ReelApiService(); 