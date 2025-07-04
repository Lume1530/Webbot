const API_BASE_URL = '/api';

export interface InstagramAccount {
  id: number;
  user_id: number;
  username: string;
  is_approved: boolean | null;
  is_active: boolean;
  submitted_at: string;
  approved_at?: string;
  approved_by?: number;
  rejection_reason?: string;
}

export interface PendingAccount extends InstagramAccount {
  user_username: string;
  user_email: string;
}

class AccountService {
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

  async addAccount(username: string): Promise<{ success: boolean; account?: InstagramAccount; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to add account' };
      }

      return { success: true, account: data.account };
    } catch (error) {
      console.error('Add account error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async removeAccount(accountId: number, isAdmin: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      const url = isAdmin
        ? `${API_BASE_URL}/admin/accounts/${accountId}`
        : `${API_BASE_URL}/accounts/${accountId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      // Try to parse JSON, but handle empty response
      let data: any = {};
      try { data = await response.json(); } catch {}

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to remove account' };
      }

      return { success: true };
    } catch (error) {
      console.error('Remove account error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async getAccounts(): Promise<InstagramAccount[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      return await response.json();
    } catch (error) {
      console.error('Get accounts error:', error);
      return [];
    }
  }

  async getPendingAccounts(): Promise<PendingAccount[]> {
    try {
      console.log('accountService: Fetching pending accounts...');
      const response = await fetch(`${API_BASE_URL}/admin/accounts/pending`, {
        headers: this.getAuthHeaders(),
      });

      console.log('accountService: Response status:', response.status);
      console.log('accountService: Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('accountService: Response not ok:', errorText);
        throw new Error('Failed to fetch pending accounts');
      }

      const data = await response.json();
      console.log('accountService: Pending accounts data:', data);
      return data;
    } catch (error) {
      console.error('accountService: Get pending accounts error:', error);
      return [];
    }
  }

  async approveAccount(accountId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/accounts/${accountId}/approve`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to approve account' };
      }

      return { success: true };
    } catch (error) {
      console.error('Approve account error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async rejectAccount(accountId: number, rejectionReason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/accounts/${accountId}/reject`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ rejectionReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reject account' };
      }

      return { success: true };
    } catch (error) {
      console.error('Reject account error:', error);
      return { success: false, error: 'Network error' };
    }
  }
}

export const accountService = new AccountService(); 