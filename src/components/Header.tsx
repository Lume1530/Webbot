import React from 'react';
import { User, BarChart3, Settings, RefreshCw } from 'lucide-react';
import { User as UserType } from '../types';
import { formatCurrency } from '../utils/instagram';

interface HeaderProps {
  user: UserType;
  onForceUpdate: () => void;
  isUpdating: boolean;
}

export function Header({ user, onForceUpdate, isUpdating }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Instagram Reel Tracker</h1>
              <p className="text-white/80">Track your content performance</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-white/80">Total Views</div>
              <div className="text-xl font-bold">{user.totalViews.toLocaleString()}</div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-white/80">Estimated Payout</div>
              <div className="text-xl font-bold">{formatCurrency(user.payoutAmount)}</div>
            </div>

            <button
              onClick={onForceUpdate}
              disabled={isUpdating}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Updating...' : 'Force Update'}</span>
            </button>

            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <User className="h-5 w-5" />
              <span className="font-medium">@{user.username}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}