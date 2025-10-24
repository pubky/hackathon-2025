import { useState, useEffect } from 'react';
import { History, Clock, CheckCircle2, XCircle, Eye, ArrowLeft, User, Server } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import { supabase } from '../lib/supabase';
import { ConsentSession, SessionTag } from '../types';
import { formatDateTime, formatPubkyShort } from '../lib/consent';
import { ProofDetails } from './ProofDetails';
import { fetchUsernames, fetchUsername } from '../utils/username';
import { TagDisplay } from './TagDisplay';
import { getHomeserverStorageStatus } from '../lib/homeserverStorage';

interface MySessionsScreenProps {
  userPubky: string;
  onBack: () => void;
  onViewSession: (session: ConsentSession) => void;
}

export function MySessionsScreen({ userPubky, onBack, onViewSession }: MySessionsScreenProps) {
  const [sessions, setSessions] = useState<ConsentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedSession, setSelectedSession] = useState<ConsentSession | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});
  const [username, setUsername] = useState<string | null>(null);
  const [sessionTags, setSessionTags] = useState<Record<string, SessionTag[]>>({});

  useEffect(() => {
    fetchUsername(userPubky).then(setUsername);
  }, [userPubky]);

  useEffect(() => {
    loadSessions();

    const intervalId = setInterval(() => {
      loadSessions();
    }, 10000);

    const channel = supabase
      .channel('sessions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consent_sessions'
        },
        (payload) => {
          console.log('[MySessionsScreen] Real-time update received:', {
            event: payload.eventType,
            sessionId: payload.new?.id || payload.old?.id,
            oldStatus: payload.old?.status,
            newStatus: payload.new?.status
          });
          loadSessions();
        }
      )
      .subscribe((status) => {
        console.log('[MySessionsScreen] Real-time subscription status:', status);
      });

    return () => {
      clearInterval(intervalId);
      channel.unsubscribe();
    };
  }, [userPubky]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('consent_sessions')
        .select('*')
        .or(`a_pubky.eq.${userPubky},b_pubky.eq.${userPubky}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);

      if (data && data.length > 0) {
        const pubkeys = new Set<string>();
        data.forEach(session => {
          pubkeys.add(session.a_pubky);
          if (session.b_pubky) pubkeys.add(session.b_pubky);
        });
        const usernamesData = await fetchUsernames(Array.from(pubkeys));
        setUsernames(usernamesData);

        const sessionIds = data.map(s => s.id);
        const { data: tagsData } = await supabase
          .from('session_tags')
          .select('*')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: true });

        if (tagsData) {
          const tagsMap: Record<string, SessionTag[]> = {};
          tagsData.forEach(tag => {
            if (!tagsMap[tag.session_id]) {
              tagsMap[tag.session_id] = [];
            }
            tagsMap[tag.session_id].push(tag);
          });
          setSessionTags(tagsMap);
        }
      }
    } catch (error) {
      console.error('[MySessionsScreen] Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredSessions = () => {
    if (filter === 'all') return sessions;
    return sessions.filter(s => s.status === filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'expired':
        return 'bg-warm-200 text-warm-700 border-warm-300';
      default:
        return 'bg-warm-200 text-warm-700 border-warm-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredSessions = getFilteredSessions();

  return (
    <>
      <div className="h-screen flex flex-col bg-warm-50">
        <nav className="bg-white border-b border-warm-200 sticky top-0 z-10 shadow-soft">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-sm font-bold text-warm-900">ConsentKy</h1>
              {username && (
                <div className="flex items-center space-x-1 mt-0.5">
                  <User className="w-3 h-3 text-warm-600" />
                  <p className="text-[10px] text-warm-600 font-medium">@{username}</p>
                </div>
              )}
            </div>
            <LogoutButton />
          </div>
        </nav>
        <div className="flex-shrink-0 bg-white border-b border-warm-200 px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-warm-600 hover:text-coral-600 transition-colors mb-3 px-2 py-1.5 rounded-lg hover:bg-warm-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-semibold text-xs">Back to Home</span>
          </button>

          <div className="flex items-center space-x-2 mb-3">
            <History className="w-6 h-6 text-coral-600" />
            <h1 className="text-xl font-bold text-warm-900">My Sessions</h1>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                filter === 'all'
                  ? 'bg-coral-500 text-white shadow-soft'
                  : 'bg-white text-warm-700 border border-warm-200 hover:border-warm-300 hover:shadow-soft'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                filter === 'active'
                  ? 'bg-emerald-500 text-white shadow-soft'
                  : 'bg-white text-warm-700 border border-warm-200 hover:border-warm-300 hover:shadow-soft'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('expired')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                filter === 'expired'
                  ? 'bg-warm-600 text-white shadow-soft'
                  : 'bg-white text-warm-700 border border-warm-200 hover:border-warm-300 hover:shadow-soft'
              }`}
            >
              Expired
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-warm-600 text-sm">Loading sessions...</p>
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-soft border border-warm-200 p-8 text-center">
              <History className="w-12 h-12 text-warm-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-warm-900 mb-2">No sessions found</h3>
              <p className="text-warm-600 text-xs">
                {filter === 'all'
                  ? 'You haven\'t created or joined any consent sessions yet.'
                  : `No ${filter} sessions found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const isCreator = session.a_pubky === userPubky;
                const partnerPubky = isCreator ? session.b_pubky : session.a_pubky;
                const storageStatus = getHomeserverStorageStatus(session);

                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl shadow-soft border border-warm-200 p-3 hover:shadow-soft-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusColor(session.status)}`}>
                            {getStatusIcon(session.status)}
                            <span>{session.status.charAt(0).toUpperCase() + session.status.slice(1)}</span>
                          </span>
                          {storageStatus.isFullyStored && (
                            <span className="flex items-center space-x-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200" title="Stored on both homeservers">
                              <Server className="w-2.5 h-2.5" />
                              <span>2/2</span>
                            </span>
                          )}
                          {storageStatus.isPartiallyStored && (
                            <span className="flex items-center space-x-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200" title={`Stored on ${storageStatus.storedCount}/2 homeservers`}>
                              <Server className="w-2.5 h-2.5" />
                              <span>{storageStatus.storedCount}/2</span>
                            </span>
                          )}
                          <span className="text-[10px] text-warm-600 font-medium">
                            {isCreator ? 'You created' : 'You joined'}
                          </span>
                        </div>
                        <p className="text-[9px] text-warm-600">
                          Created {formatDateTime(session.created_at)}
                        </p>
                      </div>
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="px-2 py-1.5 bg-warm-100 hover:bg-warm-200 text-warm-900 text-[10px] font-bold rounded-lg transition-all flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Proof</span>
                        </button>
                        {session.status === 'active' && (
                          <button
                            onClick={() => onViewSession(session)}
                            className="px-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-all"
                          >
                            Open
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-warm-50 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-warm-700 mb-1">Duration</p>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-warm-600" />
                          <span className="text-warm-900 font-bold text-[10px]">
                            {session.window_duration_minutes} min
                          </span>
                        </div>
                      </div>

                      <div className="bg-warm-50 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-warm-700 mb-1">Window End</p>
                        <p className="text-warm-900 font-bold text-[9px]">
                          {formatDateTime(session.window_end)}
                        </p>
                      </div>

                      <div className="bg-warm-50 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-warm-700 mb-1">
                          {isCreator ? 'Partner' : 'Creator'}
                        </p>
                        {partnerPubky ? (
                          <>
                            {usernames[partnerPubky] && (
                              <span className="text-[9px] text-warm-900 font-semibold block">@{usernames[partnerPubky]}</span>
                            )}
                            <code className="text-[9px] text-warm-800 font-mono font-bold block">
                              {formatPubkyShort(partnerPubky)}
                            </code>
                          </>
                        ) : (
                          <span className="text-[9px] text-warm-600 italic">Not joined</span>
                        )}
                      </div>
                    </div>

                    {sessionTags[session.id] && sessionTags[session.id].length > 0 && (
                      <div className="mt-2 pt-2 border-t border-warm-200">
                        <p className="text-[9px] text-warm-700 font-bold mb-1.5">Tags</p>
                        <TagDisplay tags={sessionTags[session.id]} size="sm" />
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-warm-200 max-h-[8vh] overflow-y-auto">
                      <p className="text-[9px] text-warm-700 font-bold mb-1">Consent Statement</p>
                      <p className="text-[10px] text-warm-800 leading-snug">
                        {session.consent_statement}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedSession && (
        <ProofDetails
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </>
  );
}
