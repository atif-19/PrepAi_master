import { useState } from 'react';
import { Eye, EyeOff, Key, CheckCircle2, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import PageWrapper from '../components/layout/PageWrapper';

// ─── Info Card ────────────────────────────────────────────────────────────────

const InfoStep = ({ number, text }) => (
  <div className="flex items-start gap-3">
    <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold">
      {number}
    </div>
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const [apiKey, setApiKey]         = useState('');
  const [showKey, setShowKey]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');

  const isValidKey = apiKey.startsWith('AIza') && apiKey.length > 20;

  const handleSave = async () => {
    if (!isValidKey) {
      setError('That doesn\'t look like a valid Gemini API key. It should start with "AIza".');
      return;
    }

    setLoading(true);
    setError('');
    setSaved(false);

    try {
      await axiosInstance.post('/user/apikey', { geminiApiKey: apiKey });
      setSaved(true);
      setApiKey(''); // clear from UI immediately after save — never keep in state
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
     <PageWrapper>    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your PrepAI configuration</p>
        </div>

        {/* API Key Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">

          <div className="flex items-center gap-2.5 mb-1">
            <Key size={18} className="text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Gemini API Key</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Required to run interviews. Your key is encrypted with AES-256 before storage and never exposed after saving.
          </p>

          {/* Success Banner */}
          {saved && (
            <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 mb-5">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              Key saved and encrypted successfully. You're ready to start interviews.
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1.5">Paste your API key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                  setSaved(false);
                }}
                placeholder="AIzaSy..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 pr-10 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Live validation hint */}
            {apiKey.length > 0 && (
              <p className={`text-xs mt-1.5 transition ${isValidKey ? 'text-green-500' : 'text-yellow-600'}`}>
                {isValidKey ? '✓ Key format looks valid' : 'Key should start with "AIza"'}
              </p>
            )}
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !apiKey}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Encrypting & saving...' : 'Save API Key'}
          </button>
        </div>

        {/* How to get key card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
          <h3 className="text-sm font-semibold text-white mb-4">How to get your free Gemini API key</h3>
          <div className="space-y-3.5">
            <InfoStep number="1" text='Go to Google AI Studio — aistudio.google.com' />
            <InfoStep number="2" text='Sign in with your Google account' />
            <InfoStep number="3" text='Click "Get API Key" → "Create API key in new project"' />
            <InfoStep number="4" text='Copy the key and paste it above' />
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition w-fit"
          > 
            Open Google AI Studio <ExternalLink size={13} />
          </a>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 px-4 py-3.5 bg-gray-900/50 border border-gray-800 rounded-xl">
          <ShieldCheck size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Your key is encrypted using AES-256-GCM before being stored in the database.
            It is decrypted only on the server at the moment an interview request is made —
            it is never sent back to the browser after saving.
          </p>
        </div>

      </div>
    </div>
    </PageWrapper>

  );
};

export default SettingsPage;