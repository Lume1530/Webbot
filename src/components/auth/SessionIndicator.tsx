import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface SessionIndicatorProps {
  onSessionExpired?: () => void;
}

export const SessionIndicator: React.FC<SessionIndicatorProps> = ({ onSessionExpired }) => {
  const [sessionStatus, setSessionStatus] = useState(authService.getSessionStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Update session status every minute
    const interval = setInterval(() => {
      const status = authService.getSessionStatus();
      setSessionStatus(status);
      
      // If session expired, notify parent component
      if (status.isExpired && onSessionExpired) {
        onSessionExpired();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [onSessionExpired]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (!sessionStatus.isLoggedIn) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
      >
        {sessionStatus.isExpired ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
        <span className="text-gray-700">
          {sessionStatus.isExpired ? 'Session Expired' : 'Session Active'}
        </span>
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64 z-50">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-900">Session Status</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={sessionStatus.isExpired ? 'text-red-600' : 'text-green-600'}>
                {sessionStatus.isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
            
            {sessionStatus.expiresIn !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Expires in:</span>
                <span className="text-gray-900">
                  {sessionStatus.isExpired ? 'Expired' : formatTime(sessionStatus.expiresIn)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">User:</span>
              <span className="text-gray-900 font-medium">
                {authService.getCurrentUser()?.username}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                authService.logout();
                if (onSessionExpired) onSessionExpired();
              }}
              className="w-full px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 