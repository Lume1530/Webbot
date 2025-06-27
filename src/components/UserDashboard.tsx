import React, { useState, useEffect } from 'react';
import { Plus, Eye, TrendingUp, DollarSign, Settings, Upload, Trash2, Bug } from 'lucide-react';
import { User, Reel } from '../types';
import { trackingService } from '../services/trackingService';
import { validateInstagramUrl, formatViews, formatCurrency } from '../utils/instagram';
import { trackReelViewWithRapidAPI, fetchInstagramStatsWithRapidAPI, testInstagramAPI, fetchInstagramReelStatsFrontend } from '../utils/rapidapi';
import { SubmissionForm } from './SubmissionForm';

interface UserDashboardProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
}

export function UserDashboard({ user, onUpdateUser }: UserDashboardProps) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reels' | 'submit' | 'profile'>('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLikes, setSubmitLikes] = useState('');
  const [submitComments, setSubmitComments] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadReels();
  }, [user.id]);

  const loadReels = () => {
    const userReels = trackingService.getReelsByUser(user.id);
    setReels(userReels);
  };

  const handleSingleReelSubmit = async (url: string) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      // Fetch real stats from frontend RapidAPI call
      const stats = await fetchInstagramReelStatsFrontend(url);
      // Save to trackingService
      const result = await trackingService.submitReelWithStats(url, user.id, stats);
      if (result.success) {
        loadReels();
        const userStats = trackingService.getUserStats(user.id);
        onUpdateUser(userStats);
      } else {
        setSubmitError(result.error || 'Failed to submit reel');
      }
    } catch (error) {
      setSubmitError('An error occurred while submitting the reel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkReelSubmit = async (urls: string[]) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      for (const url of urls) {
        try {
          const stats = await fetchInstagramReelStatsFrontend(url);
          await trackingService.submitReelWithStats(url, user.id, stats);
        } catch (e) {
          // Ignore individual errors for bulk
        }
      }
      loadReels();
      const userStats = trackingService.getUserStats(user.id);
      onUpdateUser(userStats);
    } catch (error) {
      setSubmitError('An error occurred while submitting the reels');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReel = (reelId: string) => {
    if (confirm('Are you sure you want to delete this reel?')) {
      trackingService.deleteReel(reelId);
      loadReels();
      
      // Update user stats
      const stats = trackingService.getUserStats(user.id);
      onUpdateUser(stats);
    }
  };

  const handleTestAPI = async () => {
    if (!testUrl.trim()) {
      alert('Please enter a URL to test');
      return;
    }
    try {
      setTestResult('Testing...');
      // Use the new frontend fetch function for quick test
      const result = await fetchInstagramReelStatsFrontend(testUrl);
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const stats = trackingService.getUserStats(user.id);

  if (!user.isApproved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-600 mb-6">
              Your account is currently under review. You'll be able to submit reels once an admin approves your account.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Username:</strong> {user.username}<br />
                <strong>Email:</strong> {user.email}<br />
                <strong>Registered:</strong> {user.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user.username}!</h1>
              <p className="text-white/80">Track your Instagram reel performance</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-white/80">Total Views</div>
                <div className="text-xl font-bold">{formatViews(stats.totalViews)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/80">Estimated Payout</div>
                <div className="text-xl font-bold">{formatCurrency(stats.payoutAmount)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'reels', label: `Reels (${stats.totalReels})`, icon: Eye },
                { id: 'submit', label: 'Submit Reel', icon: Plus },
                { id: 'profile', label: 'Profile', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900">{formatViews(stats.totalViews)}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Reels</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalReels}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Reels</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeReels}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Estimated Payout</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.payoutAmount)}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Reels */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reels</h3>
              {reels.length > 0 ? (
                <div className="space-y-4">
                  {reels.slice(0, 5).map(reel => (
                    <div key={reel.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img src={reel.thumbnail} alt="" className="h-12 w-12 rounded-lg" />
                        <div>
                          <p className="font-medium text-gray-900">@{reel.username}</p>
                          <p className="text-sm text-gray-600">{reel.shortcode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatViews(reel.views)} views</p>
                        <p className="text-sm text-gray-600">
                          {reel.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No reels submitted yet</p>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    Submit Your First Reel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reels Tab */}
        {activeTab === 'reels' && (
          <div>
            {reels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reels.map(reel => (
                  <div key={reel.id || reel.shortcode || Math.random()} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="relative">
                      <img src={reel.thumbnail || ''} alt="" className="w-full h-48 object-cover" onError={e => { e.currentTarget.src = ''; }} />
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={() => handleDeleteReel(reel.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className={`absolute bottom-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                        reel.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}>
                        {reel.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">@{reel.username || 'unknown'}</h3>
                        <a
                          href={reel.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 text-sm"
                        >
                          View Post
                        </a>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Views</p>
                          <p className="font-bold text-gray-900">{formatViews(reel.views || 0)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Likes</p>
                          <p className="font-bold text-pink-600 text-lg">{reel.likes && reel.likes > 0 ? formatViews(reel.likes) : '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Comments</p>
                          <p className="font-bold text-blue-600 text-lg">{reel.comments && reel.comments > 0 ? formatViews(reel.comments) : '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reels yet</h3>
                <p className="text-gray-600 mb-6">Start by submitting your first Instagram reel</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg"
                >
                  Submit Your First Reel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Submit Instagram Reel</h2>
              <SubmissionForm
                onSubmit={handleSingleReelSubmit}
                onBulkSubmit={handleBulkReelSubmit}
                isLoading={isSubmitting}
                error={submitError}
              />
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Paste your Instagram reel URL above</li>
                  <li>• We'll automatically fetch the current view count</li>
                  <li>• Your reel will be tracked for view updates every 5 minutes</li>
                  <li>• View your analytics in the Dashboard and Reels tabs</li>
                </ul>
              </div>
            </div>

            {/* Debug/Test Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Bug className="h-5 w-5 mr-2" />
                Debug API Test
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Instagram URL</label>
                  <input
                    type="url"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleTestAPI}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Test API Response
                </button>
                
                {testResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">API Test Result:</h3>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-64">
                      {typeof testResult === 'string' 
                        ? testResult 
                        : JSON.stringify(testResult, null, 2)
                      }
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Settings</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      value={user.username}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    user.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.isApproved ? 'Approved' : 'Pending Approval'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                  <p className="text-gray-900">{user.createdAt.toLocaleDateString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Login</label>
                  <p className="text-gray-900">{user.lastLogin.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}