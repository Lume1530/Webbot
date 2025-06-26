import React from 'react';
import { TrendingUp, Eye, Video, DollarSign, Clock } from 'lucide-react';
import { AnalyticsData } from '../types';
import { formatViews, formatCurrency } from '../utils/instagram';

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <TrendingUp className={`h-4 w-4 ${getGrowthColor(analytics.viewGrowth)} mr-1`} />
            <span className={`text-sm font-medium ${getGrowthColor(analytics.viewGrowth)}`}>
              {formatGrowth(analytics.viewGrowth)}
            </span>
            <span className="text-sm text-gray-500 ml-1">from yesterday</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reels</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalReels}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">Actively tracking</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimated Payout</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency((analytics.totalViews / 1000) * 0.025)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">$0.025 per 1K views</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Views per Reel</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalReels > 0 ? formatViews(Math.floor(analytics.totalViews / analytics.totalReels)) : '0'}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">Performance metric</span>
          </div>
        </div>
      </div>

      {/* Top Performing Reel */}
      {analytics.topPerformingReel && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Reel</h3>
          <div className="flex items-center space-x-4">
            <img
              src={analytics.topPerformingReel.thumbnail}
              alt="Top performing reel"
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">@{analytics.topPerformingReel.username}</p>
              <p className="text-sm text-gray-600 truncate">{analytics.topPerformingReel.caption}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">
                {formatViews(analytics.topPerformingReel.views)}
              </p>
              <p className="text-sm text-gray-500">views</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {analytics.recentActivity.length > 0 ? (
            analytics.recentActivity.map((reel) => (
              <div key={reel.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <img
                    src={reel.thumbnail}
                    alt={`Reel ${reel.shortcode}`}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-900">@{reel.username}</p>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>Updated {new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
                        Math.floor((reel.lastUpdated.getTime() - Date.now()) / (1000 * 60)), 'minute'
                      )}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatViews(reel.views)}</p>
                  <p className="text-xs text-gray-500">views</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}