import React, { useState, useEffect } from 'react';
import { accountService, InstagramAccount } from '../../services/accountService';
import { Plus, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AccountManagement: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [newAccount, setNewAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadAccounts();
    }
  }, [isAuthenticated, authLoading]);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const accountsData = await accountService.getAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('AccountManagement: Error loading accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const validateUsername = (username: string) => {
    // Remove leading @ if present
    const clean = username.trim().replace(/^@+/, '');
    // Instagram usernames: 1-30 chars, letters, numbers, periods, underscores
    if (!clean) return 'Username is required.';
    if (clean.length < 1 || clean.length > 30) return 'Username must be 1-30 characters.';
    if (!/^[A-Za-z0-9._]+$/.test(clean)) return 'Only letters, numbers, periods, and underscores are allowed.';
    if (/^(.)\1{4,}$/.test(clean)) return 'Username cannot have the same character repeated 5+ times.';
    return '';
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');
    const cleanUsername = newAccount.trim().replace(/^@+/, '');
    const validationMsg = validateUsername(cleanUsername);
    if (validationMsg) {
      setInputError(validationMsg);
      return;
    }
    if (!cleanUsername) return;
    setIsAdding(true);
    setError('');
    setSuccess('');
    try {
      const result = await accountService.addAccount(cleanUsername);
      if (result.success) {
        setSuccess('Account added successfully! Awaiting admin approval.');
        setNewAccount('');
        loadAccounts(); // Reload accounts
      } else {
        setError(result.error || 'Failed to add account');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAccount = async (accountId: number) => {
    if (!confirm('Are you sure you want to remove this account?')) return;

    setError('');
    setSuccess('');

    try {
      const result = await accountService.removeAccount(accountId);
      
      if (result.success) {
        setSuccess('Account removed successfully!');
        loadAccounts(); // Reload accounts
      } else {
        setError(result.error || 'Failed to remove account');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    }
  };

  const getStatusIcon = (account: InstagramAccount) => {
    if (account.is_approved === null) {
      return <div title="Pending Approval"><Clock className="h-5 w-5 text-yellow-500" /></div>;
    } else if (account.is_approved) {
      return <div title="Approved"><CheckCircle className="h-5 w-5 text-green-500" /></div>;
    } else {
      return <div title="Rejected"><XCircle className="h-5 w-5 text-red-500" /></div>;
    }
  };

  const getStatusText = (account: InstagramAccount) => {
    if (account.is_approved === null) {
      return 'Pending Approval';
    } else if (account.is_approved) {
      return 'Approved';
    } else {
      return 'Rejected';
    }
  };

  const getStatusColor = (account: InstagramAccount) => {
    if (account.is_approved === null) {
      return 'text-yellow-600 bg-yellow-100';
    } else if (account.is_approved) {
      return 'text-green-600 bg-green-100';
    } else {
      return 'text-red-600 bg-red-100';
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Instagram Account Management</h2>
          <div className="text-center py-8 text-red-600">
            <p>You must be logged in to manage your Instagram accounts.</p>
            <p>Please log in to continue.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Instagram Account Management</h2>
        
        {/* Add Account Form */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Account</h3>
          <form onSubmit={handleAddAccount} className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
            <div className="flex-1 flex flex-col">
              <input
                type="text"
                value={newAccount}
                onChange={(e) => { setNewAccount(e.target.value); setInputError(''); }}
                placeholder="Enter Instagram username (with or without @)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isAdding}
              />
              <span className="text-xs text-gray-500 mt-1">Enter your Instagram username (with or without @)</span>
              {inputError && <span className="text-xs text-red-600 mt-1">{inputError}</span>}
            </div>
            <button
              type="submit"
              disabled={isAdding || !newAccount.trim()}
              className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isAdding ? 'Adding...' : 'Add Account'}
            </button>
          </form>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {success}
          </div>
        )}

        {/* Accounts List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Accounts</h3>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No Instagram accounts added yet.</p>
              <p className="text-sm">Add an account above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-gradient-to-br from-purple-100 via-pink-50 to-yellow-50 rounded-xl shadow-lg p-4 flex flex-col justify-between border border-purple-100 hover:shadow-2xl transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                      {account.username?.charAt(0)?.toUpperCase() || 'I'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">@{account.username}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(account)}`}>{getStatusText(account)}</span>
                        {account.rejection_reason && (
                          <span className="text-xs text-red-600">Reason: {account.rejection_reason}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAccount(account.id)}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white p-2 rounded-full shadow transition-colors"
                      title="Remove account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <span>Added: {new Date(account.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Information */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Add your Instagram account username (without the @ symbol)</li>
            <li>• Your account will be reviewed by an admin for approval</li>
            <li>• Once approved, you can submit reels from that account</li>
            <li>• You'll receive notifications when your account is approved or rejected</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 