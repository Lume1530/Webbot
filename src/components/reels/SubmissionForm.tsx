import React, { useState, useEffect } from 'react';
import { Plus, Upload, AlertCircle, Megaphone, Instagram, Target, Users, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { CampaignAssignment } from '../../types';
import { accountService, InstagramAccount } from '../../services/accountService';
import { reelApiService } from '../../services/reelApi';

interface SubmissionFormProps {
  onSubmit: (url: string, campaignId?: string) => Promise<void>;
  onBulkSubmit: (urls: string[], campaignId?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  userCampaigns?: CampaignAssignment[];
}

export function SubmissionForm({ onSubmit, onBulkSubmit, isLoading, error, userCampaigns = [] }: SubmissionFormProps) {
  const [url, setUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [activeSection, setActiveSection] = useState<string>('');
  const MAX_REELS = 5;
  const [submitError, setSubmitError] = useState('');

  const handleSingleSubmit = async (e: React.FormEvent, campaignId: string) => {
    e.preventDefault();
    setSubmitError('');
    if (!url.trim()) return;
    try {
      await onSubmit(url.trim(), campaignId);
      setUrl('');
    } catch (err: any) {
      if (err && err.message && err.message.toLowerCase().includes('account does not belong to you')) {
        setSubmitError('This Instagram account does not belong to you.');
      } else if (err && err.message && err.message.toLowerCase().includes('duplicate')) {
        setSubmitError('No duplicate links allowed.');
      } else {
        setSubmitError('Failed to submit reel. Please try again.');
      }
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent, campaignId: string) => {
    e.preventDefault();
    setSubmitError('');
    if (!bulkUrls.trim()) return;
    const urls = bulkUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    if (urls.length === 0) return;
    try {
      await onBulkSubmit(urls, campaignId);
      setBulkUrls('');
    } catch (err: any) {
      if (err && err.message && err.message.toLowerCase().includes('account does not belong to you')) {
        setSubmitError('One or more Instagram accounts do not belong to you.');
      } else if (err && err.message && err.message.toLowerCase().includes('duplicate')) {
        setSubmitError('No duplicate links allowed.');
      } else {
        setSubmitError('Failed to submit reels. Please try again.');
      }
    }
  };

  const renderSubmissionForm = (campaignId: string, campaignName: string, campaign: any) => {
    const isActive = activeSection === campaignId;
    const isCampaignActive = (campaign.status || '').trim().toLowerCase() === 'active';
    return (
      <div 
        key={campaignId}
        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 ${
          isActive 
            ? 'border-purple-500 shadow-xl' 
            : 'border-gray-200 hover:border-purple-300'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {campaignName}
                </h3>
                <p className="text-sm text-gray-600">
                  Campaign-specific content submission
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                ${campaign.pay_rate}/1M views
              </div>
              <button
                onClick={() => setActiveSection(isActive ? '' : campaignId)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isActive ? 'Collapse' : 'Submit Reels'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isActive && (
          <div className="p-6">
            {/* Campaign Info */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-start gap-3">
                <Megaphone className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-purple-900 mb-1">Campaign Requirements</h4>
                  <p className="text-sm text-purple-700 mb-2">{campaign.requirements}</p>
                  <div className="flex items-center gap-4 text-xs text-purple-600">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Budget: ${campaign.total_budget}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Platform: {campaign.platform}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* If campaign is not active, show message and disable form */}
            {!isCampaignActive && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Submissions Closed</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    This campaign is currently not accepting submissions. Status: <b>{
                      !campaign.status || campaign.status === 'unknown' ? 'Active' :
                      campaign.status === 'active' ? 'Active' :
                      campaign.status === 'payment_processing' ? 'Payment Processing' :
                      campaign.status === 'budget_ended' ? 'Budget Ended' :
                      campaign.status === 'maintenance' ? 'Maintenance' :
                      campaign.status === 'coming_soon' ? 'Coming Soon' :
                      campaign.status.replace('_', ' ')
                    }</b>
                  </p>
                </div>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMode('single')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mode === 'single'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  disabled={!isCampaignActive}
                >
                  Single Reel
                </button>
                <button
                  onClick={() => setMode('bulk')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mode === 'bulk'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  disabled={!isCampaignActive}
                >
                  Bulk Upload
                </button>
              </div>
            </div>

            {/* Error Messages */}
            {(error || submitError) && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                  <p className="text-sm text-red-700 mt-1">{submitError || error}</p>
                </div>
              </div>
            )}

            {/* Submission Form */}
            {isCampaignActive && mode === 'single' ? (
              <form onSubmit={(e) => handleSingleSubmit(e, campaignId)} className="space-y-4">
                <div>
                  <label htmlFor={`instagram-url-${campaignId}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Reel URL
                  </label>
                  <input
                    type="url"
                    id={`instagram-url-${campaignId}`}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/ABC123/"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>{isLoading ? 'Submitting...' : 'Submit Reel for Campaign'}</span>
                </button>
              </form>
            ) : isCampaignActive && mode === 'bulk' ? (
              <form onSubmit={(e) => handleBulkSubmit(e, campaignId)} className="space-y-4">
                <div>
                  <label htmlFor={`bulk-urls-${campaignId}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Reel URLs (one per line)
                  </label>
                  <textarea
                    id={`bulk-urls-${campaignId}`}
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder="https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/reel/DEF456/"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                    disabled={isLoading}
                  />
                  <div className="text-xs text-gray-500 mt-2">Max 5 reels at a time.</div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !bulkUrls.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Upload className="h-5 w-5" />
                  <span>{isLoading ? 'Submitting...' : 'Submit Reels for Campaign'}</span>
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // Filter out assignments with missing campaign data
  const validUserCampaigns = userCampaigns.filter(assignment => {
    if (!assignment.campaign) {
      return false;
    }
    return true;
  });

  // Show "Please Join Campaign" message if no campaigns
  if (userCampaigns.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-3xl p-12 border border-purple-200 shadow-xl">
            <div className="mb-8">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Megaphone className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Join Campaigns to Submit Reels
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Start earning by joining exciting campaigns and submitting your Instagram reels. 
                Each campaign has specific requirements and competitive pay rates.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign-Specific</h3>
                <p className="text-gray-600 text-sm">
                  Submit reels tailored to specific campaign requirements and themes
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Higher Pay Rates</h3>
                <p className="text-gray-600 text-sm">
                  Campaign reels often have better pay rates than general submissions
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg border border-green-100">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Sparkles className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Priority Tracking</h3>
                <p className="text-gray-600 text-sm">
                  Campaign reels get priority tracking and analytics
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-purple-100 mb-6 max-w-lg mx-auto">
                Browse available campaigns, join the ones that match your content style, 
                and start submitting reels to earn more!
              </p>
              <button
                onClick={() => {
                  // Navigate to campaigns tab
                  const campaignsTab = document.querySelector('[data-tab="campaigns"]') as HTMLElement;
                  if (campaignsTab) {
                    campaignsTab.click();
                    // Scroll to top after a small delay
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 100);
                  }
                }}
                className="bg-white text-purple-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg"
              >
                <span>Browse Campaigns</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How Campaign Submissions Work</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Join Campaign</h4>
                <p className="text-sm text-gray-600">Browse and join campaigns that match your content</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Create Content</h4>
                <p className="text-sm text-gray-600">Follow campaign requirements and create engaging reels</p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Submit Reels</h4>
                <p className="text-sm text-gray-600">Submit your reels through the campaign submission form</p>
              </div>
              
              <div className="text-center">
                <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">4</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Track & Earn</h4>
                <p className="text-sm text-gray-600">Monitor performance and earn based on campaign rates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show campaign submission sections if user has joined campaigns
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Campaign Reel Submissions</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Submit your Instagram reels for the campaigns you've joined. Each campaign has specific requirements and pay rates.
        </p>
      </div>

      {/* Campaign Submission Sections */}
      <div className="space-y-6">
        {validUserCampaigns.map((assignment) => {
          // campaign is guaranteed to be defined due to filtering
          const campaign = assignment.campaign!;
          return (
            <div key={assignment.id} className="relative">
              {renderSubmissionForm(assignment.campaign_id, campaign.name, campaign)}
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          How Campaign Submissions Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Follow campaign requirements when creating content
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Submit reels through the specific campaign form
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Campaign reels are tracked separately with priority
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Earn based on campaign-specific pay rates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}