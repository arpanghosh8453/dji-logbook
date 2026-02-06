/**
 * Settings modal for API key configuration
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appDataDir, setAppDataDir] = useState('');

  // Check if API key exists on mount
  useEffect(() => {
    if (isOpen) {
      checkApiKey();
      getAppDataDir();
    }
  }, [isOpen]);

  const checkApiKey = async () => {
    try {
      const exists = await invoke<boolean>('has_api_key');
      setHasKey(exists);
    } catch (err) {
      console.error('Failed to check API key:', err);
    }
  };

  const getAppDataDir = async () => {
    try {
      const dir = await invoke<string>('get_app_data_dir');
      setAppDataDir(dir);
    } catch (err) {
      console.error('Failed to get app data dir:', err);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await invoke('set_api_key', { apiKey: apiKey.trim() });
      setMessage({ type: 'success', text: 'API key saved successfully!' });
      setHasKey(true);
      setApiKey(''); // Clear the input for security
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save: ${err}` });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dji-secondary rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* API Key Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              DJI API Key
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Required for decrypting V13+ flight logs. Get your key from{' '}
              <a
                href="https://developer.dji.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dji-primary hover:underline"
              >
                developer.dji.com
              </a>
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasKey ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <span className="text-sm text-gray-400">
                {hasKey ? 'API key configured' : 'No API key configured'}
              </span>
            </div>

            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? '••••••••••••••••' : 'Enter your DJI API key'}
              className="input w-full"
            />

            {/* Message */}
            {message && (
              <p
                className={`mt-2 text-sm ${
                  message.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || !apiKey.trim()}
              className="btn-primary w-full mt-3"
            >
              {isSaving ? 'Saving...' : hasKey ? 'Update API Key' : 'Save API Key'}
            </button>
          </div>

          {/* Info Section */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-400">Data Location:</strong>
              <br />
              <code className="text-xs text-gray-400 bg-dji-dark px-1 py-0.5 rounded">
                {appDataDir || 'Loading...'}
              </code>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Your API key is stored locally in <code className="text-gray-400">config.json</code> and never sent to any external servers except DJI's official API.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
