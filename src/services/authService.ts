import { User } from '../types';

class AuthService {
  private users: User[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      isApproved: true,
      totalViews: 0,
      totalReels: 0,
      payoutAmount: 0,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
      instagramAccounts: [],
      paymentMethods: {}
    }
  ];

  private currentUser: User | null = null;

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo credentials
    if (username === 'admin' && password === 'admin123') {
      this.currentUser = this.users[0];
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    }

    if (username === 'user' && password === 'user123') {
      const user: User = {
        id: '2',
        username: 'user',
        email: 'user@example.com',
        role: 'user',
        isApproved: true,
        totalViews: 0,
        totalReels: 0,
        payoutAmount: 0,
        createdAt: new Date('2024-01-15'),
        lastLogin: new Date(),
        instagramAccounts: [],
        paymentMethods: {}
      };
      this.currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return { success: true, user };
    }

    return { success: false, error: 'Invalid credentials' };
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if user exists
    if (this.users.find(u => u.username === userData.username || u.email === userData.email)) {
      return { success: false, error: 'User already exists' };
    }

    const newUser: User = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      role: 'user',
      isApproved: false, // Requires admin approval
      totalViews: 0,
      totalReels: 0,
      payoutAmount: 0,
      createdAt: new Date(),
      lastLogin: new Date(),
      instagramAccounts: [],
      paymentMethods: {}
    };

    this.users.push(newUser);
    return { success: true, user: newUser };
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }
    
    return null;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  getAllUsers(): User[] {
    return this.users;
  }

  updateUser(userId: string, updates: Partial<User>): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;

    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    
    // Update current user if it's the same
    if (this.currentUser?.id === userId) {
      this.currentUser = this.users[userIndex];
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
    
    return true;
  }

  approveUser(userId: string): boolean {
    return this.updateUser(userId, { isApproved: true });
  }

  deleteUser(userId: string): boolean {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
}

export const authService = new AuthService();