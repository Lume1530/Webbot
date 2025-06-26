import React from 'react';
import { Eye, Heart, MessageCircle, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { Reel } from '../types';
import { formatViews } from '../utils/instagram';

interface ReelCardProps {
  reel: Reel;
  onDelete: (reelId: string) => void;
}

export function ReelCard({ reel, onDelete }: ReelCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getViewGrowth = () => {
    if (reel.viewHistory.length < 2) return 0;
    const current = reel.viewHistory[reel.viewHistory.length - 1];
    const previous = reel.viewHistory[reel.viewHistory.length - 2];
    return current.views - previous.views;
  };

  const viewGrowth = getViewGrowth();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="relative">
        <img
          src={reel.thumbnail}
          alt={`Reel ${reel.shortcode}`}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 right-3">
          <button
            onClick={() => onDelete(reel.id)}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
            title="Delete reel"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {viewGrowth > 0 && (
          <div className="absolute bottom-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <TrendingUp className="h-3 w-3" />
            <span>+{formatViews(viewGrowth)}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 truncate">@{reel.username}</h3>
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            View Post
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs">Views</span>
            </div>
            <div className="font-bold text-lg text-gray-900">{formatViews(reel.views)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
              <Heart className="h-4 w-4" />
              <span className="text-xs">Likes</span>
            </div>
            <div className="font-bold text-lg text-gray-900">{formatViews(reel.likes)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">Comments</span>
            </div>
            <div className="font-bold text-lg text-gray-900">{formatViews(reel.comments)}</div>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Added {formatDate(reel.submittedAt)}</span>
            </div>
            <div className="text-xs">
              Updated {formatDate(reel.lastUpdated)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}