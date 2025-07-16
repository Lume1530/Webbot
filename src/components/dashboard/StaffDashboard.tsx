import React, { useState, useEffect } from 'react';
import { Users, Eye, UserCheck, UserX, Trash2, Clock, LogOut, Shield } from 'lucide-react';
import { User, Reel } from '../../types';
import { authService } from '../../services/authService';
import { accountService } from '../../services/accountService';
import { NotificationCenter } from '../common/NotificationCenter';
import { toast } from 'sonner';
const API_BASE_URL = '/api';

interface StaffDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export function StaffDashboard({ currentUser, onLogout }: StaffDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'instagram' | 'reels'>('accounts');
  const [instagramAccounts, setInstagramAccounts] = useState<any[]>([]);
  const [pendingInstagramAccounts, setPendingInstagramAccounts] = useState<any[]>([]);
  const [selectedReels, setSelectedReels] = useState<string[]>([]);

  useEffect(() => {
    loadData();
    loadInstagramAccounts();
    loadPendingInstagramAccounts();
  }, []);

  const loadData = async () => {
    try {
      const usersData = await authService.getAllUsers();
      setUsers(usersData);
      
      // Fetch all reels for staff (without view data)
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/admin/reels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allReels = await res.json();
      setReels(allReels);
    } catch (error) {
      console.error('StaffDashboard: Failed to load data:', error);
    }
  };

  const loadInstagramAccounts = async () => {
    try {
      const accounts = await accountService.getAccounts();
      setInstagramAccounts(accounts);
    } catch (error) {
      console.error('Failed to load Instagram accounts:', error);
    }
  };

  const loadPendingInstagramAccounts = async () => {
    try {
      const pendingAccounts = await accountService.getPendingAccounts();
      setPendingInstagramAccounts(pendingAccounts);
    } catch (error) {
      console.error('Failed to load pending Instagram accounts:', error);
    }
  };



  const handleDeleteReel = async (reelId: string) => {
    toast("Delete Rel", {
      description: "Are you sure you want to delete this reel?",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/admin/reels/${reelId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.ok) {
              toast.success('Reel deleted successfully.');
              loadData();
            } else {
              toast.error('Failed to delete reel');
            }
          } catch (error) {
            console.error('Delete reel error:', error);
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

  const handleBulkDeleteReels = async () => {
    if (selectedReels.length === 0) {
      toast.error('Please select reels to delete');
      return;
    }

    toast("Delete Reels", {
      description: `Are you sure you want to delete ${selectedReels.length} reels?`,
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/admin/reels/bulk-delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ reelIds: selectedReels })
            });
            
            if (response.ok) {
              toast.success('Reels deleted successfully.')
              setSelectedReels([]);
              loadData();
            } else {
              toast.error('Failed to delete reels');
            }
          } catch (error) {
            console.error('Bulk delete reels error:', error);
            toast.error('Failed to delete reels');
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
      
    });
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const success = await authService.approveUser(userId);
      if (success) {
        await loadData();
      } else {
        toast.error('Failed to approve user');
      }
    } catch (error) {
      console.error('Failed to approve user:', error);
      toast.error('An error occurred while approving the user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    toast("Delete User", {
      description: "Are you sure you want to delete this user?",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const success = await authService.deleteUser(userId);
            if (success) {
              toast.success('User deleted successfully.')
              await loadData();
            }
          } catch (error) {
            console.error('Failed to delete user:', error);
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
      
    });
    
  };

  const handleApproveInstagramAccount = async (accountId: string) => {
    try {
      const result = await accountService.approveAccount(parseInt(accountId));
      if (result.success) {
        await loadInstagramAccounts();
        await loadPendingInstagramAccounts();
      } else {
        toast.error('Failed to approve Instagram account');
      }
    } catch (error) {
      console.error('Failed to approve Instagram account:', error);
      toast.error('An error occurred while approving the Instagram account');
    }
  };

  const handleRejectInstagramAccount = async (accountId: string, rejectionReason?: string) => {
    try {
      const result = await accountService.rejectAccount(parseInt(accountId), rejectionReason);
      if (result.success) {
        await loadInstagramAccounts();
        await loadPendingInstagramAccounts();
      } else {
        toast.error('Failed to reject Instagram account');
      }
    } catch (error) {
      console.error('Failed to reject Instagram account:', error);
      toast.error('An error occurred while rejecting the Instagram account');
    }
  };

  const pendingUsers = users.filter(user => user.isApproved === null || user.isApproved === false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex flex-row justify-between items-start sm:items-center py-6 gap-4 md:gap-0">
            {/* Left: Tagline */}
            <div className="flex flex-col flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-600" />
                Staff Dashboard
              </h1>
              <p className="text-gray-600">Manage approvals and content moderation</p>
              {/* Notification button below tagline on mobile only */}
              <div className="flex sm:hidden mt-2">
                <NotificationCenter />
              </div>
            </div>
            {/* Right: Notification (desktop), Logout */}
            <div className="hidden sm:flex flex-row items-center space-x-2 sm:space-x-4 ml-auto">
              <div className="relative">
                <NotificationCenter />
              </div>
              <button
                onClick={onLogout}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg text-base transition-all border border-red-200"
              >
                <LogOut className="h-4 w-4 inline mr-2" />
                Logout
              </button>
            </div>
          </div>
          {/* Mobile: Logout below header row */}
          <div className="flex sm:hidden flex-row items-center justify-end space-x-2 mb-4">
            <button
              onClick={onLogout}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg text-base transition-all border border-red-200 w-full"
            >
              <LogOut className="h-4 w-4 inline mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex justify-between px-1 sm:px-6 overflow-x-auto">
              {[
                { id: 'accounts', label: 'User Approvals', mobileLabel: 'Users', icon: UserCheck }, 
                { id: 'instagram', label: 'Instagram Accounts', mobileLabel: 'Instagram', icon: Users }, 
                { id: 'reels', label: 'Content Moderation', mobileLabel: 'Content', icon: Eye }
              ].map(({ id, label, mobileLabel, icon: Icon }) => (
                <button
                  key={id}
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

        {/* User Approvals Tab */}
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
                <UserCheck className="h-6 w-6 text-green-600" /> User Account Management
              </h2>
              <p className="text-gray-600 mt-1">Approve or reject new user registrations</p>
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
                        <div className="flex space-x-3">
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
                  Approved Users ({users.filter(u => u.isApproved).length})
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                  <UserCheck className="h-8 w-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Pending Approvals</p>
                    <p className="text-3xl font-bold">{pendingInstagramAccounts.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-200" />
                </div>
              </div>
            </div>

            {/* Pending Instagram Account Approvals */}
            {pendingInstagramAccounts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    Pending Instagram Account Approvals ({pendingInstagramAccounts.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingInstagramAccounts.map(account => (
                    <div key={account.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                            @
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">@{account.username}</h4>
                            <p className="text-gray-600">Submitted by: {account.user_username}</p>
                            <p className="text-sm text-gray-500">Submitted: {new Date(account.submitted_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleApproveInstagramAccount(account.id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                          >
                            <UserCheck className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectInstagramAccount(account.id)}
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

            {/* All Instagram Accounts */}
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
                  {instagramAccounts.map(account => (
                    <div key={account.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                            @
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">@{account.username}</h4>
                            <p className="text-gray-600">Owner: {account.user_username}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                account.is_approved 
                                  ? 'bg-green-100 text-green-800' 
                                  : account.is_approved === false 
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {account.is_approved === true ? (
                                  <>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Approved
                                  </>
                                ) : account.is_approved === false ? (
                                  <>
                                    <UserX className="h-3 w-3 mr-1" />
                                    Rejected
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </>
                                )}
                              </span>
                              <span className="text-sm text-gray-500">
                                Submitted: {new Date(account.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={async () => {
                              toast("Delete Instagram Account", {
                                description: "Are you sure you want to delete this Instagram account?",
                                action: {
                                  label: "Delete",
                                  onClick: async () => {
                                    try{
                                      await accountService.removeAccount(account.id, true);
                                      toast.success('Instaram account deleted successfully.')
                                loadInstagramAccounts();
                                    }catch(e){
                                      toast.success('Failed to delete instaram account.')
                                    }
                                  },
                                },
                                cancel: {
                                  label: 'Cancel',
                                  onClick: () => {},
                                },
                                
                              });
                            }}
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                            title="Delete Account"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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

        {/* Content Moderation Tab */}
        {activeTab === 'reels' && (
          <div className="space-y-8">
            {/* Content Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <p className="text-green-100 text-sm">Active Reels</p>
                    <p className="text-3xl font-bold">{reels.filter(r => r.isActive).length}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Selected for Deletion</p>
                    <p className="text-3xl font-bold">{selectedReels.length}</p>
                  </div>
                  <Trash2 className="h-8 w-8 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Content Management Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-blue-600" /> Content Moderation
                </h2>
                <p className="text-gray-600 mt-1">Review and moderate user-submitted content</p>
              </div>
              {selectedReels.length > 0 && (
                <button
                  onClick={handleBulkDeleteReels}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedReels.length})
                </button>
              )}
            </div>

            {/* Reels List */}
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
                      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Eye className="h-5 w-5 text-blue-600" />
                          {campaignName} ({campaignReels.length} reels)
                        </h3>
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
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {campaignReels.map((reel) => (
                              <tr key={reel.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedReels.includes(reel.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedReels(prev => [...prev, reel.id]);
                                      } else {
                                        setSelectedReels(prev => prev.filter(id => id !== reel.id));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{reel.username}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <img 
  className="h-10 w-10 rounded-lg object-cover" 
  src={reel.thumbnail} 
  alt={reel.shortcode}
  onError={(e) => {
    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMyAxM0gyN1YyN0gxM1YxM1oiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
  }}
/>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{reel.shortcode}</div>
                                      <div className="text-sm text-gray-500">
                                        <a href={reel.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                          View on Instagram
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                    reel.isActive 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {reel.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(reel.submittedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleDeleteReel(reel.id)}
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 ml-auto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
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
      </div>
    </div>
  );
} 