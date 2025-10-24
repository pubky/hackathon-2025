import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UsernamePromptProps {
  pubky: string;
  onComplete: (username?: string) => void;
}

export function UsernamePrompt({ pubky, onComplete }: UsernamePromptProps) {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      handleSkip();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const trimmedUsername = username.trim().toLowerCase();

      if (!/^[a-z0-9_-]+$/.test(trimmedUsername)) {
        setError('Username can only contain lowercase letters, numbers, hyphens, and underscores');
        setIsSubmitting(false);
        return;
      }

      if (trimmedUsername.length < 3) {
        setError('Username must be at least 3 characters');
        setIsSubmitting(false);
        return;
      }

      if (trimmedUsername.length > 20) {
        setError('Username must be 20 characters or less');
        setIsSubmitting(false);
        return;
      }

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          pubky,
          username: trimmedUsername,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'pubky'
        });

      if (upsertError) {
        if (upsertError.code === '23505') {
          setError('Username already taken');
        } else {
          setError('Failed to set username');
        }
        setIsSubmitting(false);
        return;
      }

      onComplete(trimmedUsername);
    } catch (err) {
      console.error('Error setting username:', err);
      setError('Failed to set username');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-soft-lg border border-warm-200 p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-warm-900 mb-2">Set a Username</h2>
        <p className="text-warm-600 mb-6">
          Choose a username to make it easier for others to find you. This is optional.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:outline-none focus:border-coral-500 text-warm-900 placeholder-warm-400"
              disabled={isSubmitting}
              maxLength={20}
            />
            <p className="text-xs text-warm-500 mt-2">
              Lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border-2 border-warm-200 text-warm-700 font-semibold rounded-xl hover:bg-warm-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>Skip</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Setting...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Set Username</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
