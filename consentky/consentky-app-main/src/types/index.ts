export interface ConsentSession {
  id: string;
  version: string;
  a_pubky: string;
  b_pubky: string | null;
  statement_hash: string;
  consent_statement: string;
  window_start: string;
  window_end: string;
  window_duration_minutes: number;
  a_authentication: string | null;
  b_authentication: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  tags?: SessionTag[];
  a_homeserver_stored?: boolean;
  b_homeserver_stored?: boolean;
  a_homeserver_url?: string | null;
  b_homeserver_url?: string | null;
  homeserver_stored_at?: string | null;
}

export type SessionStatus = 'pending' | 'active' | 'expired';

export type TagColor = 'coral' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'cyan' | 'lime';

export interface SessionTag {
  id: string;
  session_id: string;
  tag_text: string;
  tag_color: TagColor;
  created_by_pubky: string;
  created_at: string;
  updated_at: string;
}

export interface CanonicalConsentObject {
  version: string;
  session_id: string;
  a_pubky: string;
  b_pubky: string;
  statement_hash: string;
  window_start: string;
  window_end: string;
}

export interface SignatureProof {
  signature: string;
  pubkey: string;
  isValid: boolean;
}

export interface ConsentProof {
  session: ConsentSession;
  a_proof: SignatureProof;
  b_proof: SignatureProof;
  canonical_object: CanonicalConsentObject;
  canonical_hash: string;
  isFullyValid: boolean;
}

export interface PubkySession {
  pubky: string;
  capabilities: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  session: PubkySession | null;
  user: null;
  isLoading: boolean;
}

export interface PendingSessionJoin {
  id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
}

export interface UserProfile {
  pubky: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  recipient_pubky: string;
  from_pubky: string;
  encrypted_payload: string;
  author_hint: string | null;
  ciphertext_base64: string;
  nonce_base64: string;
  created_at: string;
  expires_at: string | null;
  opened_at: string | null;
  is_read: boolean;
}

export interface EncryptedEnvelope {
  to_pubky: string;
  from_pubky: string;
  ciphertext?: string;
  nonce?: string;
  ephemeral_pk?: string;
  ciphertext_base64: string;
  nonce_base64: string;
  author_hint?: string;
}
