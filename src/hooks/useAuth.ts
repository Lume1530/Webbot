import { useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { authService } from '../services/authService';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    const user = authService.getCurrentUser();
    setAuthState({
      user,
      isAuthenticated: !!user,
      isLoading: false
    });
  }, []);

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    const result = await authService.login(username, password);
    
    if (result.success && result.user) {
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
    
    return result;
  };

  const register = async (userData: { username: string; email: string; password: string }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    const result = await authService.register(userData);
    
    setAuthState(prev => ({ ...prev, isLoading: false }));
    return result;
  };

  const logout = () => {
    authService.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  const updateUser = (updates: Partial<User>) => {
    if (!authState.user) return false;
    
    const success = authService.updateUser(authState.user.id, updates);
    if (success) {
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...updates } : null
      }));
    }
    return success;
  };

  return {
    ...authState,
    login,
    register,
    logout,
    updateUser
  };
}