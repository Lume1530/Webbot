import React, { useState } from 'react';
import { Plus, Upload, AlertCircle } from 'lucide-react';

interface SubmissionFormProps {
  onSubmit: (url: string) => Promise<void>;
  onBulkSubmit: (urls: string[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function SubmissionForm({ onSubmit, onBulkSubmit, isLoading, error }: SubmissionFormProps) {
  const [url, setUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    try {
      await onSubmit(url.trim());
      setUrl('');
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUrls.trim()) return;

    const urls = bulkUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) return;

    try {
      await onBulkSubmit(urls);
      setBulkUrls('');
    } catch (err) {
      // Error is handled by parent component
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Submit Reels</h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'single'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'bulk'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bulk
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div>
            <label htmlFor="instagram-url" className="block text-sm font-medium text-gray-700 mb-2">
              Instagram Reel URL
            </label>
            <input
              type="url"
              id="instagram-url"
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
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>{isLoading ? 'Submitting...' : 'Submit Reel'}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <label htmlFor="bulk-urls" className="block text-sm font-medium text-gray-700 mb-2">
              Instagram Reel URLs (one per line)
            </label>
            <textarea
              id="bulk-urls"
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="https://www.instagram.com/reel/ABC123/&#10;https://www.instagram.com/reel/DEF456/&#10;https://www.instagram.com/reel/GHI789/"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !bulkUrls.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Upload className="h-5 w-5" />
            <span>{isLoading ? 'Submitting...' : 'Submit Reels'}</span>
          </button>
        </form>
      )}
    </div>
  );
}