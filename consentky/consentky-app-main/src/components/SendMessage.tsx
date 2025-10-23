import { useState } from 'react';
import { Send, Lock, AlertCircle, Check } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { encryptMessageForRecipient, bytesToBase64, validatePubkyFormat } from '../lib/crypto';
import { EncryptedEnvelope } from '../types';

interface SendMessageProps {
  currentUserPubky: string;
}

export function SendMessage({ currentUserPubky }: SendMessageProps) {
  const [recipientPubky, setRecipientPubky] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [authorHint, setAuthorHint] = useState('');
  const [ttlDays, setTtlDays] = useState<number | ''>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!recipientPubky.trim()) {
      setError('Please enter recipient pubky');
      return;
    }

    if (!validatePubkyFormat(recipientPubky)) {
      setError('Invalid pubky format. Please check the recipient address.');
      return;
    }

    if (!messageContent.trim()) {
      setError('Please enter a message');
      return;
    }

    if (messageContent.length > 10000) {
      setError('Message too long. Maximum 10,000 characters.');
      return;
    }

    try {
      setIsEncrypting(true);

      const encrypted = await encryptMessageForRecipient(messageContent, recipientPubky);

      const envelope: EncryptedEnvelope = {
        to_pubky: recipientPubky.replace(/^pubky:\/\//, ''),
        from_pubky: currentUserPubky,
        author_hint: authorHint.trim() || undefined,
        ciphertext_base64: bytesToBase64(encrypted.ciphertext),
        nonce_base64: bytesToBase64(encrypted.nonce),
      };

      const expiresAt = ttlDays && ttlDays > 0
        ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const supabase = getSupabase();
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          to_pubky: envelope.to_pubky,
          from_pubky: envelope.from_pubky,
          author_hint: envelope.author_hint,
          ciphertext_base64: envelope.ciphertext_base64,
          nonce_base64: envelope.nonce_base64,
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error('[SendMessage] Failed to send:', insertError);
        throw new Error('Failed to send encrypted message');
      }

      setSuccess(true);
      setMessageContent('');
      setAuthorHint('');
      setTtlDays('');

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('[SendMessage] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Lock className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Send Encrypted Message</h2>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Pubky
          </label>
          <input
            id="recipient"
            type="text"
            value={recipientPubky}
            onChange={(e) => setRecipientPubky(e.target.value)}
            placeholder="ybndrfg8ejkmcpqxot1uwisza345h769..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the z32-encoded pubky of the recipient
          </p>
        </div>

        <div>
          <label htmlFor="authorHint" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name (Optional)
          </label>
          <input
            id="authorHint"
            type="text"
            value={authorHint}
            onChange={(e) => setAuthorHint(e.target.value)}
            placeholder="Anonymous"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Help the recipient identify you (not encrypted)
          </p>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Type your secret message here..."
            rows={6}
            maxLength={10000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">
              This message will be encrypted before sending
            </p>
            <p className="text-xs text-gray-500">
              {messageContent.length} / 10,000
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="ttl" className="block text-sm font-medium text-gray-700 mb-1">
            Expiration (Optional)
          </label>
          <select
            id="ttl"
            value={ttlDays}
            onChange={(e) => setTtlDays(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Never expires</option>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Message will be automatically deleted after this time
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg p-3">
            <Check className="w-5 h-5" />
            <p className="text-sm font-medium">Message sent successfully!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isEncrypting}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {isEncrypting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Encrypting & Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Send Encrypted Message</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 text-sm mb-2">How it works</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Your message is encrypted in your browser before sending</li>
          <li>• Only the recipient can decrypt it with their private key</li>
          <li>• The server only stores the encrypted envelope</li>
          <li>• End-to-end encryption ensures complete privacy</li>
        </ul>
      </div>
    </div>
  );
}
