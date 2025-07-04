import { User } from '../types';

const API_BASE_URL = '/api';

class AuthService {
  private currentUser: User | null = null;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    // Load token and user from localStorage on initialization
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.tokenExpiry = localStorage.getItem('tokenExpiry') ? parseInt(localStorage.getItem('tokenExpiry')!) : null;
    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }

    // Check if token is expired on initialization
    if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
      this.logout();
    }
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Check if token is expired
  private isTokenExpired(): boolean {
    return this.tokenExpiry ? Date.now() > this.tokenExpiry : true;
  }

  // Refresh the access token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        this.refreshToken = data.refreshToken || null;
        this.tokenExpiry = Date.now() + ((data.expiresIn || 3600) * 1000); // Convert seconds to milliseconds
        
        // Update localStorage
        if (this.token) {
          localStorage.setItem('token', this.token);
        }
        if (this.refreshToken) {
          localStorage.setItem('refreshToken', this.refreshToken);
        }
        if (this.tokenExpiry) {
          localStorage.setItem('tokenExpiry', this.tokenExpiry.toString());
        }
        
        return true;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
    
    return false;
  }

  // Enhanced request method with automatic token refresh
  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Check if token is expired and try to refresh
    if (this.isTokenExpired() && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        this.logout();
        throw new Error('Authentication failed');
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: this.getAuthHeaders(),
    });

    // If token is invalid, try to refresh once
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        return fetch(url, {
          ...options,
          headers: this.getAuthHeaders(),
        });
      } else {
        this.logout();
        throw new Error('Authentication failed');
      }
    }

    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store token and user
      this.token = data.token;
      this.refreshToken = data.refreshToken || null;
      this.tokenExpiry = data.expiresIn ? Date.now() + (data.expiresIn * 1000) : Date.now() + (24 * 60 * 60 * 1000); // Default 24 hours
      this.currentUser = data.user;
      
      // Store in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      if (this.refreshToken) {
        localStorage.setItem('refreshToken', this.refreshToken);
      }
      if (this.tokenExpiry) {
        localStorage.setItem('tokenExpiry', this.tokenExpiry.toString());
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getToken(): string | null {
    return this.token;
  }

  logout(): void {
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
  }

  async getAllUsers(): Promise<User[]> {
    try {
      console.log('authService: Fetching all users...');
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/admin/users`);

      console.log('authService: Get users response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('authService: Get users response not ok:', errorText);
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      console.log('authService: Users data received:', data.length, 'users');
      console.log('authService: Users data:', data.map((u: any) => ({ id: u.id, username: u.username, isApproved: u.is_approved })));
      return data.map((u: any) => ({
        ...u,
        isApproved: u.is_approved,
        createdAt: u.created_at ? new Date(u.created_at) : null,
      }));
    } catch (error) {
      console.error('authService: Get users error:', error);
      return [];
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        return false;
      }

      // Update current user if it's the same
      if (this.currentUser?.id === userId) {
        this.currentUser = { ...this.currentUser, ...updates };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      }

      return true;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  }

  async approveUser(userId: string): Promise<boolean> {
    try {
      console.log('authService: Approving user:', userId);
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      console.log('authService: Approve response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('authService: Approve response not ok:', errorText);
      }

      return response.ok;
    } catch (error) {
      console.error('authService: Approve user error:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }

  // Check if token is still valid
  async validateToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    // Check if token is expired
    if (this.isTokenExpired()) {
      // Try to refresh the token
      if (this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return true;
        }
      }
      // If refresh failed, logout
      this.logout();
      return false;
    }

    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/reels`);

      if (response.status === 401) {
        // Token is invalid, clear it
        this.logout();
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      // On network error, assume token is invalid
      this.logout();
      return false;
    }
  }

  // Get session status for UI feedback
  getSessionStatus(): { isLoggedIn: boolean; expiresIn?: number; isExpired: boolean } {
    if (!this.token || !this.currentUser) {
      return { isLoggedIn: false, isExpired: false };
    }

    const isExpired = this.isTokenExpired();
    const expiresIn = this.tokenExpiry ? Math.max(0, this.tokenExpiry - Date.now()) : undefined;

    return {
      isLoggedIn: true,
      expiresIn,
      isExpired
    };
  }

  async getPaymentMethods(): Promise<{ usdt?: string; upi?: string; paypal?: string; telegram?: string }> {
    try {
      const response = await fetch('/api/user/payment', {
        headers: this.getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      console.error('Get payment methods error:', error);
      return {};
    }
  }

  async updatePaymentMethods(data: { usdt?: string; upi?: string; paypal?: string; telegram?: string }): Promise<boolean> {
    try {
      const response = await fetch('/api/user/payment', {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch (error) {
      console.error('Update payment methods error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();