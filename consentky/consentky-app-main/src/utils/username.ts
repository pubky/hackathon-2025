import { supabase } from '../lib/supabase';

export async function fetchUsername(pubky: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('pubky', pubky)
      .maybeSingle();

    if (error) {
      console.error('Error fetching username:', error);
      return null;
    }

    return data?.username || null;
  } catch (err) {
    console.error('Exception fetching username:', err);
    return null;
  }
}

export async function fetchUsernames(pubkeys: string[]): Promise<Record<string, string | null>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('pubky, username')
      .in('pubky', pubkeys);

    if (error) {
      console.error('Error fetching usernames:', error);
      return {};
    }

    const usernameMap: Record<string, string | null> = {};
    pubkeys.forEach(pubky => {
      const profile = data?.find(p => p.pubky === pubky);
      usernameMap[pubky] = profile?.username || null;
    });

    return usernameMap;
  } catch (err) {
    console.error('Exception fetching usernames:', err);
    return {};
  }
}

export function formatUserDisplay(pubky: string, username: string | null, shortFormat = true): string {
  if (username) {
    return `@${username}`;
  }

  if (shortFormat) {
    return `${pubky.substring(0, 8)}...${pubky.substring(pubky.length - 6)}`;
  }

  return pubky;
}
