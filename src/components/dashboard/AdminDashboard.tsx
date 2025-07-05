import React, { useState, useEffect, useRef } from 'react';
import { Users, Activity, DollarSign, TrendingUp, Eye, Settings, UserCheck, UserX, Trash2, Clock, Megaphone, Edit, Plus, Download, PlusCircle, MinusCircle, FileSpreadsheet, Trophy } from 'lucide-react';
import { User, Reel } from '../../types';
import { authService } from '../../services/authService';
import { trackingService } from '../../services/trackingService';
import { AdminAccountApproval } from '../admin/AdminAccountApproval';
import { NotificationCenter } from '../common/NotificationCenter';
import { formatViews, formatCurrency } from '../../utils/instagram';
import { accountService } from '../../services/accountService';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'reels' | 'campaigns' | 'instagram'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [selectedReels, setSelectedReels] = useState<string[]>([]);
  const [campaignForm, setCampaignForm] = useState({
    name: '', pay_rate: '', total_budget: '', description: '', requirements: '', platform: ['instagram'], status: 'active'
  });
  const [stats, setStats] = useState({ totalReels: 0, totalViews: 0, totalPayout: '0.00', activeReels: 0 });
  const [showViewEditModal, setShowViewEditModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [viewEditAmount, setViewEditAmount] = useState('');
  const [viewEditAction, setViewEditAction] = useState<'add' | 'remove'>('add');
  const [instagramAccounts, setInstagramAccounts] = useState<any[]>([]);
  const [instagramStats, setInstagramStats] = useState({ totalAccounts: 0, activeAccounts: 0, connectedUsers: 0 });
  const [pendingInstagramAccounts, setPendingInstagramAccounts] = useState<any[]>([]);

  // Add status options
  const CAMPAIGN_STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'payment_processing', label: 'Payment Processing' },
    { value: 'budget_ended', label: 'Budget Ended' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'coming_soon', label: 'Coming Soon' },
  ];

  useEffect(() => {
    loadData();
    loadCampaigns();
    loadStats();
    loadInstagramAccounts();
    loadInstagramStats();
    loadPendingInstagramAccounts();
  }, []);

  const loadData = async () => {
    try {
      const usersData = await authService.getAllUsers();
      setUsers(usersData);
      // Fetch all reels for admin
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/reels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allReels = await res.json();
      setReels(allReels);
    } catch (error) {
      console.error('AdminDashboard: Failed to load data:', error);
    }
  };

  const loadCampaigns = async () => {
    const res = await fetch('/api/campaigns');
    setCampaigns(await res.json());
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('AdminDashboard: Failed to load stats:', error);
    }
  };

  const loadInstagramAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/instagram-accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const accounts = await res.json();
      setInstagramAccounts(accounts);
    } catch (error) {
      console.error('AdminDashboard: Failed to load Instagram accounts:', error);
      setInstagramAccounts([]);
    }
  };

  const loadInstagramStats = async () => {
    // TODO: Implement this endpoint in backend
    // try {
    //   const token = localStorage.getItem('token');
    //   const res = await fetch('/api/admin/instagram-stats', {
    //     headers: { 'Authorization': `Bearer ${token}` }
    //   });
    //   const stats = await res.json();
    //   setInstagramStats(stats);
    // } catch (error) {
    //   console.error('AdminDashboard: Failed to load Instagram stats:', error);
    // }
  };

  const loadPendingInstagramAccounts = async () => {
    try {
      const accounts = await accountService.getPendingAccounts();
      setPendingInstagramAccounts(accounts);
    } catch (error) {
      setPendingInstagramAccounts([]);
    }
  };

  const handleApproveUser = async (userId: string) => {
    console.log('AdminDashboard: Approving user:', userId);
    try {
      const success = await authService.approveUser(userId);
      console.log('AdminDashboard: Approve result:', success);
      if (success) {
        await loadData();
      } else {
        alert('Failed to approve user');
      }
    } catch (error) {
      console.error('AdminDashboard: Failed to approve user:', error);
      alert('An error occurred while approving the user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const success = await authService.deleteUser(userId);
        if (success) {
          await loadData();
        }
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (confirm('Are you sure you want to delete this reel?')) {
      try {
        const response = await fetch(`/api/admin/reels/${reelId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
          loadData();
        } else {
          alert('Failed to delete reel');
        }
      } catch (error) {
        console.error('Delete reel error:', error);
        alert('Failed to delete reel');
      }
    }
  };

  const handleBulkDeleteReels = async () => {
    if (selectedReels.length === 0) {
      alert('Please select reels to delete');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedReels.length} selected reels?`)) {
      try {
        const response = await fetch('/api/admin/reels/bulk-delete', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          },
          body: JSON.stringify({ reelIds: selectedReels })
        });
        
        if (response.ok) {
          setSelectedReels([]);
          loadData();
        } else {
          alert('Failed to delete reels');
        }
      } catch (error) {
        console.error('Bulk delete reels error:', error);
        alert('Failed to delete reels');
      }
    }
  };

  const handleSelectAllReels = (checked: boolean) => {
    if (checked) {
      setSelectedReels(reels.map(reel => reel.id));
    } else {
      setSelectedReels([]);
    }
  };

  const handleSelectReel = (reelId: string, checked: boolean) => {
    if (checked) {
      setSelectedReels(prev => [...prev, reelId]);
    } else {
      setSelectedReels(prev => prev.filter(id => id !== reelId));
    }
  };

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      await trackingService.forceUpdateAll();
      loadData();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ ...campaignForm, platform: campaignForm.platform.join(','), status: campaignForm.status })
    });
    setShowCampaignForm(false);
    setCampaignForm({ name: '', pay_rate: '', total_budget: '', description: '', requirements: '', platform: ['instagram'], status: 'active' });
    loadCampaigns();
  };

  const handleEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      pay_rate: campaign.pay_rate.toString(),
      total_budget: campaign.total_budget.toString(),
      description: campaign.description || '',
      requirements: campaign.requirements || '',
      platform: campaign.platform ? campaign.platform.split(',') : ['instagram'],
      status: campaign.status
    });
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    
    try {
      const response = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...campaignForm, platform: campaignForm.platform.join(','), status: campaignForm.status })
      });
      
      if (response.ok) {
        setEditingCampaign(null);
        setCampaignForm({ name: '', pay_rate: '', total_budget: '', description: '', requirements: '', platform: ['instagram'], status: 'active' });
        loadCampaigns();
      } else {
        alert('Failed to update campaign');
      }
    } catch (error) {
      console.error('Update campaign error:', error);
      alert('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        loadCampaigns();
      } else {
        alert('Failed to delete campaign');
      }
    } catch (error) {
      console.error('Delete campaign error:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleExportCampaignReels = async (campaignId: string, campaignName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/campaigns/${campaignId}/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${campaignName}_reels_export.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export campaign reels');
      }
    } catch (error) {
      console.error('Export campaign reels error:', error);
      alert('Failed to export campaign reels');
    }
  };

  const handleExportAllReels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/reels/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'all_reels_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export all reels');
      }
    } catch (error) {
      console.error('Export all reels error:', error);
      alert('Failed to export all reels');
    }
  };

  const handleApproveInstagramAccount = async (accountId: number) => {
    await accountService.approveAccount(accountId);
    loadPendingInstagramAccounts();
    loadInstagramAccounts();
  };

  const handleRejectInstagramAccount = async (accountId: number) => {
    await accountService.rejectAccount(accountId);
    loadPendingInstagramAccounts();
    loadInstagramAccounts();
  };

  const handleEditUserViews = (user: User) => {
    setSelectedUserForEdit(user);
    setViewEditAmount('');
    setViewEditAction('add');
    setShowViewEditModal(true);
  };

  const handleUpdateUserViews = async () => {
    if (!selectedUserForEdit || !viewEditAmount || isNaN(Number(viewEditAmount))) {
      alert('Please enter a valid number');
      return;
    }

    const amount = parseInt(viewEditAmount);
    if (amount <= 0) {
      alert('Please enter a positive number');
      return;
    }

    try {
      const token = authService.getToken();
      const response = await fetch(`/api/admin/users/${selectedUserForEdit.id}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: viewEditAction, 
          amount: amount 
        })
      });
      
      if (response.ok) {
        setShowViewEditModal(false);
        setSelectedUserForEdit(null);
        setViewEditAmount('');
        alert(`Successfully ${viewEditAction === 'add' ? 'added' : 'removed'} ${amount.toLocaleString()} views to ${selectedUserForEdit.username}`);
      } else {
        let errorMessage = 'Failed to edit views';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response.json() fails, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating user views:', error);
      alert('Error updating user views');
    }
  };

  const handleExportCampaignSummary = async (campaignId: string, campaignName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/campaigns/${campaignId}/export-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${campaignName}_summary.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export campaign summary');
      }
    } catch (error) {
      console.error('Export campaign summary error:', error);
      alert('Failed to export campaign summary');
    }
  };

  const handleDownloadLeaderboardImage = async (campaignId: string, campaignName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/campaigns/${campaignId}/leaderboard-image`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${campaignName}_leaderboard.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download leaderboard image');
      }
    } catch (error) {
      console.error('Download leaderboard image error:', error);
      alert('Failed to download leaderboard image');
    }
  };

  const pendingUsers = users.filter(u => u.isApproved === null || u.isApproved === false);
  
  console.log('AdminDashboard: Total users:', users.length);
  console.log('AdminDashboard: Pending users:', pendingUsers.length);
  console.log('AdminDashboard: Pending users data:', pendingUsers.map(u => ({ id: u.id, username: u.username, isApproved: u.isApproved })));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* --- [Notification Bell Top Right] --- */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex flex-row justify-between items-start sm:items-center py-6 gap-4 md:gap-0">
            {/* Left: Heading and tagline */}
            <div className="flex flex-col flex-1">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-gray-600">Manage users, reels, and tracking</p>
                </div>
                {/* Notification button always on right of tagline on mobile and desktop */}
                <div className="ml-2">
                  <NotificationCenter />
                </div>
              </div>
            </div>
            {/* Right: Force Update and Logout (row on desktop, below on mobile) */}
            <div className="hidden sm:flex flex-row items-center space-x-2 sm:space-x-4 ml-auto">
              <button
                onClick={handleForceUpdate}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
              >
                <Activity className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Updating...' : 'Force Update'}</span>
              </button>
              <button
                onClick={onLogout}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg text-base transition-all border border-red-200"
              >
                Logout
              </button>
            </div>
          </div>
          {/* Mobile: Force Update and Logout below header row */}
          <div className="flex sm:hidden flex-row items-center justify-end space-x-2 mb-4">
            <button
              onClick={handleForceUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 w-full"
            >
              <Activity className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Updating...' : 'Force Update'}</span>
            </button>
            <button
              onClick={onLogout}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg text-base transition-all border border-red-200 w-full"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {/* --- [Notification Bell Top Right END] --- */}

      {/* --- [Add margin to main content to avoid overlap] --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex justify-between px-2 sm:px-6">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp }, 
                { id: 'accounts', label: 'Account Approvals', icon: Clock }, 
                { id: 'reels', label: 'Reels', icon: Eye }, 
                { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
                { id: 'instagram', label: 'Instagram Accounts', icon: Users }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex-1 py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors min-w-0 text-center ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={{ minWidth: 0 }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="h-4 w-4 mx-auto" />
                    <span>{label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-orange-100">{users.filter(u => !u.isApproved).length} pending approval</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-100">Total Instagram Accounts</p>
                    <p className="text-2xl font-bold">{instagramAccounts.length}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-100">Total Reels</p>
                    <p className="text-2xl font-bold">{stats.totalReels}</p>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-full">
                    <Eye className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-green-100">{stats.activeReels} active</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-100">Total Views</p>
                    <p className="text-2xl font-bold">{formatViews(stats.totalViews)}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-100">Total Payouts</p>
                    <p className="text-2xl font-bold">{formatCurrency(Number(stats.totalPayout))}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Approvals */}
            {pendingUsers.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending User Approvals</h3>
                <div className="space-y-4">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-yellow-50 rounded-lg gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-row gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center justify-center space-x-1 w-1/2 sm:w-auto min-w-[70px]"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs flex items-center justify-center space-x-1 w-1/2 sm:w-auto min-w-[70px]"
                        >
                          <UserX className="h-3 w-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingInstagramAccounts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Instagram Account Approvals</h3>
                <div className="space-y-4">
                  {pendingInstagramAccounts.map(account => (
                    <div key={account.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-purple-50 rounded-lg gap-3">
                      <div>
                        <p className="font-medium text-gray-900">@{account.username}</p>
                        <p className="text-sm text-gray-600">{account.user_email}</p>
                        <p className="text-xs text-gray-500">Submitted: {new Date(account.submitted_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-row gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleApproveInstagramAccount(account.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center justify-center space-x-1 w-1/2 sm:w-auto min-w-[70px]"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectInstagramAccount(account.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs flex items-center justify-center space-x-1 w-1/2 sm:w-auto min-w-[70px]"
                        >
                          <UserX className="h-3 w-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instagram Accounts Tab */}
        {activeTab === 'instagram' && (
          <div className="space-y-8">
            {/* Instagram Accounts Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Total Instagram Accounts</p>
                    <p className="text-3xl font-bold">{instagramAccounts.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Active Accounts</p>
                    <p className="text-3xl font-bold">{instagramAccounts.filter(acc => acc.is_approved).length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Connected Users</p>
                    <p className="text-3xl font-bold">{[...new Set(instagramAccounts.map(acc => acc.user_id))].length}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-200" />
                </div>
              </div>
            </div>

            {/* Pending Instagram Account Approvals */}
            {pendingInstagramAccounts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-purple-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    Pending Instagram Account Approvals ({pendingInstagramAccounts.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingInstagramAccounts.map(account => (
                    <div key={account.id} className="p-6 hover:bg-yellow-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                          {account.username?.charAt(0)?.toUpperCase() || 'I'}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">@{account.username}</h4>
                          <p className="text-gray-600">{account.user_email}</p>
                          <span className="text-xs text-gray-500">Submitted: {new Date(account.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1 w-full sm:w-auto min-w-0">
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to remove this Instagram account?')) {
                              await accountService.removeAccount(account.id, true);
                              loadInstagramAccounts();
                            }
                          }}
                          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-1 text-xs flex-1 min-w-0"
                        >
                          <UserX className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instagram Accounts Management */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Instagram Accounts ({instagramAccounts.length})
                </h3>
              </div>
              {instagramAccounts.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Instagram accounts found</h3>
                  <p className="text-gray-600">Instagram accounts will appear here once users connect their accounts.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {instagramAccounts.map((account: any) => (
                    <div key={account.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                            {account.username?.charAt(0)?.toUpperCase() || 'I'}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">@{account.username}</h4>
                            <p className="text-gray-600">{account.user_username} ({account.user_email})</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                account.is_active 
                            ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                        }`}>
                                <Activity className="h-3 w-3 mr-1" />
                                {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                              <span className="text-sm text-gray-500">
                                Connected: {new Date(account.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 w-full sm:w-auto min-w-0">
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to remove this Instagram account?')) {
                                await accountService.removeAccount(account.id, true);
                                loadInstagramAccounts();
                              }
                            }}
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-1 text-xs flex-1 min-w-0"
                          >
                            <UserX className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Approvals Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-8">
            {/* Account Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Approved Users</p>
                    <p className="text-3xl font-bold">{users.filter(u => u.isApproved).length}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Pending Approvals</p>
                    <p className="text-3xl font-bold">{pendingUsers.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Users</p>
                    <p className="text-3xl font-bold">{users.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </div>
            </div>

            {/* Account Management Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-green-600" /> Account Management
              </h2>
              <p className="text-gray-600 mt-1">Manage user accounts and approvals</p>
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    Pending Approvals ({pendingUsers.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{user.username}</h4>
                            <p className="text-gray-600">{user.email}</p>
                            <p className="text-sm text-gray-500">Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-3">
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                          >
                            <UserCheck className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                          >
                            <UserX className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Working Accounts Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Working Accounts ({users.filter(u => u.isApproved).length})
                </h3>
              </div>
              {users.filter(u => u.isApproved).length === 0 ? (
                <div className="p-12 text-center">
                  <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No approved users yet</h3>
                  <p className="text-gray-600">Approved users will appear here once you approve pending accounts.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {users.filter(u => u.isApproved).map(user => (
                    <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{user.username}</h4>
                            <p className="text-gray-600">{user.email}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Approved
                              </span>
                              <span className="text-sm text-gray-500">
                                Joined: {new Date(user.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 w-full sm:w-auto min-w-0">
                          <button
                            onClick={() => handleEditUserViews(user)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center text-xs flex-1 min-w-0 min-w-[44px] w-[44px] h-[44px] p-0 sm:px-2 sm:py-1 sm:w-auto sm:h-auto sm:gap-1"
                            title="Edit Views"
                          >
                            <Edit className="h-5 w-5" />
                            <span className="hidden sm:inline">Edit Views</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center text-xs flex-1 min-w-0 min-w-[44px] w-[44px] h-[44px] p-0 sm:px-2 sm:py-1 sm:w-auto sm:h-auto sm:gap-1"
                            title="Delete User"
                          >
                            <Trash2 className="h-5 w-5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reels Tab */}
        {activeTab === 'reels' && (
          <div className="space-y-8">
            {/* Reels Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Reels</p>
                    <p className="text-3xl font-bold">{reels.length}</p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Views</p>
                    <p className="text-3xl font-bold">{formatViews(stats.totalViews)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Active Reels</p>
                    <p className="text-3xl font-bold">{reels.filter(r => r.isActive).length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Est. Payout</p>
                    <p className="text-3xl font-bold">{formatCurrency(Number(stats.totalPayout))}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-200" />
                </div>
              </div>
            </div>

            {/* Reels Management Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-blue-600" /> Reel Management
                </h2>
                <p className="text-gray-600 mt-1">View and manage all reels grouped by campaigns</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportAllReels}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export All Reels
                </button>
              {selectedReels.length > 0 && (
                <button
                  onClick={handleBulkDeleteReels}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                    <Trash2 className="h-5 w-5" />
                  Delete Selected ({selectedReels.length})
                </button>
              )}
            </div>
            </div>

            {/* Reels by Campaign */}
            {reels.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reels found</h3>
                <p className="text-gray-600">Reels will appear here once users start submitting content.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group reels by campaign */}
                {(() => {
                  const reelsByCampaign: { [key: string]: any[] } = {};
                  
                  reels.forEach(reel => {
                    const campaignName = reel.campaign?.name || 'General Reels';
                    if (!reelsByCampaign[campaignName]) {
                      reelsByCampaign[campaignName] = [];
                    }
                    reelsByCampaign[campaignName].push(reel);
                  });

                  return Object.entries(reelsByCampaign).map(([campaignName, campaignReels]) => (
                    <div key={campaignName} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                              <Megaphone className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{campaignName}</h3>
                              <p className="text-sm text-gray-600">{campaignReels.length} reels</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Total Views</p>
                              <p className="text-lg font-bold text-blue-600">
                                {formatViews(campaignReels.reduce((total, r) => total + (r.views || 0), 0))}
                              </p>
                            </div>
                            {campaignName !== 'General Reels' && campaignReels[0]?.campaign?.id && (
                              <button
                                onClick={() => handleExportCampaignReels(campaignReels[0].campaign.id, campaignName)}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Export
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                              <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                                  checked={campaignReels.every(reel => selectedReels.includes(reel.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedReels(prev => [...new Set([...prev, ...campaignReels.map(r => r.id)])]);
                                    } else {
                                      setSelectedReels(prev => prev.filter(id => !campaignReels.map(r => r.id).includes(id)));
                                    }
                                  }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reel</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Likes</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                            {campaignReels.map(reel => (
                              <tr key={reel.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedReels.includes(reel.id)}
                            onChange={(e) => handleSelectReel(reel.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
                                      {reel.username?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">@{reel.username || 'unknown'}</div>
                                      <div className="text-sm text-gray-500">{reel.shortcode || 'N/A'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-3">
                                    <img 
                                      src={reel.thumbnail} 
                                      alt="" 
                                      className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                      onError={(e) => {
                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkgyNFYyNEgxNlYxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                                      }}
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{reel.shortcode || 'N/A'}</p>
                                      <p className="text-xs text-gray-500">{reel.caption?.substring(0, 50) || 'No caption'}...</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                  {formatViews(reel.views || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                  {reel.likes && reel.likes > 0 ? formatViews(reel.likes) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                  {reel.comments && reel.comments > 0 ? formatViews(reel.comments) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {reel.submittedAt ? new Date(reel.submittedAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <a
                                      href={reel.url || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 transition-colors"
                                      title="View Post"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </a>
                          <button
                            onClick={() => handleDeleteReel(reel.id)}
                                      className="text-red-600 hover:text-red-800 transition-colors"
                                      title="Delete Reel"
                          >
                                      <Trash2 className="h-4 w-4" />
                          </button>
                                  </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-8">
            {/* Campaign Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Total Campaigns</p>
                    <p className="text-3xl font-bold">{campaigns.length}</p>
                  </div>
                  <Megaphone className="h-8 w-8 text-purple-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Active Users</p>
                    <p className="text-3xl font-bold">{Number(campaigns.reduce((total, c) => total + (Number(c.active_users) || 0), 0))}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Views</p>
                    <p className="text-3xl font-bold">{formatViews(stats.totalViews)}</p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Est. Payout</p>
                    <p className="text-3xl font-bold">{formatCurrency(Number(stats.totalPayout))}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-200" />
                </div>
              </div>
            </div>

            {/* Campaign Management Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="h-6 w-6 text-purple-600" /> Campaign Management
              </h2>
                <p className="text-gray-600 mt-1">Create and manage campaigns with detailed analytics</p>
              </div>
              {!editingCampaign && (
                <button
                  onClick={() => setShowCampaignForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create Campaign
                </button>
              )}
            </div>

            {/* Campaign Form */}
            {(showCampaignForm || editingCampaign) && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                </h3>
                <form onSubmit={editingCampaign ? handleUpdateCampaign : handleCreateCampaign} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                      <input 
                        required 
                        value={campaignForm.name} 
                        onChange={e => setCampaignForm(f => ({...f, name: e.target.value}))} 
                        placeholder="Enter campaign name" 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pay Rate ($ per 1M views)</label>
                      <input 
                        required 
                        type="number" 
                        value={campaignForm.pay_rate} 
                        onChange={e => setCampaignForm(f => ({...f, pay_rate: e.target.value}))} 
                        placeholder="25.00" 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Budget ($)</label>
                      <input 
                        required 
                        type="number" 
                        value={campaignForm.total_budget} 
                        onChange={e => setCampaignForm(f => ({...f, total_budget: e.target.value}))} 
                        placeholder="5000.00" 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
                      <select 
                        multiple 
                        value={campaignForm.platform} 
                        onChange={e => {
                    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                    setCampaignForm(f => ({...f, platform: options}));
                        }} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="twitter">Twitter/X</option>
                  </select>
                </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={campaignForm.status}
                        onChange={e => setCampaignForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {CAMPAIGN_STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea 
                        value={campaignForm.description} 
                        onChange={e => setCampaignForm(f => ({...f, description: e.target.value}))} 
                        placeholder="Campaign description..." 
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                      <textarea 
                        value={campaignForm.requirements} 
                        onChange={e => setCampaignForm(f => ({...f, requirements: e.target.value}))} 
                        placeholder="Campaign requirements..." 
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none" 
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        type="submit" 
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                      >
                        {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                    </button>
                      <button 
                        type="button" 
                        onClick={() => {
                      setShowCampaignForm(false);
                      setEditingCampaign(null);
                      setCampaignForm({ name: '', pay_rate: '', total_budget: '', description: '', requirements: '', platform: ['instagram'], status: 'active' });
                        }} 
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                      >
                        Cancel
                      </button>
                  </div>
                  </div>
                </form>
              </div>
            )}

            {/* Campaigns List */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">All Campaigns</h3>
              </div>
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No campaigns found. Create your first campaign to get started!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                      {campaigns.map((c: any) => (
                    <div key={c.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                              <Megaphone className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
                              <p className="text-sm text-gray-600">{c.description}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            <div className="bg-blue-50 rounded-lg p-2">
                              <p className="text-[10px] text-blue-600 font-medium">Active Users</p>
                              <p className="text-base font-bold text-blue-900">{c.active_users || 0}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2">
                              <p className="text-[10px] text-green-600 font-medium">Total Views</p>
                              <p className="text-base font-bold text-green-900">{formatViews(c.total_views || 0)}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-2">
                              <p className="text-[10px] text-purple-600 font-medium">Pay Rate</p>
                              <p className="text-base font-bold text-purple-900">${c.pay_rate}/1M</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-2">
                              <p className="text-[10px] text-yellow-600 font-medium">Est. Payout</p>
                              <p className="text-base font-bold text-yellow-900">{formatCurrency(c.estimated_payout || 0)}</p>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            <p><strong>Requirements:</strong> {c.requirements}</p>
                            <p><strong>Budget:</strong> ${c.total_budget} | <strong>Created:</strong> {new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-row gap-2 ml-auto justify-end w-auto mt-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800 transition-colors font-bold underline focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center w-8 h-8 p-0" 
                            title="Edit" 
                            onClick={() => handleEditCampaign(c)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleExportCampaignSummary(c.id, c.name)}
                            className="text-gray-400 hover:text-emerald-600 transition-colors flex items-center justify-center w-8 h-8 p-0"
                            title="Export User Summary"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="sr-only">Export User Summary</span>
                          </button>
                          <button
                            onClick={() => handleDownloadLeaderboardImage(c.id, c.name)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center w-8 h-8 p-0"
                            title="Download Leaderboard Image"
                          >
                            <Trophy className="h-4 w-4" />
                            <span className="sr-only">Download Leaderboard Image</span>
                          </button>
                          <button 
                            className="text-gray-400 hover:text-red-600 transition-colors flex items-center justify-center w-8 h-8 p-0" 
                            title="Delete" 
                            onClick={() => handleDeleteCampaign(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Edit Modal */}
        {showViewEditModal && selectedUserForEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit User Views</h3>
                <button
                  onClick={() => setShowViewEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Editing views for: <span className="font-semibold text-gray-900">{selectedUserForEdit.username}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewEditAction('add')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      viewEditAction === 'add'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <PlusCircle className="h-4 w-4 inline mr-2" />
                    Add Views
                  </button>
                  <button
                    onClick={() => setViewEditAction('remove')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      viewEditAction === 'remove'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <MinusCircle className="h-4 w-4 inline mr-2" />
                    Remove Views
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Views to {viewEditAction === 'add' ? 'Add' : 'Remove'}
                </label>
                <input
                  type="number"
                  value={viewEditAmount}
                  onChange={(e) => setViewEditAmount(e.target.value)}
                  placeholder="Enter number of views"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  min="1"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateUserViews}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    viewEditAction === 'add'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {viewEditAction === 'add' ? 'Add Views' : 'Remove Views'}
                </button>
                <button
                  onClick={() => setShowViewEditModal(false)}
                  className="flex-1 py-3 px-4 rounded-lg font-semibold bg-gray-300 hover:bg-gray-400 text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}