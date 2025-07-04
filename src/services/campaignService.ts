import { Campaign, CampaignAssignment } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

export const campaignService = {
  // Get all available campaigns (not yet joined by user)
  async getAvailableCampaigns(): Promise<Campaign[]> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/campaigns/available`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch available campaigns');
    }
    
    return response.json();
  },

  // Get user's assigned campaigns
  async getUserCampaigns(): Promise<CampaignAssignment[]> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/user/campaigns`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user campaigns');
    }
    
    return response.json();
  },

  // Join a campaign
  async joinCampaign(campaignId: string): Promise<{ message: string; assignment: CampaignAssignment; campaign: Campaign }> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join campaign');
    }
    
    return response.json();
  },

  // Get all campaigns (public)
  async getAllCampaigns(): Promise<Campaign[]> {
    const response = await fetch(`${API_BASE_URL}/campaigns`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }
    
    return response.json();
  }
}; 