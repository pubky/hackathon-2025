import { useState, useEffect } from 'react';
import { Inbox as InboxIcon, Mail, MailOpen, Trash2, Clock, AlertCircle, Lock } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { Message } from '../types';
import { formatRelativeTime } from '../utils/date';

interface InboxProps {
  currentUserPubky: string;
}

export function Inbox({ currentUserPubky }: InboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadMessages();
  }, [currentUserPubky]);

  const loadMessages = async () => {
    try {
      setError('');
      setIsLoading(true);

      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('to_pubky', currentUserPubky)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[Inbox] Failed to load messages:', fetchError);
        throw new Error('Failed to load messages');
      }

      setMessages(data || []);
    } catch (err) {
      console.error('[Inbox] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsOpened = async (messageId: string) => {
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase
        .from('messages')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('to_pubky', currentUserPubky);

      if (updateError) {
        console.error('[Inbox] Failed to mark as opened:', updateError);
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, opened_at: new Date().toISOString() }
            : msg
        )
      );
    } catch (err) {
      console.error('[Inbox] Error marking as opened:', err);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = getSupabase();
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('to_pubky', currentUserPubky);

      if (deleteError) {
        console.error('[Inbox] Failed to delete:', deleteError);
        throw new Error('Failed to delete message');
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('[Inbox] Error deleting message:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete message');
    }
  };

  const getExpirationStatus = (message: Message) => {
    if (!message.expires_at) return null;

    const expiresAt = new Date(message.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs <= 0) {
      return { text: 'Expired', color: 'text-red-600', urgent: true };
    } else if (diffHours < 24) {
      return { text: `Expires in ${Math.ceil(diffHours)}h`, color: 'text-orange-600', urgent: true };
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return { text: `Expires in ${diffDays}d`, color: 'text-gray-500', urgent: false };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load inbox</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <InboxIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500">
            Share your pubky with others so they can send you encrypted messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <InboxIcon className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Your Inbox</h2>
          <span className="ml-auto text-sm text-gray-500">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {messages.map((message) => {
          const expiration = getExpirationStatus(message);
          const isOpened = !!message.opened_at;

          return (
            <div
              key={message.id}
              className={`p-6 hover:bg-gray-50 transition-colors ${
                !isOpened ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {isOpened ? (
                    <MailOpen className="w-6 h-6 text-gray-400" />
                  ) : (
                    <Mail className="w-6 h-6 text-green-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {message.author_hint || 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        From: {message.from_pubky?.substring(0, 16)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(new Date(message.created_at))}
                      </span>
                      {expiration && (
                        <div className={`flex items-center gap-1 text-xs ${expiration.color}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{expiration.text}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Lock className="w-4 h-4" />
                      <span className="font-medium">Encrypted message</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                      {message.ciphertext_base64.substring(0, 80)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedMessage(message);
                        if (!isOpened) {
                          handleMarkAsOpened(message.id);
                        }
                      }}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      Decrypt Message
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      onClick={() => handleDelete(message.id)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Message from {selectedMessage.author_hint || 'Anonymous'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatRelativeTime(new Date(selectedMessage.created_at))}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Decryption requires Pubky Ring</p>
                    <p>
                      Full decryption will be available once Pubky Ring integration is complete.
                      For now, the encrypted message is displayed below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Encrypted Content:</p>
                <p className="text-xs text-gray-600 font-mono break-all">
                  {selectedMessage.ciphertext_base64}
                </p>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                <p>Message ID: {selectedMessage.id}</p>
                <p>Nonce: {selectedMessage.nonce_base64}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedMessage(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
