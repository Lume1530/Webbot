import React, { useState, useEffect } from 'react';
import { accountService, PendingAccount } from '../../services/accountService';
import { CheckCircle, XCircle, Clock, User, Mail } from 'lucide-react';

export const AdminAccountApproval: React.FC = () => {
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  useEffect(() => {
    loadPendingAccounts();
  }, []);

  const loadPendingAccounts = async () => {
    console.log('AdminAccountApproval: Loading pending accounts...');
    setIsLoading(true);
    try {
      const accounts = await accountService.getPendingAccounts();
      console.log('AdminAccountApproval: Pending accounts loaded:', accounts);
      setPendingAccounts(accounts);
    } catch (error) {
      console.error('AdminAccountApproval: Failed to load pending accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (accountId: number) => {
    console.log('Approving account:', accountId);
    console.log('Current processingId:', processingId);
    setProcessingId(accountId);
    try {
      const result = await accountService.approveAccount(accountId);
      console.log('Approve result:', result);
      if (result.success) {
        // Remove from pending list
        setPendingAccounts(prev => prev.filter(acc => acc.id !== accountId));
        console.log('Account approved successfully');
      } else {
        alert('Failed to approve account: ' + result.error);
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('An error occurred while approving the account');
    } finally {
      console.log('Resetting processingId to null');
      setProcessingId(null);
    }
  };

  const handleReject = async (accountId: number) => {
    setProcessingId(accountId);
    try {
      const result = await accountService.rejectAccount(accountId, rejectionReason);
      if (result.success) {
        // Remove from pending list
        setPendingAccounts(prev => prev.filter(acc => acc.id !== accountId));
        setRejectionReason('');
        setShowRejectModal(null);
      } else {
        alert('Failed to reject account: ' + result.error);
      }
    } catch (error) {
      alert('An error occurred while rejecting the account');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900">Pending Account Approvals</h2>
          <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {pendingAccounts.length}
          </span>
        </div>

        {pendingAccounts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No pending account approvals at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingAccounts.map((account) => (
              <div
                key={account.id}
                className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900">
                          @{account.username}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Pending
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>User: {account.user_username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Email: {account.user_email}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Submitted: {new Date(account.submitted_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        console.log('Approve button clicked for account:', account.id);
                        console.log('ProcessingId:', processingId);
                        handleApprove(account.id);
                      }}
                      disabled={processingId === account.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {processingId === account.id ? 'Approving...' : 'Approve'}
                    </button>

                    <button
                      onClick={() => setShowRejectModal(account.id)}
                      disabled={processingId === account.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      {processingId === account.id ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Account
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this account (optional):
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 