import React, { useState, useEffect, useRef } from 'react';
import { Plus, Eye, TrendingUp, DollarSign, Settings, Upload, Trash2, Bug, Users, Megaphone, CheckCircle, Instagram, Youtube, CoinsIcon, BadgeDollarSign, CircleDollarSign } from 'lucide-react';
import { reelApiService } from '../../services/reelApi';
import { validateInstagramUrl, formatViews, formatCurrency } from '../../utils/instagram';
import { fetchInstagramReelStatsFrontend } from '../../utils/rapidapi';
import { SubmissionForm } from '../reels/SubmissionForm';
import { AccountManagement } from '../admin/AccountManagement';
import { NotificationCenter } from '../common/NotificationCenter';
import { User, Reel, Campaign, CampaignAssignment } from '../../types';
import { authService } from '../../services/authService';
import { campaignService } from '../../services/campaignService';
import { accountService } from '../../services/accountService';
import { toast } from 'sonner';

interface UserDashboardProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onLogout: () => void;
}

interface ReferralUser {
  username: string;
  email: string;
  created_at: string;
  status: ['pending' | 'approved' | 'rejected'];
  total_earned_from_campaigns: number;
  total_claimed_from_campaigns: number;
  totalEarned:number;
}
interface ReferralData {
  referralCode: string;
  totalClaimedOverall:0,
totalEarningsAllTime:0,
totalReferredUsers:0,
  referredUsers: ReferralUser[];
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
  const [showReferModal, setShowReferModal] = useState(false);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [referralError, setReferralError] = useState('');
  const token = localStorage.getItem('token'); // or get from context

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
    toast("Delete Reel", {
      description: "Are you sure you want to delete this reel?",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const result = await reelApiService.deleteReel(reelId);
            if (result.success) {
              toast.success('Reel deleted successfully.')
              await loadReels();
            }
          } catch (error) {
            toast.error('Failed to delete reel');
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
      
    });
  };

  const stats = {
    totalViews,
    totalReels: reels.length,
    activeReels: reels.filter(reel => reel.isActive).length,
    payoutAmount: (totalViews / 1_000_000) * PAYOUT_PER_MILLION
  };

  const tabList = [
    { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: TrendingUp },
    { id: 'reels', label: `Reels (${stats.totalReels})`, mobileLabel: 'Reels', icon: Eye },
    { id: 'submit', label: 'Submit Reel', mobileLabel: 'Submit', icon: Plus },
    { id: 'accounts', label: 'Accounts', mobileLabel: 'Accounts', icon: Users },
    { id: 'campaigns', label: 'Campaigns', mobileLabel: 'Campaigns', icon: Megaphone },
    { id: 'profile', label: 'Profile', mobileLabel: 'Profile', icon: Settings }
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
      toast.success(result.message);
      await loadCampaigns(); // Reload campaigns to update the lists
    } catch (error) {
      console.error('Failed to join campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join campaign');
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
          <div className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Tagline (left on desktop) */}
            <div className="md:flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              
              </div>
              <p className="text-gray-600">Welcome back, {user.username}</p>
            </div>
            
            {/* Notification, Total Views, Estimated Payout (right on desktop, in a row) */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full md:w-auto">
              <div className='flex flex-row-reverse md:flex-row gap-6  space-between'>
              <div className='flex-1 flex justify-end'>
                 <div>
                   <button
              className="w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-semibold shadow disabled:opacity-50 transition"
                  onClick={async () => {
                    setShowReferModal(true);
                    setReferralLoading(true);
                    setReferralError('');
                    setReferralData(null);
                    try {
                      const data = await accountService.getReferralData();
                      setReferralData(data);
                    } catch (e) {
                      setReferralError('Could not load referral info. Please login again.');
                    } finally {
                      setReferralLoading(false);
                    }
                  }}
                >
                  Refer Friends
                </button>
                 </div>
              </div>
              <div className="mb-4 md:mb-0 md:mr-4">
                <NotificationCenter />
              </div>
              </div>
              <div className="flex flex-row gap-4 md:gap-6 w-full md:w-auto">
                <div className="flex items-center bg-white rounded-lg shadow-sm px-4 py-2 min-w-[120px] border border-gray-100 w-1/2 md:w-auto">
                  <Eye className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Total Views</div>
                    <div className="text-lg font-bold text-gray-900">{formatViews(stats.totalViews)}</div>
                  </div>
                </div>
                <div className="flex items-center bg-white rounded-lg shadow-sm px-4 py-2 min-w-[140px] border border-gray-100 w-1/2 md:w-auto">
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

      {/* Refer Modal */}
      {showReferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-2xl relative">
            <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-light" onClick={() => setShowReferModal(false)}>✕</button>
            <h2 className="text-3xl font-semibold mb-6 text-gray-800 text-center">Refer & Earn</h2>
            {referralLoading && <div className="mb-4 text-center text-indigo-600 font-medium flex w-full justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}
            {referralError && <div className="mb-4 text-center text-red-600 font-medium">{referralError}</div>}
            {referralData && (
              <>
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="referralLink">Your Referral Link:</label>
                  <div className="flex rounded-lg shadow-sm overflow-hidden">
                    <input
                      id="referralLink"
                      className="flex-1 border border-gray-300 px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={`${window.location.origin}/register?ref=${referralData.referralCode}`}
                      readOnly
                    />
                    <button
                      className=" px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/register?ref=${referralData.referralCode}`);
                        toast.success('Referral link copied to clipboard!');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="mb-6 flex justify-around items-center p-4 rounded-lg shadow-inner bg-gradient-to-r from-blue-500 to-cyan-500  text-white shadow-lg">
                  <div className="text-center">
                    <div className="text-white text-lg">Total Referred</div>
                    <div className="font-bold text-2xl text-white">{referralData.totalReferredUsers}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white text-lg">Total Earned</div>
                    <div className="font-bold text-2xl text-white flex items-center gap-1"><CircleDollarSign className='size-6 text-yellow-300 mt-0.5'/>{referralData.totalClaimedOverall}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white text-lg">Claim</div>
                    <div className="font-bold text-2xl text-white flex items-center gap-1"><CircleDollarSign className='size-6 text-yellow-300 mt-0.5'/>{referralData.totalEarningsAllTime}</div>
                  </div>
                </div>
                
                <div className='mb-2'>
                  <button
                  disabled={referralData.totalEarningsAllTime<100 || claimLoading}
                      className=" px-5 rounded-md py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out"
                      onClick={async () => {
                        setClaimLoading(true);
                    try {
                       await accountService.claimReferal();
                      toast.success(`Claimed ammount sent for approval!`);
                    } catch (e:any) {
                      toast.error(e?.message || 'Failed to claim referral earnings');
                    } finally {
                      setClaimLoading(false);
                    }
                      }}
                    >
                      {!claimLoading?'Claim Referral Earnings':'...Claiming Referral Earnings'}
                    </button>
                </div>
                <div className='text-xs mb-2'>*You can only claim when claim amount is more than $100</div>
                <div>
                  <h3 className="font-bold text-xl mb-3 text-gray-800">Referred Users</h3>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Email</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Date</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Earned</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Pending</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {referralData.referredUsers.map((u, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-700">{u.email}</td>
                            <td className="px-4 py-2 text-gray-700">{new Date(u.created_at).toLocaleDateString()}</td>
                           
                            <td className="px-4 py-2 text-gray-700">${u.total_earned_from_campaigns || 0}</td>
                            <td className="px-4 py-2 text-gray-700">${u.total_claimed_from_campaigns || 0}</td>
                          </tr>
                        ))}
                        {referralData.referredUsers.length === 0 && (
                          <tr><td colSpan={5} className="text-center text-gray-400 py-4">No referrals yet. Share your link to start earning!</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex justify-between gap-1 px-1 sm:px-6 overflow-x-auto">
              {tabList.map(({ id, label, mobileLabel, icon: Icon }) => (
                <button
                  key={id}
                  data-tab={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex-shrink-0 py-3 sm:py-4 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors min-w-0 text-center ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={{ minWidth: 0 }}
                >
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 mx-auto" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{mobileLabel}</span>
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
                    <div key={reel.id} className="flex shadow-sm items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img 
  src={reel.thumbnail} 
  alt="" 
  className="h-12 w-12 rounded-lg"
  onError={(e) => {
    e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAAAsTAAALEwEAmpwYAAADZklEQVR4nO2aS2sUQRDHB5OTBw+CnuJdTfwGutUjGPPycZmqCRH8BnqSEMEXmi+SKMh68BEfySFbtQFF8pCoeBGMH8EnHjRupGc2JO4juzM7PTObnT8UhDDT3b+p2u7q6rasTJkyZcrU4XLyTpctOARMd5XQe2D8BkJf9d9KaDonNKifsXaDbHHPKsHPSmhjR2NaUwV32GpnKaHbiqnUEHYLugRMN612FDBONA1abeNWWgWMfcA4CYxzILSsBJeU4AwIrYcF9t/FGd2WbhOEZoHxjj3v9iYGmhPnmGJ8HihkWzU/5J/pjxwrLDC6IPgzNtBq8F+q6FyMCdYZTQy00opExsMYkvRstf0w+rtWgi9SAFkZ3k+MwAJjX6wTVPPAJSNeBsbJxOHqmJFkBRjnUgss+DR6YKHVFHt4JXpgppWEgB4Cj/Vo8xKdms/gUuTAykv14vYc3geG7q2PPtYTy0wNjBOt5MZRwGqdKNKhms/6YxuPbosnyXrW/+jQrcPb6GydEzwT99pbD1b/v+H7eqxhiwhO3ulqqlKRFtgt6LVQ5SJbcCjmUM5XwuqBl+tgwdoq4OnAwMB4r608+79NBwZWTO+CDZo+AON5EHIU48cEYfWsvRrcw+KVUZvuJCd0ZPPdUy8vHCyXYGOHLdsXs8BMpZHlkb3b328EbRA2HLAKGNJK6HplG/WgDcOGDGkOOGl567V7qRG0aVjfcCowcE5oMHBHfpJyubKt4wvOgXLERLf07GB2kfrDJR5Ma+Ggqz3d/8rZb96zXgR9Cn1OBUwjoVLLOtCmYXW/OjJDwW4KGG+F7bwetBFYPxe4ZkUhJTQeantYA9pIGAutA9OVSGBbLgD4P4mr1saNPQOvx/YpwQdtUapVjG9aHNR3xfg7clhTJR7ouCKe0GxnlWm54wrxo4eB8W/ScFXGVDq54ByNHFhLH0anMJwfWUavN0i6jku378ONSBWJUnGKqK8/CDlGYTelCnROXy5L0rO2OGjFKXve7dUZTpze1pMmMD42HsY7SXeuNxh6LfSuLTEttnptSQn98VJZpsXyVagZvfQkCtrMhiO8JyPeCMQl7ZWgVw9r1cbaSqrgDjdTOdGVipY372mR49Wt3AFdXAPGt7qMqs3fkOCUPhrZNdeHM2XKlCmTFV7/AC0OrOcfji61AAAAAElFTkSuQmCC';
  }}
/>
 <div>
                          <p className="font-medium text-gray-900">@{reel.username}</p>
                          <p className="text-sm text-gray-600">{reel.shortcode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatViews(reel.views)} views</p>
                        <p className={`text-sm mt-1 text-gray-700 font-semibold inline-block px-3 py-1 rounded-3xl text-xs ${!reel.isActive?'bg-green-200':'bg-gray-200'}`}>
                          {!reel.isActive ? 'Active' : 'Inactive'}
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
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <div className="flex flex-row items-center gap-2 justify-start">
                          <Megaphone className="h-5 w-5 text-purple-600" />
                          <span className="text-xl font-semibold text-gray-900">{campaignName}</span>
                          <span className="ml-2 text-sm text-gray-500">{campaignReels.length} reels</span>
                        </div>
                        <div className="flex flex-row items-center gap-1 sm:justify-end justify-start">
                          <span className="text-sm font-semibold text-gray-600">Total Views : </span>
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
    e.currentTarget.src = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNy41LjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgdmlld0JveD0iMCAwIDgwMCAxMjAwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA4MDAgMTIwMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGcgaWQ9IkJhY2tncm91bmQiPg0KCTxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iLTEwMCIgeTE9IjExMDAiIHgyPSI5MDAiIHkyPSIxMDAiPg0KCQk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojRTBFQUZDIi8+DQoJCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiNCREVCRkUiLz4NCgk8L2xpbmVhckdyYWRpZW50Pg0KCTxyZWN0IHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMV8pOyIgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIi8+DQo8L2c+DQo8ZyBpZD0iR3JhcGhpY19FbGVtZW50cyI+DQoJPGc+DQoJCTxkZWZzPg0KCQkJPHJlY3QgaWQ9IlNWR0lEXzAwMDAwMDUxMzQ2Njc1NzA5NTE3MjcwNzMwMDAwMDE1NTI4ODUzOTA5Mjc0NDk4NzAyXyIgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIi8+DQoJCTwvZGVmcz4NCgkJPGNsaXBQYXRoIGlkPSJTVkdJRF8wMDAwMDE2MDg4NjQzNDkxNTUzMjY1NTgyMDAwMDAxMDQ5MjY0NzEzNjM4NjcyNDc4Nl8iPg0KCQkJPHVzZSB4bGluazpocmVmPSIjU1ZHSURfMDAwMDAwNTEzNDY2NzU3MDk1MTcyNzA3MzAwMDAwMTU1Mjg4NTM5MDkyNzQ0OTg3MDJfIiAgc3R5bGU9Im92ZXJmbG93OnZpc2libGU7Ii8+DQoJCTwvY2xpcFBhdGg+DQoJCTxnIHN0eWxlPSJjbGlwLXBhdGg6dXJsKCNTVkdJRF8wMDAwMDE2MDg4NjQzNDkxNTUzMjY1NTgyMDAwMDAxMDQ5MjY0NzEzNjM4NjcyNDc4Nl8pOyI+DQoJCQk8Zz4NCgkJCQkNCgkJCQkJPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8wMDAwMDA2NTc5MDAyNzYzMTM5ODc1MTk1MDAwMDAwNDg3NTE5MTg2OTA3MjM3NDk1NF8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iNDI1LjU5NzkiIHkxPSItNTEuNDk5OCIgeDI9IjEwODkuNDUyMSIgeTI9Ii01MS40OTk4Ij4NCgkJCQkJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzBCQzFDNyIvPg0KCQkJCQk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojMzI0Q0ZDIi8+DQoJCQkJPC9saW5lYXJHcmFkaWVudD4NCgkJCQk8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDY1NzkwMDI3NjMxMzk4NzUxOTUwMDAwMDA0ODc1MTkxODY5MDcyMzc0OTU0Xyk7IiBkPSJNMTA4Mi4wMzgtMTUzLjE0OWwtMC40MzQtMC40MzQNCgkJCQkJYy05Ljg4Ny05Ljg4NS0yNS45MTYtOS44ODQtMzUuODAyLDAuMDAybC00LjI1LDQuMjVjLTkuODg3LDkuODg2LTI1LjkxNSw5Ljg4Ny0zNS44MDIsMC4wMDJsLTAuNDM0LTAuNDM0DQoJCQkJCWMtOS44ODgtOS44ODUtMjUuOTE3LTkuODg0LTM1LjgwMywwLjAwMmwtMzguMzI4LDM4LjMyOGMtMTAuMDA2LDEwLjAwNi0yNi4yMjksMTAuMDA2LTM2LjIzNSwwbDAsMA0KCQkJCQljLTEwLjAwNi0xMC4wMDYtMTAuMDA2LTI2LjIyOSwwLTM2LjIzNWw1Ni42NDctNTYuNjQ3YzkuODg2LTkuODg2LDkuODg2LTI1LjkxNS0wLjAwMS0zNS44bC0wLjQzNC0wLjQzNA0KCQkJCQljLTkuODg3LTkuODg2LTI1LjkxNi05Ljg4NS0zNS44MDIsMC4wMDFMNzkwLjY5Ny0xMTUuODg2Yy0xMC4wMDYsMTAuMDA2LTI2LjIyOSwxMC4wMDYtMzYuMjM1LDBsMCwwDQoJCQkJCWMtMTAuMDA2LTEwLjAwNi0xMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDEyNC42NjItMTI0LjY2MmM5Ljg4Ni05Ljg4Niw5Ljg4Ni0yNS45MTUsMC0zNS44MDFsLTAuNDM0LTAuNDM0DQoJCQkJCWMtOS44ODctOS44ODYtMjUuOTE2LTkuODg1LTM1LjgwMiwwLjAwMUw1NTcuNTQ4LTI3LjY3NWMtMTAuMDA2LDEwLjAwNi0xMC4wMDYsMjYuMjI5LDAsMzYuMjM1aDANCgkJCQkJYzEwLjAwNiwxMC4wMDYsMTAuMDA2LDI2LjIyOSwwLDM2LjIzNUw0MzMuMTAyLDE2OS4yNGMtMTAuMDA2LDEwLjAwNi0xMC4wMDYsMjYuMjI5LDAsMzYuMjM1djANCgkJCQkJYzEwLjAwNiwxMC4wMDYsMjYuMjI5LDEwLjAwNiwzNi4yMzUsMEw1OTMuNzgzLDgxLjAyOWMxMC4wMDYtMTAuMDA2LDI2LjIyOS0xMC4wMDYsMzYuMjM1LDBsMCwwDQoJCQkJCWMxMC4wMDYsMTAuMDA2LDEwLjAwNiwyNi4yMjksMCwzNi4yMzVsLTU2LjQyOSw1Ni40MjljLTEwLjAwNiwxMC4wMDYtMTAuMDA2LDI2LjIyOSwwLDM2LjIzNXYwDQoJCQkJCWMxMC4wMDYsMTAuMDA2LDI2LjIyOSwxMC4wMDYsMzYuMjM1LDBsMzguMTE0LTM4LjExNGMxMC4wMDYtMTAuMDA2LDI2LjIyOS0xMC4wMDYsMzYuMjM1LDBsMCwwDQoJCQkJCWMxMC4wMDYsMTAuMDA2LDI2LjIyOSwxMC4wMDYsMzYuMjM1LDBsMy44Mi0zLjgyYzEwLjAwNi0xMC4wMDYsMjYuMjI5LTEwLjAwNiwzNi4yMzUsMHYwYzEwLjAwNiwxMC4wMDYsMjYuMjI5LDEwLjAwNiwzNi4yMzUsMA0KCQkJCQlsMjg1LjM0My0yODUuMzQyQzEwOTEuOTI0LTEyNy4yMzQsMTA5MS45MjQtMTQzLjI2MywxMDgyLjAzOC0xNTMuMTQ5eiIvPg0KCQkJCQ0KCQkJCQk8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMDYzNjEyNzYxNTE0MzA0ODU5MTAwMDAwMDA5NjExNDQyODc5MDM0MzYxNzM4XyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIzMTQuNTYyMSIgeTE9Ii0xNDQuNTc3MSIgeDI9IjkwMy43ODQzIiB5Mj0iLTE0NC41NzcxIj4NCgkJCQkJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzNBQTFDNyIvPg0KCQkJCQk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojMzI0Q0ZDIi8+DQoJCQkJPC9saW5lYXJHcmFkaWVudD4NCgkJCQk8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDYzNjEyNzYxNTE0MzA0ODU5MTAwMDAwMDA5NjExNDQyODc5MDM0MzYxNzM4Xyk7IiBkPSJNNjA5LjE3My02MS4xNzRMNjA5LjE3My02MS4xNzQNCgkJCQkJYzkuNzg0LDkuNzg0LDkuNzg0LDI1LjY0NywwLDM1LjQzMkw1MzQuNDksNDguOTRjLTkuNzg0LDkuNzg0LTkuNzg0LDI1LjY0NywwLDM1LjQzMmwwLDBjOS43ODQsOS43ODQsOS43ODQsMjUuNjQ3LDAsMzUuNDMxDQoJCQkJCWwtMTUuNjY4LDE1LjY2OGMtOS43ODQsOS43ODQtOS43ODQsMjUuNjQ3LDAsMzUuNDMybDAsMGM5Ljc4NCw5Ljc4NCwyNS42NDgsOS43ODQsMzUuNDMyLDBMODA2LjA5Ni04MC45MzkNCgkJCQkJYzkuNzg0LTkuNzg0LDkuNzg0LTI1LjY0NywwLTM1LjQzMmwwLDBjLTkuNzg0LTkuNzg0LTkuNzg0LTI1LjY0NywwLTM1LjQzMWwxNS42NjctMTUuNjY3YzkuNzg0LTkuNzg0LDkuNzg0LTI1LjY0NywwLTM1LjQzMnYwDQoJCQkJCWMtOS43ODQtOS43ODQtOS43ODQtMjUuNjQ3LDAtMzUuNDMxbDc0LjY4My03NC42ODNjOS43ODQtOS43ODQsOS43ODQtMjUuNjQ3LDAtMzUuNDMxbDAsMGMtOS43ODQtOS43ODQtMjUuNjQ3LTkuNzg0LTM1LjQzMiwwDQoJCQkJCWwtNDEuOTA5LDQxLjkwOWMtOS43ODQsOS43ODQtMjUuNjQ3LDkuNzg0LTM1LjQzMiwwaDBjLTkuNzg0LTkuNzg0LTI1LjY0Ny05Ljc4NC0zNS40MzIsMEw2OTMuNi0yNTEuODk2DQoJCQkJCWMtOS43ODQsOS43ODQtMjUuNjQ3LDkuNzg0LTM1LjQzMiwwdjBjLTkuNzg0LTkuNzg0LTkuNzg0LTI1LjY0NywwLTM1LjQzMmwyMS44NjgtMjEuODY4YzkuNzg0LTkuNzg0LDkuNzg0LTI1LjY0NywwLTM1LjQzMg0KCQkJCQlsMCwwYy05Ljc4NC05Ljc4NC05Ljc4NC0yNS42NDcsMC0zNS40MzJsNDQuNTY2LTQ0LjU2NmM5Ljc4NC05Ljc4NCw5Ljc4NC0yNS42NDcsMC0zNS40MzJsMCwwDQoJCQkJCWMtOS43ODQtOS43ODQtMjUuNjQ3LTkuNzg0LTM1LjQzMSwwbC00NC41NjYsNDQuNTY2Yy05Ljc4NCw5Ljc4NC0yNS42NDcsOS43ODQtMzUuNDMyLDBsMCwwDQoJCQkJCWMtOS43ODQtOS43ODQtMjUuNjQ3LTkuNzg0LTM1LjQzMSwwTDMyMS45LTE2My42NDljLTkuNzg0LDkuNzg0LTkuNzg0LDI1LjY0NywwLDM1LjQzMWwwLDBjOS43ODQsOS43ODQsMjUuNjQ3LDkuNzg0LDM1LjQzMSwwDQoJCQkJCWw0NC41NjYtNDQuNTY2YzkuNzg0LTkuNzg0LDI1LjY0Ny05Ljc4NCwzNS40MzIsMGwwLDBjOS43ODQsOS43ODQsOS43ODQsMjUuNjQ3LDAsMzUuNDMybC00NC41NjYsNDQuNTY2DQoJCQkJCWMtOS43ODQsOS43ODQtOS43ODQsMjUuNjQ3LDAsMzUuNDMydjBjOS43ODQsOS43ODQsOS43ODQsMjUuNjQ3LDAsMzUuNDMxTDM3MC44OTUtMC4wNTVjLTkuNzg0LDkuNzg0LTkuNzg0LDI1LjY0NywwLDM1LjQzMg0KCQkJCQlsMCwwYzkuNzg0LDkuNzg0LDI1LjY0Nyw5Ljc4NCwzNS40MzEsMGw1NC42NDItNTQuNjQyYzkuNzg0LTkuNzg0LDI1LjY0Ny05Ljc4NCwzNS40MzEsMGgwYzkuNzg0LDkuNzg0LDI1LjY0Nyw5Ljc4NCwzNS40MzEsMA0KCQkJCQlsNDEuOTA5LTQxLjkwOUM1ODMuNTI2LTcwLjk1OSw1OTkuMzg5LTcwLjk1OSw2MDkuMTczLTYxLjE3NHoiLz4NCgkJCQkNCgkJCQkJPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8wMDAwMDA1MTM0MzY1NjI1OTc5MzUxOTI2MDAwMDAwNzk2ODg4NjU2MTY4OTc0MzgwNV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iNzExLjk3MzMiIHkxPSIyMTcuNDMxOCIgeDI9Ijc2My4yMTY5IiB5Mj0iMjE3LjQzMTgiPg0KCQkJCQk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojNEJGNkZBIi8+DQoJCQkJCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiMzMjRDRkMiLz4NCgkJCQk8L2xpbmVhckdyYWRpZW50Pg0KCQkJCTxjaXJjbGUgc3R5bGU9ImZpbGw6dXJsKCNTVkdJRF8wMDAwMDA1MTM0MzY1NjI1OTc5MzUxOTI2MDAwMDAwNzk2ODg4NjU2MTY4OTc0MzgwNV8pOyIgY3g9IjczNy41OTUiIGN5PSIyMTcuNDMyIiByPSIyNS42MjIiLz4NCgkJCQkNCgkJCQkJPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8wMDAwMDE1ODAyMjc4NDk5ODkwNzQwMjY2MDAwMDAxNDAyNTc0OTI0MTIwODk3NTU1MV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMzIyLjM1NDIiIHkxPSI2Ni45NjkxIiB4Mj0iMzczLjU5NzkiIHkyPSI2Ni45NjkxIj4NCgkJCQkJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzNBQTFDNyIvPg0KCQkJCQk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojMzI0Q0ZDIi8+DQoJCQkJPC9saW5lYXJHcmFkaWVudD4NCgkJCQk8Y2lyY2xlIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxNTgwMjI3ODQ5OTg5MDc0MDI2NjAwMDAwMTQwMjU3NDkyNDEyMDg5NzU1NTFfKTsiIGN4PSIzNDcuOTc2IiBjeT0iNjYuOTY5IiByPSIyNS42MjIiLz4NCgkJCTwvZz4NCgkJCQ0KCQkJCTxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxMDM5ODAyMTkwMTU3MDczNTc4NzAwMDAwMDEwMjM1MDE5MTY5NDQ1MDkwOTFfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9Ii0zOTMuMzc4IiB5MT0iODYzLjczNTUiIHgyPSIxOTUuODQ0MSIgeTI9Ijg2My43MzU1Ij4NCgkJCQk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojODZBM0ZDIi8+DQoJCQkJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IzMwQzRDNyIvPg0KCQkJPC9saW5lYXJHcmFkaWVudD4NCgkJCTxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxMDM5ODAyMTkwMTU3MDczNTc4NzAwMDAwMDEwMjM1MDE5MTY5NDQ1MDkwOTFfKTsiIGQ9Ik0tMTY1LjE3NSw5NDcuMTM4TC0xNjUuMTc1LDk0Ny4xMzgNCgkJCQljOS43ODQsOS43ODQsOS43ODQsMjUuNjQ3LDAsMzUuNDMybC03NC42ODMsNzQuNjgzYy05Ljc4NCw5Ljc4NC05Ljc4NCwyNS42NDcsMCwzNS40MzJoMGM5Ljc4NCw5Ljc4NCw5Ljc4NCwyNS42NDcsMCwzNS40MzINCgkJCQlsLTE1LjY2NywxNS42NjdjLTkuNzg0LDkuNzg0LTkuNzg0LDI1LjY0NywwLDM1LjQzMmwwLDBjOS43ODQsOS43ODQsMjUuNjQ3LDkuNzg0LDM1LjQzMiwwTDMxLjc0OCw5MjcuMzc0DQoJCQkJYzkuNzg0LTkuNzg0LDkuNzg0LTI1LjY0NywwLTM1LjQzMmwwLDBjLTkuNzg0LTkuNzg0LTkuNzg0LTI1LjY0NywwLTM1LjQzMmwxNS42NjctMTUuNjY3YzkuNzg0LTkuNzg0LDkuNzg0LTI1LjY0NywwLTM1LjQzMnYwDQoJCQkJYy05Ljc4NC05Ljc4NC05Ljc4NC0yNS42NDcsMC0zNS40MzFsNzQuNjgzLTc0LjY4M2M5Ljc4NC05Ljc4NCw5Ljc4NC0yNS42NDcsMC0zNS40MzFsMCwwYy05Ljc4NC05Ljc4NC0yNS42NDctOS43ODQtMzUuNDMxLDANCgkJCQlsLTQxLjkwOSw0MS45MDljLTkuNzg0LDkuNzg0LTI1LjY0Nyw5Ljc4NC0zNS40MzEsMGwwLDBjLTkuNzg0LTkuNzg0LTI1LjY0Ny05Ljc4NC0zNS40MzIsMGwtNTQuNjQyLDU0LjY0Mg0KCQkJCWMtOS43ODQsOS43ODQtMjUuNjQ3LDkuNzg0LTM1LjQzMSwwbDAsMGMtOS43ODQtOS43ODQtOS43ODQtMjUuNjQ3LDAtMzUuNDMxbDIxLjg2OC0yMS44NjhjOS43ODQtOS43ODQsOS43ODQtMjUuNjQ3LDAtMzUuNDMyaDANCgkJCQljLTkuNzg0LTkuNzg0LTkuNzg0LTI1LjY0NywwLTM1LjQzMmw0NC41NjYtNDQuNTY2YzkuNzg0LTkuNzg0LDkuNzg0LTI1LjY0NywwLTM1LjQzMnYwYy05Ljc4NC05Ljc4NC0yNS42NDctOS43ODQtMzUuNDMyLDANCgkJCQlsLTQ0LjU2Niw0NC41NjZjLTkuNzg0LDkuNzg0LTI1LjY0Nyw5Ljc4NC0zNS40MzIsMGwwLDBjLTkuNzg0LTkuNzg0LTI1LjY0Ny05Ljc4NC0zNS40MzIsMGwtMjUxLjg0MSwyNTEuODQxDQoJCQkJYy05Ljc4NCw5Ljc4NC05Ljc4NCwyNS42NDcsMCwzNS40MzJsMCwwYzkuNzg0LDkuNzg0LDI1LjY0Nyw5Ljc4NCwzNS40MzIsMGw0NC41NjYtNDQuNTY2YzkuNzg0LTkuNzg0LDI1LjY0Ny05Ljc4NCwzNS40MzEsMGgwDQoJCQkJYzkuNzg0LDkuNzg0LDkuNzg0LDI1LjY0NywwLDM1LjQzMmwtNDQuNTY2LDQ0LjU2NmMtOS43ODQsOS43ODQtOS43ODQsMjUuNjQ3LDAsMzUuNDMybDAsMGM5Ljc4NCw5Ljc4NCw5Ljc4NCwyNS42NDcsMCwzNS40MzINCgkJCQlsLTIxLjg2OCwyMS44NjhjLTkuNzg0LDkuNzg0LTkuNzg0LDI1LjY0NywwLDM1LjQzMmwwLDBjOS43ODQsOS43ODQsMjUuNjQ3LDkuNzg0LDM1LjQzMiwwbDU0LjY0Mi01NC42NDINCgkJCQljOS43ODQtOS43ODQsMjUuNjQ3LTkuNzg0LDM1LjQzMiwwbDAsMGM5Ljc4NCw5Ljc4NCwyNS42NDcsOS43ODQsMzUuNDMyLDBsNDEuOTA5LTQxLjkwOQ0KCQkJCUMtMTkwLjgyMiw5MzcuMzU0LTE3NC45NTksOTM3LjM1NC0xNjUuMTc1LDk0Ny4xMzh6Ii8+DQoJCQkNCgkJCQk8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMTA0NzAxNzUyNTQ4OTk2NTY1OTUwMDAwMDE3MDE3MjQ2ODc0NzQxMDk0Nzk5XyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSItOS4zODI1IiB5MT0iMTUwMi4wNjkzIiB4Mj0iNTEwLjgyMzkiIHkyPSIxNTAyLjA2OTMiPg0KCQkJCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiMzQUExQzciLz4NCgkJCQk8c3RvcCAgb2Zmc2V0PSIwLjk5OTIiIHN0eWxlPSJzdG9wLWNvbG9yOiM5MEU1RkMiLz4NCgkJCTwvbGluZWFyR3JhZGllbnQ+DQoJCQk8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMTA0NzAxNzUyNTQ4OTk2NTY1OTUwMDAwMDE3MDE3MjQ2ODc0NzQxMDk0Nzk5Xyk7IiBkPSJNMTYuMzc2LDE1NjUuODcybC0xOC4yNTQsMTguMjU1DQoJCQkJYy0xMC4wMDYsMTAuMDA2LTEwLjAwNiwyNi4yMjksMCwzNi4yMzVoMGMxMC4wMDYsMTAuMDA2LDI2LjIyOSwxMC4wMDYsMzYuMjM1LDBsNjkuOTQ4LTY5Ljk0OA0KCQkJCWMxMC4wMDYtMTAuMDA2LDI2LjIyOS0xMC4wMDYsMzYuMjM1LDBsMCwwYzEwLjAwNiwxMC4wMDYsMTAuMDA2LDI2LjIyOSwwLDM2LjIzNWwtNjkuOTQ4LDY5Ljk0OA0KCQkJCWMtMTAuMDA2LDEwLjAwNi0xMC4wMDYsMjYuMjI5LDAsMzYuMjM1djBjMTAuMDA2LDEwLjAwNiwyNi4yMjksMTAuMDA2LDM2LjIzNSwwbDM4Ljg5OC0zOC44OTkNCgkJCQljMTAuMDA2LTEwLjAwNiwyNi4yMjktMTAuMDA2LDM2LjIzNSwwdjBjMTAuMDA2LDEwLjAwNiwxMC4wMDYsMjYuMjI5LDAsMzYuMjM1bC02OS40NTksNjkuNDU5DQoJCQkJYy0xMC4wMDYsMTAuMDA2LTEwLjAwNiwyNi4yMjksMCwzNi4yMzVsMCwwYzEwLjAwNiwxMC4wMDYsMjYuMjI5LDEwLjAwNiwzNi4yMzUsMGwyODUuMTI2LTI4NS4xMjYNCgkJCQljMTAuMDA2LTEwLjAwNiwxMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDAsMGMtMTAuMDA2LTEwLjAwNi0xMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDY5LjQ1OS02OS40NTkNCgkJCQljMTAuMDA2LTEwLjAwNiwxMC4wMDYtMjYuMjI5LDAtMzYuMjM1aDBjLTEwLjAwNi0xMC4wMDYtMjYuMjI5LTEwLjAwNi0zNi4yMzUsMGwtMzguODk4LDM4Ljg5OA0KCQkJCWMtMTAuMDA2LDEwLjAwNi0yNi4yMjksMTAuMDA2LTM2LjIzNSwwbDAsMGMtMTAuMDA2LTEwLjAwNi0xMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDY5Ljk0OC02OS45NDgNCgkJCQljMTAuMDA2LTEwLjAwNiwxMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDAsMGMtMTAuMDA2LTEwLjAwNi0yNi4yMjktMTAuMDA2LTM2LjIzNSwwbC02OS45NDgsNjkuOTQ4DQoJCQkJYy0xMC4wMDYsMTAuMDA2LTI2LjIyOSwxMC4wMDYtMzYuMjM1LDBsMCwwYy0xMC4wMDYtMTAuMDA2LTEwLjAwNi0yNi4yMjksMC0zNi4yMzVsMTguMjU0LTE4LjI1NQ0KCQkJCWMxMC4wMDYtMTAuMDA2LDEwLjAwNi0yNi4yMjksMC0zNi4yMzVoMGMtMTAuMDA2LTEwLjAwNi0yNi4yMjktMTAuMDA2LTM2LjIzNSwwTDE2LjM3NiwxNDkzLjQwMw0KCQkJCWMtMTAuMDA2LDEwLjAwNi0xMC4wMDYsMjYuMjI5LDAsMzYuMjM1djBDMjYuMzgyLDE1MzkuNjQ0LDI2LjM4MiwxNTU1Ljg2NiwxNi4zNzYsMTU2NS44NzJ6Ii8+DQoJCQkNCgkJCQk8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMDE4MjM4Mzk2MzcyNDUzODc2ODYwMDAwMDAyNDk4NzcxMTUyMDEzNTc5MTg2XyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSItMTA3LjMwODgiIHkxPSIxMjYxLjA5MTgiIHgyPSI0MjEuNTA1NiIgeTI9IjEyNjEuMDkxOCI+DQoJCQkJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzMyNENGQyIvPg0KCQkJCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiM0QkY2RkEiLz4NCgkJCTwvbGluZWFyR3JhZGllbnQ+DQoJCQk8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDE4MjM4Mzk2MzcyNDUzODc2ODYwMDAwMDAyNDk4NzcxMTUyMDEzNTc5MTg2Xyk7IiBkPSJNMzAuMTMyLDE0OTcuNzY4bDI2LjE0Ny0yNi4xNDcNCgkJCQljMTAuMDA2LTEwLjAwNiwyNi4yMjktMTAuMDA2LDM2LjIzNSwwbDAsMGMxMC4wMDYsMTAuMDA2LDI2LjIyOSwxMC4wMDYsMzYuMjM1LDBsMjg1LjM0My0yODUuMzQzDQoJCQkJYzkuODg2LTkuODg2LDkuODg2LTI1LjkxNSwwLTM1LjgwMWwtMC40MzQtMC40MzRjLTkuODg2LTkuODg2LTI1LjkxNS05Ljg4Ni0zNS44MDEsMGwtMjYuMzY0LDI2LjM2NA0KCQkJCWMtMTAuMDA2LDEwLjAwNi0yNi4yMjksMTAuMDA2LTM2LjIzNSwwbDAsMGMtMTAuMDA2LTEwLjAwNi0xMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDcuNTc2LTcuNTc2DQoJCQkJYzkuODg2LTkuODg2LDkuODg2LTI1LjkxNSwwLTM1LjgwMWwtMC40MzQtMC40MzRjLTkuODg2LTkuODg2LTkuODg2LTI1LjkxNSwwLTM1LjgwMWgwYzkuODg2LTkuODg2LDkuODg2LTI1LjkxNSwwLTM1LjgwMQ0KCQkJCWwtMC40MzQtMC40MzRjLTkuODg2LTkuODg2LTI1LjkxNS05Ljg4Ni0zNS44MDEsMGwtMjguNTkyLDI4LjU5MmMtOS44ODYsOS44ODYtMjUuOTE1LDkuODg2LTM1LjgwMSwwbC0wLjQzNC0wLjQzNA0KCQkJCWMtOS44ODYtOS44ODYtMjUuOTE1LTkuODg2LTM1LjgwMSwwbC0yODUuMzQyLDI4NS4zNDNjLTEwLjAwNiwxMC4wMDYtMTAuMDA2LDI2LjIyOSwwLDM2LjIzNWgwDQoJCQkJYzEwLjAwNiwxMC4wMDYsMjYuMjI5LDEwLjAwNiwzNi4yMzUsMGwyOC41OTItMjguNTkyYzkuNzY2LTkuNzY2LDI1LjYwMS05Ljc2NiwzNS4zNjcsMGwwLjg2NywwLjg2OA0KCQkJCWM5Ljc2Niw5Ljc2Niw5Ljc2NiwyNS42MDEsMCwzNS4zNjdsMCwwYy0xMC4wMDYsMTAuMDA2LTEwLjAwNiwyNi4yMjksMCwzNi4yMzRsMCwwYzEwLjAwNiwxMC4wMDYsMTAuMDA2LDI2LjIyOSwwLDM2LjIzNQ0KCQkJCWwtNy4zNTksNy4zNTljLTEwLjAwNiwxMC4wMDYtMTAuMDA2LDI2LjIyOSwwLDM2LjIzNWgwQzMuOTAzLDE1MDcuNzc0LDIwLjEyNiwxNTA3Ljc3NCwzMC4xMzIsMTQ5Ny43Njh6Ii8+DQoJCQkNCgkJCQk8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMDc2NTYxODAzODk2MDkyNDU0MjAwMDAwMDA4ODAxNzIyMTA3NDA1NTY4MTU1XyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSItNDI0LjQ4OTMiIHkxPSIxMjAyLjg5MzYiIHgyPSIyMzQuNTI3MSIgeTI9IjEyMDIuODkzNiI+DQoJCQkJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzMyNENGQyIvPg0KCQkJCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiMzQUExQzciLz4NCgkJCTwvbGluZWFyR3JhZGllbnQ+DQoJCQk8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDc2NTYxODAzODk2MDkyNDU0MjAwMDAwMDA4ODAxNzIyMTA3NDA1NTY4MTU1Xyk7IiBkPSJNLTI3Ny4xNjMsMTI3My44MTNsLTEzOS44MjIsMTM5LjgyMg0KCQkJCWMtMTAuMDA2LDEwLjAwNi0xMC4wMDYsMjYuMjI5LDAsMzYuMjM1djBjMTAuMDA2LDEwLjAwNiwyNi4yMjksMTAuMDA2LDM2LjIzNSwwbDU1LjcwOS01NS43MDkNCgkJCQljMTAuMDA2LTEwLjAwNiwyNi4yMjktMTAuMDA2LDM2LjIzNSwwbDAsMGMxMC4wMDYsMTAuMDA2LDEwLjAwNiwyNi4yMjksMCwzNi4yMzVsLTc4LjM1OCw3OC4zNTgNCgkJCQljLTEwLjAwNiwxMC4wMDYtMTAuMDA2LDI2LjIyOSwwLDM2LjIzNWwwLDBjMTAuMDA2LDEwLjAwNiwyNi4yMjksMTAuMDA2LDM2LjIzNSwwbDE2LjIyMS0xNi4yMjENCgkJCQljMTAuMDA2LTEwLjAwNiwyNi4yMjktMTAuMDA2LDM2LjIzNSwwbDAsMGMxMC4wMDYsMTAuMDA2LDI2LjIyOSwxMC4wMDYsMzYuMjM1LDBsMzQuNDgyLTM0LjQ4MQ0KCQkJCWMxMC4wMDYtMTAuMDA2LDI2LjIyOS0xMC4wMDYsMzYuMjM1LDBsMC44NzcsMC44NzdjOS41MjIsOS41MjIsOS41MjIsMjQuOTYsMCwzNC40ODF2MGMtMTAuMDA2LDEwLjAwNi0xMC4wMDYsMjYuMjI5LDAsMzYuMjM1DQoJCQkJbDAsMGMxMC4wMDYsMTAuMDA2LDI2LjIyOSwxMC4wMDYsMzYuMjM1LDBsMzYxLjYxNy0zNjEuNjE3YzkuNzY0LTkuNzY0LDkuNzY0LTI1LjU5NCwwLTM1LjM1OGwtMC44NzctMC44NzcNCgkJCQljLTkuNzY0LTkuNzY0LTkuNzY0LTI1LjU5NCwwLTM1LjM1OGwwLDBjOS43NjQtOS43NjQsOS43NjQtMjUuNTk0LDAtMzUuMzU4bC0wLjg3Ny0wLjg3N2MtOS43NjQtOS43NjQtMjUuNTk0LTkuNzY0LTM1LjM1OCwwDQoJCQkJbC0zNS4zNTgsMzUuMzU4Yy05Ljc2NCw5Ljc2NC0yNS41OTQsOS43NjQtMzUuMzU4LDBsLTAuODc3LTAuODc3Yy05Ljc2NC05Ljc2NC0yNS41OTQtOS43NjQtMzUuMzU4LDBsLTE2LjY1OSwxNi42NTkNCgkJCQljLTEwLjAwNiwxMC4wMDYtMjYuMjI5LDEwLjAwNi0zNi4yMzUsMGwwLDBjLTEwLjAwNi0xMC4wMDYtMTAuMDA2LTI2LjIyOSwwLTM2LjIzNWw3OC43OTctNzguNzk3DQoJCQkJYzkuNzY0LTkuNzY0LDkuNzY0LTI1LjU5NCwwLTM1LjM1OGwtMC44NzctMC44NzdjLTkuNzY0LTkuNzY0LTI1LjU5NC05Ljc2NC0zNS4zNTgsMGwtNTYuMTQ3LDU2LjE0Nw0KCQkJCWMtMTAuMDA2LDEwLjAwNi0yNi4yMjksMTAuMDA2LTM2LjIzNSwwbDAsMGMtMTAuMDA2LTEwLjAwNi0xMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDE0MC4yNi0xNDAuMjYNCgkJCQljOS43NjQtOS43NjQsOS43NjQtMjUuNTk0LDAtMzUuMzU4bC0wLjg3Ny0wLjg3N2MtOS43NjQtOS43NjQtMjUuNTk0LTkuNzY0LTM1LjM1OCwwbC0zNjEuNjE3LDM2MS42MTcNCgkJCQljLTEwLjAwNiwxMC4wMDYtMTAuMDA2LDI2LjIyOSwwLDM2LjIzNWwwLDBDLTI2Ny4xNTcsMTI0Ny41ODQtMjY3LjE1NywxMjYzLjgwNy0yNzcuMTYzLDEyNzMuODEzeiIvPg0KCQkJDQoJCQkJPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8wMDAwMDE1ODAwNzY4NjAwNTYxMTUxMDM1MDAwMDAwNzMxNzY1NTEzNjM2NTMxNzAyM18iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTA3LjE1NDciIHkxPSI5NzEuNzY2MSIgeDI9IjE1OC4zOTgzIiB5Mj0iOTcxLjc2NjEiPg0KCQkJCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiM0QkY2RkEiLz4NCgkJCQk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojMzI0Q0ZDIi8+DQoJCQk8L2xpbmVhckdyYWRpZW50Pg0KCQkJPGNpcmNsZSBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMTU4MDA3Njg2MDA1NjExNTEwMzUwMDAwMDA3MzE3NjU1MTM2MzY1MzE3MDIzXyk7IiBjeD0iMTMyLjc3NiIgY3k9Ijk3MS43NjYiIHI9IjI1LjYyMiIvPg0KCQkJDQoJCQkJPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8wMDAwMDA2MTQ0OTQ2NTg0Mjk3Nzg0NzE5MDAwMDAwMTQxMDE1MDA1MTkyODAyMjE4MF8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iNy43NDEzIiB5MT0iNjY0LjAyMjciIHgyPSI1OC45ODUiIHkyPSI2NjQuMDIyNyI+DQoJCQkJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzNBQTFDNyIvPg0KCQkJCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiMzMjRDRkMiLz4NCgkJCTwvbGluZWFyR3JhZGllbnQ+DQoJCQk8Y2lyY2xlIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAwNjE0NDk0NjU4NDI5Nzc4NDcxOTAwMDAwMDE0MTAxNTAwNTE5MjgwMjIxODBfKTsiIGN4PSIzMy4zNjMiIGN5PSI2NjQuMDIzIiByPSIyNS42MjIiLz4NCgkJCQ0KCQkJCTxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxNzk2NDg1MTgxMDc0MjY3Mzc2NzAwMDAwMDQ4MzUxMDczNjQ2OTEwMTQ4MDlfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjU5Ny4xMDkyIiB5MT0iODYzLjI0MTciIHgyPSIxMjYwLjk2MzQiIHkyPSI4NjMuMjQxNyIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgwIDEgMSAwIC00MDQuODU1IDQwNC44NTUpIj4NCgkJCQk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojM0FBMUM3Ii8+DQoJCQkJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IzMyNENGQyIvPg0KCQkJPC9saW5lYXJHcmFkaWVudD4NCgkJCTxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxNzk2NDg1MTgxMDc0MjY3Mzc2NzAwMDAwMDQ4MzUxMDczNjQ2OTEwMTQ4MDlfKTsiIGQ9Ik0zNTYuNzM3LDE2NTguNDA0bC0wLjQzNC0wLjQzNA0KCQkJCWMtOS44ODUtOS44ODctOS44ODQtMjUuOTE2LDAuMDAyLTM1LjgwMmw0LjI1LTQuMjVjOS44ODYtOS44ODcsOS44ODctMjUuOTE1LDAuMDAyLTM1LjgwMmwtMC40MzQtMC40MzQNCgkJCQljLTkuODg1LTkuODg4LTkuODg0LTI1LjkxNywwLjAwMi0zNS44MDNsMzguMzI4LTM4LjMyOGMxMC4wMDYtMTAuMDA2LDEwLjAwNi0yNi4yMjksMC0zNi4yMzVsMCwwDQoJCQkJYy0xMC4wMDYtMTAuMDA2LTI2LjIyOS0xMC4wMDYtMzYuMjM1LDBsLTU2LjY0Nyw1Ni42NDdjLTkuODg2LDkuODg2LTI1LjkxNCw5Ljg4Ni0zNS44LTAuMDAxbC0wLjQzNC0wLjQzNA0KCQkJCWMtOS44ODYtOS44ODctOS44ODUtMjUuOTE2LDAuMDAxLTM1LjgwMmwxMjQuNjYxLTEyNC42NjFjMTAuMDA2LTEwLjAwNiwxMC4wMDYtMjYuMjI5LDAtMzYuMjM1bDAsMA0KCQkJCWMtMTAuMDA2LTEwLjAwNi0yNi4yMjktMTAuMDA2LTM2LjIzNSwwbC0xMjQuNjYyLDEyNC42NjJjLTkuODg2LDkuODg2LTI1LjkxNSw5Ljg4Ni0zNS44MDEsMGwtMC40MzQtMC40MzQNCgkJCQljLTkuODg2LTkuODg3LTkuODg1LTI1LjkxNiwwLjAwMS0zNS44MDJsMjg1LjM0MS0yODUuMzQyYzEwLjAwNi0xMC4wMDYsMjYuMjI5LTEwLjAwNiwzNi4yMzUsMHYwDQoJCQkJYzEwLjAwNiwxMC4wMDYsMjYuMjI5LDEwLjAwNiwzNi4yMzUsMGwxMjQuNDQ1LTEyNC40NDVjMTAuMDA2LTEwLjAwNiwyNi4yMjktMTAuMDA2LDM2LjIzNSwwbDAsMA0KCQkJCWMxMC4wMDYsMTAuMDA2LDEwLjAwNiwyNi4yMjksMCwzNi4yMzVsLTEyNC40NDUsMTI0LjQ0NmMtMTAuMDA2LDEwLjAwNi0xMC4wMDYsMjYuMjI5LDAsMzYuMjM1aDANCgkJCQljMTAuMDA2LDEwLjAwNiwyNi4yMjksMTAuMDA2LDM2LjIzNSwwbDU2LjQyOS01Ni40MjljMTAuMDA2LTEwLjAwNiwyNi4yMjktMTAuMDA2LDM2LjIzNSwwaDANCgkJCQljMTAuMDA2LDEwLjAwNiwxMC4wMDYsMjYuMjI5LDAsMzYuMjM1bC0zOC4xMTQsMzguMTE0Yy0xMC4wMDYsMTAuMDA2LTEwLjAwNiwyNi4yMjksMCwzNi4yMzVsMCwwDQoJCQkJYzEwLjAwNiwxMC4wMDYsMTAuMDA2LDI2LjIyOSwwLDM2LjIzNWwtMy44MiwzLjgyYy0xMC4wMDYsMTAuMDA2LTEwLjAwNiwyNi4yMjksMCwzNi4yMzVoMA0KCQkJCWMxMC4wMDYsMTAuMDA2LDEwLjAwNiwyNi4yMjksMCwzNi4yMzVsLTI4NS4zNDIsMjg1LjM0M0MzODIuNjUyLDE2NjguMjksMzY2LjYyMywxNjY4LjI5LDM1Ni43MzcsMTY1OC40MDR6Ii8+DQoJCQkNCgkJCQk8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMTQyODY1MzE4NjI2NDY0Nzg3MzYwMDAwMDA4NTQwNDAxMjQwNzE4NTUyNzI5XyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSI1MTQuMDI2NyIgeTE9IjExMDIuMjA1NiIgeDI9IjU2NS4yNzA0IiB5Mj0iMTEwMi4yMDU2Ij4NCgkJCQk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojNEJGNkZBIi8+DQoJCQkJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IzMyNENGQyIvPg0KCQkJPC9saW5lYXJHcmFkaWVudD4NCgkJCTxjaXJjbGUgc3R5bGU9ImZpbGw6dXJsKCNTVkdJRF8wMDAwMDE0Mjg2NTMxODYyNjQ2NDc4NzM2MDAwMDAwODU0MDQwMTI0MDcxODU1MjcyOV8pOyIgY3g9IjUzOS42NDkiIGN5PSIxMTAyLjIwNiIgcj0iMjUuNjIyIi8+DQoJCTwvZz4NCgk8L2c+DQo8L2c+DQo8L3N2Zz4NCg==';
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