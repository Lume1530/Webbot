import React, { useState, useEffect, useRef } from 'react';
import { Plus, Eye, TrendingUp, DollarSign, Settings, Upload, Trash2, Bug, Users, Megaphone, CheckCircle, Instagram, Youtube } from 'lucide-react';
import { reelApiService } from '../../services/reelApi';
import { validateInstagramUrl, formatViews, formatCurrency } from '../../utils/instagram';
import { fetchInstagramReelStatsFrontend } from '../../utils/rapidapi';
import { SubmissionForm } from '../reels/SubmissionForm';
import { AccountManagement } from '../admin/AccountManagement';
import { NotificationCenter } from '../common/NotificationCenter';
import { User, Reel, Campaign, CampaignAssignment } from '../../types';
import { authService } from '../../services/authService';
import { campaignService } from '../../services/campaignService';

interface UserDashboardProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onLogout: () => void;
}

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="currentColor" width={props.width || 20} height={props.height || 20} {...props}>
    <path d="M24.5 10.5c-2.2 0-4-1.8-4-4V4h-4v16.5c0 1.4-1.1 2.5-2.5 2.5S11.5 21.9 11.5 20.5s1.1-2.5 2.5-2.5c.2 0 .4 0 .5.1v-3.1c-.2 0-.4-.1-.5-.1-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5V13c1.3.9 2.9 1.5 4.5 1.5v-4z" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-7 w-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export function UserDashboard(props: UserDashboardProps) {
  const { user, onUpdateUser, onLogout } = props;
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reels' | 'submit' | 'accounts' | 'profile' | 'campaigns'>('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitLikes, setSubmitLikes] = useState('');
  const [submitComments, setSubmitComments] = useState('');
  const [totalViews, setTotalViews] = useState<number>(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userCampaigns, setUserCampaigns] = useState<CampaignAssignment[]>([]);
  const [joiningCampaign, setJoiningCampaign] = useState<string | null>(null);
  const PAYOUT_PER_MILLION = 25; // $25 per 1M views (update this value as needed)
  const [payment, setPayment] = useState({ usdt: '', upi: '', paypal: '', telegram: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [totalPayout, setTotalPayout] = useState(0);
  const [reelsPage, setReelsPage] = useState<{ [campaign: string]: number }>({});
  const REELS_PER_PAGE = 15;

  useEffect(() => {
    loadReels();
    loadTotalViews();
    loadCampaigns();
    // Load payment methods
    authService.getPaymentMethods().then((data) => {
      setPayment({
        usdt: data.usdt || '',
        upi: data.upi || '',
        paypal: data.paypal || '',
        telegram: data.telegram || ''
      });
    });
    if (user) {
      fetchTotalPayout();
    }
    // eslint-disable-next-line
  }, [user.id]);

  const loadReels = async () => {
    try {
      const userReels = await reelApiService.getReels();
      setReels(userReels);
    } catch (e) {
      setReels([]);
    }
  };

  const loadTotalViews = async () => {
    try {
      const views = await reelApiService.getTotalViews();
      setTotalViews(views);
    } catch (e) {
      setTotalViews(0);
    }
  };

  const loadCampaigns = async () => {
    try {
      const [availableCampaigns, assignedCampaigns] = await Promise.all([
        campaignService.getAvailableCampaigns(),
        campaignService.getUserCampaigns()
      ]);
      setCampaigns(availableCampaigns);
      setUserCampaigns(assignedCampaigns);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setCampaigns([]);
      setUserCampaigns([]);
    }
  };

  const handleSingleReelSubmit = async (url: string, campaignId?: string) => {
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    
    try {
      if (!validateInstagramUrl(url)) {
        setSubmitError('Please enter a valid Instagram reel URL');
        return;
      }

      const stats = await fetchInstagramReelStatsFrontend(url);
      if (!stats || typeof stats.views !== 'number' || typeof stats.likes !== 'number') {
        setSubmitError('Failed to fetch reel stats. Please check the URL and try again.');
        return;
      }

      const reelData = {
        url,
        shortcode: stats.shortcode,
        username: stats.username,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        thumbnail: stats.thumbnail,
        isActive: true,
        campaign_id: campaignId
      };

      const result = await reelApiService.submitReel(reelData);
      
      if (!result.success) {
        // Handle specific error messages
        if (result.error?.includes('duplicate') || result.error?.includes('already exists')) {
          setSubmitError('❌ Video already submitted. This reel has already been added to your account.');
        } else if (result.error?.includes('Account does not belong to you') || result.error?.includes('not approved')) {
          setSubmitError('❌ Account does not belong to you. Please add and get approval for this Instagram account first.');
        } else {
          setSubmitError(`❌ ${result.error || 'Failed to submit reel'}`);
        }
        return;
      }
      
      await loadReels();
      await loadTotalViews();
      
      setSubmitSuccess(`✅ Reel submitted successfully! Views: ${(stats.views || 0).toLocaleString()}, Likes: ${(stats.likes || 0).toLocaleString()}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitSuccess(''), 5000);
    } catch (error) {
      console.error('Submit reel error:', error);
      setSubmitError('❌ Failed to submit reel. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkReelSubmit = async (urls: string[], campaignId?: string) => {
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    
    try {
      const results = [];
      for (const url of urls) {
        try {
          if (!validateInstagramUrl(url)) {
            results.push({ url, success: false, error: 'Invalid Instagram URL' });
            continue;
          }

          const stats = await fetchInstagramReelStatsFrontend(url);
          if (!stats || typeof stats.views !== 'number' || typeof stats.likes !== 'number') {
            results.push({ url, success: false, error: 'Failed to fetch reel stats' });
            continue;
          }

          const reelData = {
            url,
            shortcode: stats.shortcode,
            username: stats.username,
            views: stats.views,
            likes: stats.likes,
            comments: stats.comments,
            thumbnail: stats.thumbnail,
            isActive: true,
            campaign_id: campaignId
          };

          const result = await reelApiService.submitReel(reelData);
          
          if (!result.success) {
            // Handle specific error messages for bulk submission
            let errorMessage = result.error || 'Unknown error';
            if (result.error?.includes('duplicate') || result.error?.includes('already exists')) {
              errorMessage = 'Video already submitted';
            } else if (result.error?.includes('Account does not belong to you') || result.error?.includes('not approved')) {
              errorMessage = 'Account does not belong to you';
            }
            results.push({ url, success: false, error: errorMessage });
          } else {
            results.push({ url, success: true });
          }
        } catch (error) {
          results.push({ url, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      await loadReels();
      await loadTotalViews();

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        setSubmitSuccess(`✅ Bulk submission completed! Success: ${successCount}${failureCount > 0 ? `, Failed: ${failureCount}` : ''}`);
        // Clear success message after 5 seconds
        setTimeout(() => setSubmitSuccess(''), 5000);
      }
      
      if (failureCount > 0) {
        // Show detailed error message for bulk failures
        const failedDetails = results.filter(r => !r.success).map(r => `${r.error}`).join(', ');
        setSubmitError(`❌ Some reels failed to submit: ${failedDetails}`);
        
        // Log detailed failures for debugging
        const failedUrls = results.filter(r => !r.success).map(r => `${r.url}: ${r.error}`).join('\n');
        console.error('Failed submissions:', failedUrls);
      }
    } catch (error) {
      console.error('Bulk submit error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit reels');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (confirm('Are you sure you want to delete this reel?')) {
      try {
        const result = await reelApiService.deleteReel(reelId);
        if (result.success) {
          await loadReels();
        }
      } catch (error) {
        console.error('Failed to delete reel:', error);
      }
    }
  };

  const stats = {
    totalViews,
    totalReels: reels.length,
    activeReels: reels.filter(reel => reel.isActive).length,
    payoutAmount: (totalViews / 1_000_000) * PAYOUT_PER_MILLION
  };

  const tabList = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'reels', label: `Reels (${stats.totalReels})`, icon: Eye },
    { id: 'submit', label: 'Submit Reel', icon: Plus },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'profile', label: 'Profile', icon: Settings }
  ];

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayment(p => ({ ...p, [e.target.name]: e.target.value }));
    setPaymentSaved(false);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting payment:', payment); // Debug log
    setSavingPayment(true);
    const ok = await authService.updatePaymentMethods(payment);
    setSavingPayment(false);
    setPaymentSaved(ok);
  };

  const fetchTotalPayout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/payout`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTotalPayout(data.totalPayout || 0);
      }
    } catch (error) {
      console.error('Error fetching total payout:', error);
    }
  };

  const handleJoinCampaign = async (campaignId: string) => {
    setJoiningCampaign(campaignId);
    try {
      const result = await campaignService.joinCampaign(campaignId);
      alert(result.message);
      await loadCampaigns(); // Reload campaigns to update the lists
    } catch (error) {
      console.error('Failed to join campaign:', error);
      alert(error instanceof Error ? error.message : 'Failed to join campaign');
    } finally {
      setJoiningCampaign(null);
    }
  };

  function renderStatusBadge(status: string) {
    let color = '';
    let text = '';
    switch (status) {
      case 'active':
        color = 'bg-green-100 text-green-800 border-green-200';
        text = 'Active';
        break;
      case 'payment_processing':
        color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        text = 'Payment Processing';
        break;
      case 'budget_ended':
        color = 'bg-red-100 text-red-800 border-red-200';
        text = 'Budget Ended';
        break;
      case 'maintenance':
        color = 'bg-blue-100 text-blue-800 border-blue-200';
        text = 'Maintenance';
        break;
      case 'coming_soon':
        color = 'bg-gray-100 text-gray-800 border-gray-200';
        text = 'Coming Soon';
        break;
      case '':
      case null:
      case undefined:
      case 'unknown':
        color = 'bg-green-100 text-green-800 border-green-200';
        text = 'Active';
        break;
      default:
        color = 'bg-gray-100 text-gray-800 border-gray-200';
        text = 'Active';
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${color} ml-2`}>
        {text}
      </span>
    );
  }

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
                <strong>Registered:</strong> {new Date(user.createdAt).toLocaleDateString()}
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
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-purple-100 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            {/* Top row: headline left, bell right (mobile only) */}
            <div className="flex flex-row justify-between items-center md:block w-full md:w-auto">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user.username}</p>
              </div>
              {/* Bell only on right for mobile */}
              <div className="md:hidden ml-2">
                <NotificationCenter />
              </div>
            </div>
            {/* Stats + bell on right for desktop, stats centered below for mobile */}
            <div className="flex flex-row justify-center items-center gap-4 mt-4 md:mt-0 md:justify-end w-full md:w-auto">
              {/* Bell on right for desktop only */}
              <div className="hidden md:block">
                <NotificationCenter />
              </div>
              {/* Stat Cards */}
              <div className="flex flex-row gap-4 items-center">
                <div className="flex items-center bg-white rounded-lg shadow-sm px-4 py-2 min-w-[120px] border border-gray-100">
                  <Eye className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Total Views</div>
                    <div className="text-lg font-bold text-gray-900">{formatViews(stats.totalViews)}</div>
                  </div>
                </div>
                <div className="hidden md:block h-8 border-l border-gray-200 mx-2"></div>
                <div className="flex items-center bg-white rounded-lg shadow-sm px-4 py-2 min-w-[140px] border border-gray-100">
                  <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Estimated Payout</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(stats.payoutAmount)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex justify-between px-2 sm:px-6">
              {tabList.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  data-tab={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex-1 py-4 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors min-w-0 text-center ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={{ minWidth: 0 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className="h-5 w-5 mx-auto" />
                    <span className="text-xs sm:text-sm">{label}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Total Views</p>
                    <p className="text-2xl font-bold">{formatViews(stats.totalViews)}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-100">Total Reels</p>
                    <p className="text-2xl font-bold">{stats.totalReels}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-100">Active Reels</p>
                    <p className="text-2xl font-bold">{stats.activeReels}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-100">Estimated Payout</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.payoutAmount)}</p>
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
                        <img 
  src={reel.thumbnail} 
  alt="" 
  className="h-12 w-12 rounded-lg"
  onError={(e) => {
    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkgyNFYyNEgxNlYxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
  }}
/>
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
          <div className="space-y-8">
            {reels.length > 0 ? (
              (() => {
                // Group reels by campaign name
                const reelsByCampaign: { [key: string]: Reel[] } = {};
                reels.forEach(reel => {
                  const campaignName = reel.campaign?.name || 'General Reels';
                  if (!reelsByCampaign[campaignName]) reelsByCampaign[campaignName] = [];
                  reelsByCampaign[campaignName].push(reel);
                });
                return Object.entries(reelsByCampaign).map(function mapCampaign([campaignName, campaignReels]: [string, Reel[]]) {
                  const page = reelsPage[campaignName] || 1;
                  const totalPages = Math.ceil(campaignReels.length / REELS_PER_PAGE);
                  const paginatedReels = campaignReels.slice((page - 1) * REELS_PER_PAGE, page * REELS_PER_PAGE);
                  return (
                    <div key={campaignName} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8">
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-5 w-5 text-purple-600" />
                          <span className="text-lg font-semibold text-gray-900">{campaignName}</span>
                          <span className="ml-2 text-xs text-gray-500">{campaignReels.length} reels</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-600">Total Views</span>
                          <span className="ml-2 text-base font-bold text-blue-600">{
                            formatViews(campaignReels.reduce((total: number, r: Reel) => total + (Number(r.views) || 0), 0))
                          }</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                        {paginatedReels.map((reel: Reel) => (
                          <div key={reel.id} className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-purple-100 p-2">
                            <div className="relative">
                              <img 
  src={reel.thumbnail} 
  alt="" 
  className="w-full h-28 object-cover rounded-lg"
  onError={(e) => {
    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjExMiIgdmlld0JveD0iMCAwIDI4MCAxMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDAgNTZIMTgwVjEwMEgxNDBWNTZaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjc3NDhCIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
  }}
/>
                              {reel.campaign_id && (
                                <div className="absolute top-2 left-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow">
                                    <Megaphone className="h-3 w-3 mr-1" />
                                    Campaign
                                  </span>
                                </div>
                              )}
                              <div className="absolute top-2 right-2">
                                <button
                                  onClick={() => handleDeleteReel(reel.id)}
                                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white p-1 rounded-full shadow-lg transition-colors"
                                  title="Delete reel"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="p-2">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">@{reel.username || 'unknown'}</h3>
                                <a
                                  href={reel.url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:text-purple-800 text-xs font-bold"
                                >
                                  View
                                </a>
                              </div>
                              {reel.campaign && (
                                <div className="mb-2 p-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded border border-purple-200">
                                  <p className="text-xs text-purple-700 font-bold truncate">{reel.campaign.name}</p>
                                  <p className="text-[10px] text-purple-600">${reel.campaign.pay_rate}/1M views</p>
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                <div className="text-center">
                                  <p className="text-[10px] text-blue-600 font-semibold">Views</p>
                                  <p className="font-bold text-blue-700 text-xs">{formatViews(reel.views || 0)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-pink-600 font-semibold">Likes</p>
                                  <p className="font-bold text-pink-700 text-xs">{reel.likes && reel.likes > 0 ? formatViews(reel.likes) : '-'}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-green-600 font-semibold">Comments</p>
                                  <p className="font-bold text-green-700 text-xs">{reel.comments && reel.comments > 0 ? formatViews(reel.comments) : '-'}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end mt-1">
                                <span className="text-[10px] text-gray-500">{reel.shortcode}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 py-4">
                          <button
                            className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                            onClick={() => setReelsPage(p => ({ ...p, [campaignName]: Math.max(1, (p[campaignName] || 1) - 1) }))}
                            disabled={page === 1}
                          >
                            Previous
                          </button>
                          <span className="text-sm font-medium text-gray-700">Page {page} of {totalPages}</span>
                          <button
                            className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                            onClick={() => setReelsPage(p => ({ ...p, [campaignName]: Math.min(totalPages, (p[campaignName] || 1) + 1) }))}
                            disabled={page === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            ) : (
              <div className="text-center py-12">
                <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reels yet</h3>
                <p className="text-gray-600 mb-6">Start by submitting your first Instagram reel</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg"
                >
                  Submit Your First Reel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="max-w-4xl mx-auto">
            {/* Success Message */}
            {submitSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-green-800">Success!</h3>
                  <p className="text-sm text-green-700 mt-1">{submitSuccess}</p>
                </div>
              </div>
            )}
            
            <SubmissionForm
              onSubmit={handleSingleReelSubmit}
              onBulkSubmit={handleBulkReelSubmit}
              isLoading={isSubmitting}
              error={submitError}
              userCampaigns={userCampaigns}
            />
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <AccountManagement />
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div id="campaigns" className="space-y-8">
            {/* Available Campaigns */}
            <div className="bg-gradient-to-br from-purple-100 via-pink-50 to-yellow-50 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <Megaphone className="h-7 w-7 text-purple-600" /> Available Campaigns
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.map((c: Campaign) => {
                  const platforms = typeof c.platform === 'string' ? c.platform.split(',') : Array.isArray(c.platform) ? c.platform : [];
                  return (
                    <div key={c.id} className="bg-white rounded-2xl shadow-xl p-6 flex flex-col justify-between border border-purple-100 hover:shadow-2xl transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <Megaphone className="h-6 w-6 text-purple-500" />
                        <span className="text-lg font-semibold text-gray-900">{c.name}</span>
                        {renderStatusBadge(c.status)}
                        <div className="flex gap-1 ml-auto flex-wrap max-w-[120px]">
                          {platforms.map((p: string) => (
                            <span key={p} className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-purple-100">
                              {p.trim().toLowerCase() === 'instagram' && <Instagram className="h-4 w-4 text-pink-500" />}
                              {p.trim().toLowerCase() === 'youtube' && <Youtube className="h-4 w-4 text-red-500" />}
                              {p.trim().toLowerCase() === 'tiktok' && <TikTokIcon className="h-4 w-4 text-black" />}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mb-3 text-gray-700 text-sm min-h-[48px]">{c.description}</div>
                      <div className="mb-2 text-xs text-gray-500">Requirements: {c.requirements}</div>
                      <div className="flex items-center justify-between mt-4 mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Pay Rate</span>
                          <span className="font-bold text-green-600 text-lg">${c.pay_rate} <span className="text-xs text-gray-500">/ 1M views</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Budget</span>
                          <span className="font-bold text-blue-600 text-lg">${c.total_budget}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleJoinCampaign(c.id)}
                        disabled={joiningCampaign === c.id || c.status !== 'active'}
                        className={`mt-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-2 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${c.status !== 'active' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {joiningCampaign === c.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Joining...
                          </>
                        ) : (
                          c.status !== 'active' ? `Unavailable (${c.status.replace('_', ' ')})` : 'Join Campaign'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              {campaigns.length === 0 && (
                <div className="text-center text-gray-500 py-12 text-lg">No campaigns available at the moment. Please check back later!</div>
              )}
            </div>

            {/* User's Assigned Campaigns */}
            {userCampaigns.length > 0 && (
              <div className="bg-gradient-to-br from-green-100 via-blue-50 to-indigo-50 rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                  <CheckCircle className="h-7 w-7 text-green-600" /> My Campaigns
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {userCampaigns.map((assignment: CampaignAssignment) => {
                    const campaign = assignment.campaign;
                    if (!campaign) return null;
                    
                    const platforms = typeof campaign.platform === 'string' ? campaign.platform.split(',') : Array.isArray(campaign.platform) ? campaign.platform : [];
                    return (
                      <div key={assignment.id} className="bg-white rounded-2xl shadow-xl p-6 flex flex-col justify-between border border-green-100 hover:shadow-2xl transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="h-6 w-6 text-green-500" />
                          <span className="text-lg font-semibold text-gray-900">{campaign.name}</span>
                          {renderStatusBadge(campaign.status)}
                          <div className="flex gap-1 ml-auto flex-wrap max-w-[120px]">
                            {platforms.map((p: string) => (
                              <span key={p} className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-green-100">
                                {p.trim().toLowerCase() === 'instagram' && <Instagram className="h-4 w-4 text-pink-500" />}
                                {p.trim().toLowerCase() === 'youtube' && <Youtube className="h-4 w-4 text-red-500" />}
                                {p.trim().toLowerCase() === 'tiktok' && <TikTokIcon className="h-4 w-4 text-black" />}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mb-3 text-gray-700 text-sm min-h-[48px]">{campaign.description}</div>
                        <div className="mb-2 text-xs text-gray-500">Requirements: {campaign.requirements}</div>
                        <div className="flex items-center justify-between mt-4 mb-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Pay Rate</span>
                            <span className="font-bold text-green-600 text-lg">${campaign.pay_rate} <span className="text-xs text-gray-500">/ 1M views</span></span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Budget</span>
                            <span className="font-bold text-blue-600 text-lg">${campaign.total_budget}</span>
                          </div>
                        </div>
                        <div className="mt-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Assigned
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Joined: {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto px-2 sm:px-0">
            <div className="bg-gradient-to-br from-blue-100 via-white to-purple-100 rounded-3xl shadow-2xl p-6 sm:p-12 border border-purple-100">
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
                <div className="relative">
                  <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full h-28 w-28 flex items-center justify-center shadow-2xl border-4 border-white">
                    <span className="text-5xl font-extrabold text-white uppercase drop-shadow-lg">{user.username?.[0]}</span>
                  </div>
                  <span className="absolute bottom-2 right-2 bg-green-400 border-2 border-white rounded-full h-6 w-6 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-1 flex items-center justify-center sm:justify-start gap-2">
                    <UserIcon />
                    {user.username}
                  </h2>
                  <p className="text-gray-600 flex items-center justify-center sm:justify-start gap-2">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 01-8 0 4 4 0 018 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0 0H9m3 0h3" /></svg>
                    {user.email}
                  </p>
                  <div className={`inline-flex px-4 py-1 rounded-full text-sm font-semibold mt-3 shadow ${user.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{user.isApproved ? 'Approved' : 'Pending Approval'}</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3m-8 9v6a2 2 0 002 2h4a2 2 0 002-2v-6" /></svg>
                  Contact & Payment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                  {/* Left: Telegram Group CTA */}
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl p-4 shadow-inner h-full">
                    <svg className="h-12 w-12 text-blue-500 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M9.04 16.29l-.39 3.67c.56 0 .8-.24 1.09-.53l2.62-2.49 5.44 3.98c1 .55 1.72.26 1.97-.92l3.58-16.84c.32-1.49-.54-2.07-1.5-1.72L2.36 9.18c-1.46.56-1.44 1.36-.25 1.72l4.6 1.44 10.67-6.72c.5-.32.96-.14.58.18" /></svg>
                    <div className="font-bold text-blue-700 text-lg mb-1">Join our Telegram!</div>
                    <div className="text-xs text-gray-600 mb-3 text-center">Get support, updates, and connect with the community.</div>
                    <a
                      href="https://t.me/+TDBG7LH2nAdkMDY1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold shadow transition"
                    >
                      <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M9.04 16.29l-.39 3.67c.56 0 .8-.24 1.09-.53l2.62-2.49 5.44 3.98c1 .55 1.72.26 1.97-.92l3.58-16.84c.32-1.49-.54-2.07-1.5-1.72L2.36 9.18c-1.46.56-1.44 1.36-.25 1.72l4.6 1.44 10.67-6.72c.5-.32.96-.14.58.18" /></svg>
                      Join Group
                    </a>
                  </div>
                  {/* Center & Right: Payment Methods including Telegram */}
                  <form onSubmit={handleSavePayment} className="space-y-4 col-span-2">
                    <h4 className="text-md font-semibold text-gray-700 mb-1">Payment & Contact Methods</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8a6 6 0 01-12 0V6a6 6 0 0112 0v2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 8v2a6 6 0 0012 0V8" /></svg>
                          Telegram Handle
                        </label>
                        <input
                          type="text"
                          name="telegram"
                          value={payment.telegram || ''}
                          onChange={handlePaymentChange}
                          placeholder="Your Telegram handle (e.g. @username)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 transition"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Crypto (USDT ERC20)</label>
                        <input
                          type="text"
                          name="usdt"
                          value={payment.usdt || ''}
                          onChange={handlePaymentChange}
                          placeholder="Your USDT (ERC20) address"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 transition"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">UPI ID</label>
                        <input
                          type="text"
                          name="upi"
                          value={payment.upi || ''}
                          onChange={handlePaymentChange}
                          placeholder="Your UPI ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 transition"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">PayPal Email</label>
                        <input
                          type="email"
                          name="paypal"
                          value={payment.paypal || ''}
                          onChange={handlePaymentChange}
                          placeholder="Your PayPal email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 transition"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                      <button type="submit" disabled={savingPayment} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-semibold shadow disabled:opacity-50 transition">
                        {savingPayment ? 'Saving...' : 'Save Payment Methods'}
                      </button>
                      {paymentSaved && <div className="text-green-600 text-sm">Payment methods saved!</div>}
                    </div>
                  </form>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full mt-8 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-3 rounded-2xl shadow-xl text-lg transition-all border-2 border-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}