import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SendMessage } from './SendMessage';
import { Inbox } from './Inbox';
import { Send, Mail, LogOut, Copy, Check } from 'lucide-react';

export function MainLayout() {
  const { session, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'send'>('inbox');
  const [copied, setCopied] = useState(false);

  if (!session) {
    return null;
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const handleCopyPubky = async () => {
    await navigator.clipboard.writeText(session.pubky);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Pubky Vault</h1>
              <p className="text-xs text-gray-500 mt-1">End-to-end encrypted messaging</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Your Pubky Address</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded font-mono break-all">
                  {session.pubky}
                </code>
                <button
                  onClick={handleCopyPubky}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Copy full Pubky"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share this address so others can send you encrypted messages
          </p>
        </div>

        <div className="mb-6">
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'inbox'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="w-5 h-5" />
              <span>Inbox</span>
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'send'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-5 h-5" />
              <span>Send Message</span>
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'inbox' ? (
            <Inbox currentUserPubky={session.pubky} />
          ) : (
            <SendMessage currentUserPubky={session.pubky} />
          )}
        </div>
      </div>

      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
        <p>
          Powered by{' '}
          <a
            href="https://pubky.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:underline"
          >
            Pubky
          </a>
          {' '}• End-to-end encrypted, decentralized messaging
        </p>
      </footer>
    </div>
  );
}
