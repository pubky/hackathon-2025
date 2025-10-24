import "./App.css";
import { useEffect, useState } from "react";
import { Keypair, Pubky, PublicKey } from "@synonymdev/pubky";
import type { Signer, Session } from "@synonymdev/pubky";

const APP_NAMESPACE = "p2pjobs";
const JOBS_PATH = `/pub/${APP_NAMESPACE}/jobs.json`;
const PROFILE_PATH = `/pub/${APP_NAMESPACE}/profile.json`;
const REGISTRY_URL =
  (import.meta as any).env?.VITE_REGISTRY_URL || "http://localhost:8787";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function App() {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(false);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showAccount, setShowAccount] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginSecret, setLoginSecret] = useState("");
  const [loginPassphrase, setLoginPassphrase] = useState("");
  const [loginFile, setLoginFile] = useState<File | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applyJob, setApplyJob] = useState<any | null>(null);
  const [applyForm, setApplyForm] = useState({
    name: "",
    email: "",
    resumeUrl: "",
    message: "",
  });
  const [showInbox, setShowInbox] = useState(false);
  const [inbox, setInbox] = useState<any[]>([]);
  const [viewApp, setViewApp] = useState<any | null>(null);
  const [viewJob, setViewJob] = useState<any | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ name: string; organization: string; imageUrl: string; imageDataUrl?: string }>({ name: "", organization: "", imageUrl: "" });
  const [profile, setProfile] = useState<{ name?: string; organization?: string; imageUrl?: string; imageDataUrl?: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  async function loadMyProfile() {
    try {
      setProfile(null);
      setProfileDraft({ name: "", organization: "", imageUrl: "" });
      const pk = signer?.publicKey.z32() || pubkey;
      if (!pk) return;
      const r = await fetch(`${REGISTRY_URL}/profiles/${pk}?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const me = await r.json();
      if (me && typeof me === 'object') {
        const p = {
          name: (me as any).name || "",
          organization: (me as any).organization || "",
          imageUrl: (me as any).imageUrl || "",
          imageDataUrl: (me as any).imageDataUrl || undefined,
        };
        setProfile(p);
        setProfileDraft(p);
      }
    } catch {}
  }
  const sdk = Pubky.testnet();

  async function loadJobs() {
    try {
      setJobsLoading(true);
      setJobs([]);
      const all: any[] = [];
      try {
        const r = await fetch(`${REGISTRY_URL}/jobs`)
        const rows = (await r.json()) as any[]
        if (Array.isArray(rows)) all.push(...rows)
      } catch {}
      const seen = new Set<string>();
      const uniq: any[] = [];
      for (const j of all) {
        const key = `${j.authorPubKey ?? ""}:${j.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniq.push(j);
        }
      }
      uniq.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setJobs(uniq);
    } catch (e: any) {
      setError(e?.message || "Failed to load jobs");
    } finally {
      setJobsLoading(false);
    }
  }

  async function handleOpenAccount() {
    setLoading(true);
    setError(null);
    setSignedUp(false);
    try {
      // 1) Generate in-memory keypair
      const kp = Keypair.random();
      setKeypair(kp);
      setPubkey(kp.publicKey.z32());

      // 2) Get invite token from staging admin
      const endpoint =
        (import.meta as any).env?.VITE_PUBKY_ADMIN_ENDPOINT ||
        "";
      const adminPassword =
        (import.meta as any).env?.VITE_PUBKY_ADMIN_PASSWORD ||
        "";
      const homePk =
        (import.meta as any).env?.VITE_PUBKY_HOME_PK ||
        "";
      const inviteRes = await fetch(endpoint, {
        method: "GET",
        headers: { "X-Admin-Password": adminPassword },
      });
      const inviteText = await inviteRes.text();
      if (!inviteRes.ok) throw new Error(`${inviteRes.status} ${inviteText}`);

      // 3) Signup on homeserver
      const signer = sdk.signer(kp);
      await signer.signup(PublicKey.from(homePk), inviteText.trim());
      // Publish PKDNS homeserver record like in examples
      try {
        await signer.pkdns.publishHomeserverIfStale(PublicKey.from(homePk));
      } catch {}
      const sess = await signer.signinBlocking();
      setSigner(signer);
      setSession(sess);
      setSignedUp(true);
      await loadMyProfile();
      // Register my pubkey in the local registry (best-effort)
      try {
        await fetch(`${REGISTRY_URL}/pubkeys`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pubkey: kp.publicKey.z32() }),
        });
      } catch {}
      await loadJobs();
    } catch (e: any) {
      setError(friendlyError(e) || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSigninWithSecret() {
    setLoading(true);
    setError(null);
    try {
      const b = Uint8Array.from(atob(loginSecret.trim()), (c) =>
        c.charCodeAt(0)
      );
      const kp = Keypair.fromSecretKey(b);
      setKeypair(kp);
      const pk = kp.publicKey.z32();
      setPubkey(pk);
      const s = sdk.signer(kp);
      const sess = await s.signinBlocking();
      setSigner(s);
      setSession(sess);
      setSignedUp(true);
      await loadMyProfile();
      try {
        await fetch(`${REGISTRY_URL}/pubkeys`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pubkey: pk }),
        });
      } catch {}
      await loadJobs();
    } catch (e: any) {
      setError(friendlyError(e) || "Signin failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSigninWithFile() {
    setLoading(true);
    setError(null);
    try {
      if (!loginFile) throw new Error("Select a recovery file");
      if (!loginPassphrase) throw new Error("Enter passphrase");
      const buf = new Uint8Array(await loginFile.arrayBuffer());
      const kp = (Keypair as any).fromRecoveryFile(
        buf,
        loginPassphrase
      ) as Keypair;
      setKeypair(kp);
      const pk = kp.publicKey.z32();
      setPubkey(pk);
      const s = sdk.signer(kp);
      const sess = await s.signinBlocking();
      setSigner(s);
      setSession(sess);
      setSignedUp(true);
      await loadMyProfile();
      try {
        await fetch(`${REGISTRY_URL}/pubkeys`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pubkey: pk }),
        });
      } catch {}
      await loadJobs();
    } catch (e: any) {
      setError(friendlyError(e) || "Signin failed");
    } finally {
      setLoading(false);
    }
  }

  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    company: "",
    location: "",
    salary: "",
    tags: "",
    description: "",
  });

  const filtered = jobs.filter((j) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const hay = [
      j.title,
      j.company,
      j.location,
      j.salary,
      j.description,
      ...(j.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  async function handlePublish() {
    if (!session || !signer) return;
    setLoading(true);
    setError(null);
    try {
      const now = Date.now();
      const isEdit = Boolean(editingId);
      const myPk = signer.publicKey.z32();
      const job = {
        id: editingId ?? crypto.randomUUID(),
        title: draft.title.trim(),
        company: draft.company.trim(),
        location: draft.location.trim() || undefined,
        salary: draft.salary.trim() || undefined,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description: draft.description.trim(),
        authorPubKey: myPk,
        createdAt: isEdit
          ? jobs.find((j) => j.id === editingId)?.createdAt ?? now
          : now,
        timestamp: new Date(now).toISOString(),
      };
      // Merge with existing list from state (optimistic) and persist
      const next = (
        isEdit ? jobs.map((j) => (j.id === job.id ? job : j)) : [job, ...jobs]
      ).sort((a, b) => b.createdAt - a.createdAt);
      await session.storage.putJson(JOBS_PATH as any, next as any);
      setJobs(next);
      setShowForm(false);
      setEditingId(null);
      setDraft({
        title: "",
        company: "",
        location: "",
        salary: "",
        tags: "",
        description: "",
      });
    } catch (e: any) {
      setError(e?.message || "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(j: any) {
    if (!signer || j.authorPubKey !== signer.publicKey.z32()) {
      setError("You can only edit your own jobs");
      return;
    }
    setEditingId(j.id);
    setDraft({
      title: j.title ?? "",
      company: j.company ?? "",
      location: j.location ?? "",
      salary: j.salary ?? "",
      tags: (j.tags || []).join(", "),
      description: j.description ?? "",
    });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!session || !signer) return;
    const mine = jobs.find((j) => j.id === id);
    if (!mine || mine.authorPubKey !== signer.publicKey.z32()) {
      setError("You can only delete your own jobs");
      return;
    }
    const ok = window.confirm("Delete this job?");
    if (!ok) return;
    try {
      const next = jobs.filter((j) => j.id !== id);
      await session.storage.putJson(JOBS_PATH as any, next as any);
      setJobs(next);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  }

  function bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  function friendlyError(e: any): string {
    const msg = String(e?.message || e || "");
    if (/aead::Error/i.test(msg) || /decrypt/i.test(msg))
      return "Wrong passphrase or corrupted recovery file";
    if (/InvalidCharacterError/i.test(msg) || /base64/i.test(msg))
      return "Invalid base64 secret key";
    if (/No session secret found/i.test(msg))
      return "Not signed in; try again or enable cookies";
    return msg;
  }

  async function handleDownloadRecovery() {
    try {
      if (!keypair) throw new Error("No keypair");
      if (!passphrase) throw new Error("Enter a passphrase");
      const bytes = keypair.createRecoveryFile(passphrase);
      // Copy into a concrete ArrayBuffer to satisfy TS/DOM Blob types
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes as Uint8Array);
      const blob = new Blob([copy.buffer], {
        type: "application/octet-stream",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pubky-${pubkey ?? "key"}.recovery`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    } catch (e: any) {
      setError(e?.message || "Failed to export key");
    }
  }

  async function handleCopySecret() {
    try {
      if (!keypair) throw new Error("No keypair");
      const b64 = bytesToBase64(keypair.secretKey());
      await navigator.clipboard.writeText(b64);
    } catch (e: any) {
      setError(e?.message || "Failed to copy key");
    }
  }

  useEffect(() => {
    if (signedUp) {
      loadJobs();
      loadMyProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedUp]);

  if (!signedUp) {
    return (
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.12),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.10),transparent_60%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-12">
          <div className="w-full grid gap-8 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[11px] text-zinc-400">
                Decentralized • Pubky-powered
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Find and post jobs without intermediaries
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                P2PJobs stores listings and applications directly on Pubky. Own your identity. Control your data. Connect peer‑to‑peer.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-blue-600/40 bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-600/30 disabled:opacity-60"
                  onClick={handleOpenAccount}
                  disabled={loading}
                >
                  {loading ? "Opening…" : "Open account"}
                </button>
                <button
                  className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
                  onClick={() => setShowLogin(true)}
                  disabled={loading}
                >
                  Login
                </button>
              </div>
              {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
              <div className="mt-6 grid gap-3 text-sm text-zinc-300">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-zinc-500">✅</span>
                  <div>
                    <div className="font-medium">Own your profile & keys</div>
                    <div className="text-xs text-zinc-500">Sign and publish with your Pubky identity.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-zinc-500">🔎</span>
                  <div>
                    <div className="font-medium">Peer discovery</div>
                    <div className="text-xs text-zinc-500">Aggregate jobs from known peers automatically.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-zinc-500">📝</span>
                  <div>
                    <div className="font-medium">Private applications</div>
                    <div className="text-xs text-zinc-500">Send applications directly to employers.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-xl">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <div className="text-sm text-zinc-400">Preview</div>
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-md border border-zinc-800 p-3">
                      <div className="text-sm font-medium">Senior Typescript Engineer</div>
                      <div className="text-xs text-zinc-500">Synonym • Remote • $150k–$220k</div>
                    </div>
                    <div className="rounded-md border border-zinc-800 p-3">
                      <div className="text-sm font-medium">Product Designer</div>
                      <div className="text-xs text-zinc-500">Open Source • EU • €75k–€110k</div>
                    </div>
                    <div className="rounded-md border border-zinc-800 p-3">
                      <div className="text-sm font-medium">DevRel</div>
                      <div className="text-xs text-zinc-500">Web3 • Global • Competitive</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showLogin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Login</h2>
                  <button
                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs"
                    onClick={() => setShowLogin(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="grid gap-4 text-sm">
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <div className="mb-2 text-xs text-zinc-400">
                      Sign in with secret (base64)
                    </div>
                    <input
                      className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                      placeholder="Base64 secret key"
                      value={loginSecret}
                      onChange={(e) => setLoginSecret(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        className="rounded-md border border-zinc-700 px-3 py-1.5"
                        onClick={async () => {
                          await handleSigninWithSecret();
                          setShowLogin(false);
                        }}
                        disabled={loading || !loginSecret.trim()}
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <div className="mb-2 text-xs text-zinc-400">
                      Sign in with recovery file
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="recovery-file"
                        className="hidden"
                        type="file"
                        accept="*/*"
                        onChange={(e) =>
                          setLoginFile(e.target.files?.[0] ?? null)
                        }
                      />
                      <label
                        htmlFor="recovery-file"
                        className="cursor-pointer rounded-md border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800"
                      >
                        Choose file
                      </label>
                      <span className="text-xs text-zinc-500 truncate max-w-[240px]">
                        {loginFile ? loginFile.name : "No file chosen"}
                      </span>
                    </div>
                    <input
                      className="mt-2 w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                      placeholder="Passphrase"
                      type="password"
                      value={loginPassphrase}
                      onChange={(e) => setLoginPassphrase(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        className="rounded-md border border-zinc-700 px-3 py-1.5"
                        onClick={async () => {
                          await handleSigninWithFile();
                          setShowLogin(false);
                        }}
                        disabled={loading || !loginFile || !loginPassphrase}
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.10),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.08),transparent_60%)]" />
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="h-8 w-8 rounded-md overflow-hidden border border-zinc-800 hover:border-zinc-700"
            aria-label="Edit profile"
            onClick={() => setShowAccount(true)}
            title="Edit profile"
          >
            {profile?.imageDataUrl ? (
              <img src={profile.imageDataUrl} alt="me" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-zinc-800" />
            )}
          </button>
          <div>
            <h1 className="text-xl font-semibold">P2PJobs</h1>
            {(profile?.name || profile?.organization) && (
              <div className="text-xs text-zinc-400">{profile?.name}{profile?.name && profile?.organization ? ' • ' : ''}{profile?.organization}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {pubkey ? `pk_${pubkey.slice(0, 8)}…${pubkey.slice(-6)}` : ""}
          <button
            className="rounded-md border border-zinc-700 px-3 py-1.5"
            onClick={() => setShowAccount(true)}
          >
            Account
          </button>
          <button
            className="rounded-md border border-zinc-700 px-3 py-1.5"
            onClick={async () => {
              if (!pubkey) return;
              try {
                const r = await fetch(
                  `${REGISTRY_URL}/applications?employer=${encodeURIComponent(
                    pubkey
                  )}`
                );
                const rows = r.ok ? await r.json() : [];
                setInbox(rows);
                setShowInbox(true);
              } catch (e) {
                setInbox([]);
                setShowInbox(true);
              }
            }}
            disabled={!pubkey}
          >
            Applications
          </button>
          <button
            className="rounded-md border border-zinc-700 px-3 py-1.5"
            onClick={loadJobs}
            disabled={jobsLoading}
          >
            {jobsLoading ? "Loading…" : "Refresh"}
          </button>
          <button
            className="rounded-md border border-zinc-700 px-3 py-1.5"
            onClick={() => setShowForm(true)}
          >
            Post Job
          </button>
        </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pb-16 pt-6">
        {showAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Account</h2>
                <button
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs"
                  onClick={() => setShowAccount(false)}
                >
                  Close
                </button>
              </div>
              {pubkey && (
                <div className="mt-2 text-xs text-zinc-400 break-all">
                  pubkey: {pubkey}
                </div>
              )}
              <div className="mt-4 grid gap-2 text-sm">
                <div className="text-sm font-semibold">Profile</div>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-zinc-800">
                    {profileDraft.imageDataUrl ? (
                      <img src={profileDraft.imageDataUrl} alt="profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-zinc-800" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="profile-image" className="hidden" type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 2 * 1024 * 1024) { setError('Image too large (2MB max)'); return }
                      const buf = await f.arrayBuffer();
                      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
                      const dataUrl = `data:${f.type};base64,${b64}`;
                      setProfileDraft({ ...profileDraft, imageUrl: '', imageDataUrl: dataUrl });
                    }} />
                    <label htmlFor="profile-image" className="cursor-pointer rounded-md border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800">Upload image</label>
                  </div>
                </div>
                <input
                  className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                  placeholder="Name"
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                />
                <input
                  className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                  placeholder="Organization"
                  value={profileDraft.organization}
                  onChange={(e) => setProfileDraft({ ...profileDraft, organization: e.target.value })}
                />
                <div className="flex justify-end">
                  <button className="rounded-md border border-zinc-700 px-3 py-1.5" disabled={!session || savingProfile} onClick={async () => {
                    if (!session) return;
                    setSavingProfile(true);
                    try {
                      const payload = {
                        name: profileDraft.name.trim() || undefined,
                        organization: profileDraft.organization.trim() || undefined,
                        imageUrl: profileDraft.imageUrl || undefined,
                        imageDataUrl: profileDraft.imageDataUrl || undefined,
                        updatedAt: Date.now(),
                      };
                      await session.storage.putJson(PROFILE_PATH as any, payload as any);
                      setProfile(payload);
                      setShowAccount(false);
                    } catch (e) { setError(String(e)) } finally { setSavingProfile(false) }
                  }}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
                </div>
                <div className="mt-4 h-px bg-zinc-800" />
                <div className="text-xs font-medium text-zinc-400">Account key</div>
                <input
                  className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                  placeholder="Passphrase (encrypts recovery file)"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  type="password"
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-zinc-700 px-3 py-1.5"
                    onClick={handleDownloadRecovery}
                    disabled={!keypair}
                  >
                    Download recovery file
                  </button>
                  <button
                    className="rounded-md border border-zinc-700 px-3 py-1.5"
                    onClick={handleCopySecret}
                    disabled={!keypair}
                  >
                    Copy secret (base64)
                  </button>
                </div>
                <div className="text-xs text-zinc-500">
                  Keep this safe. Anyone with this can post as you.
                </div>
                {error && <div className="text-xs text-red-400">{error}</div>}
              </div>
            </div>
          </div>
        )}
        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs by title, company, tags, location"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          />
        </div>

        {showForm && (
          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="mb-3 text-lg font-medium">
              {editingId ? "Edit job" : "New job"}
            </h2>
            <div className="grid gap-3 text-sm">
              <input
                className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                placeholder="Title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                placeholder="Company"
                value={draft.company}
                onChange={(e) =>
                  setDraft({ ...draft, company: e.target.value })
                }
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  className="rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                  placeholder="Location"
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                />
                <input
                  className="rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                  placeholder="Salary"
                  value={draft.salary}
                  onChange={(e) =>
                    setDraft({ ...draft, salary: e.target.value })
                  }
                />
                <input
                  className="rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                  placeholder="Tags (comma, separated)"
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                />
              </div>
              <textarea
                className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                rows={6}
                placeholder="Description"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-md border border-zinc-700 px-3 py-1.5"
                onClick={handlePublish}
                disabled={loading}
              >
                {loading
                  ? editingId
                    ? "Saving…"
                    : "Publishing…"
                  : editingId
                  ? "Save changes"
                  : "Publish"}
              </button>
              <button
                className="rounded-md border border-zinc-700 px-3 py-1.5"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-xl">
          <div className="mb-2 text-sm text-zinc-400">Jobs</div>
          {jobsLoading && filtered.length === 0 ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-md border border-zinc-800 p-3"
                >
                  <div className="h-4 w-40 rounded bg-zinc-800" />
                  <div className="mt-2 h-3 w-24 rounded bg-zinc-800" />
                  <div className="mt-3 h-16 w-full rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No jobs yet. Be the first to post.
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((j) => (
                <article key={j.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">{j.title}</h3>
                      {j.company && (
                        <div className="text-sm font-medium text-zinc-300">{j.company}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {signer && j.authorPubKey === signer.publicKey.z32() && (
                        <>
                          <button
                            className="rounded-md border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800"
                            onClick={() => startEdit(j)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border border-red-700 px-2 py-0.5 text-red-300 hover:bg-red-900/20"
                            onClick={() => handleDelete(j.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {[j.location, j.salary].filter(Boolean).join(" • ")}
                  </div>
                  <div className="mt-2 text-sm text-zinc-300">
                    <p className="whitespace-pre-wrap line-clamp-4">{j.description}</p>
                    {j.description && j.description.length > 320 && (
                      <button
                        className="mt-1 text-xs text-blue-400 hover:underline"
                        onClick={() => setViewJob(j)}
                      >
                        Read more
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(j.tags || []).map((t: string) => (
                      <span key={t} className="rounded-full border border-zinc-700 bg-zinc-800/40 px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                  {(!signer || j.authorPubKey !== signer.publicKey.z32()) && (
                    <div className="mt-4 flex justify-center">
                      <button
                        className="rounded-lg border border-blue-600/40 bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-600/30"
                        onClick={() => {
                          setApplyJob(j);
                          setShowApply(true);
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Applications</h2>
              <div className="flex items-center gap-2">
                {viewApp && (
                  <button
                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs"
                    onClick={() => setViewApp(null)}
                  >
                    Back
                  </button>
                )}
                <button
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs"
                  onClick={() => {
                    setShowInbox(false);
                    setViewApp(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            {viewApp ? (
              <div className="grid gap-2 text-sm">
                <div className="text-xs text-zinc-500">
                  Applicant: {viewApp.applicantPubkey}
                </div>
                <div className="rounded-md border border-zinc-800 p-3">
                  <div className="text-sm font-medium">{viewApp.name}</div>
                  <div className="text-xs text-zinc-400">{viewApp.email}</div>
                  {viewApp.resumeUrl && (
                    <div className="mt-2 text-xs">
                      <a
                        href={viewApp.resumeUrl}
                        className="text-blue-400 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Resume
                      </a>
                    </div>
                  )}
                  {viewApp.message && (
                    <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                      {viewApp.message}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-zinc-500">
                    Applied: {viewApp.timestamp}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 text-sm">
                {inbox.length === 0 ? (
                  <div className="text-zinc-500">No applications yet.</div>
                ) : (
                  inbox.map((a) => (
                    <div key={a.id} className="rounded-md border border-zinc-800 p-3">
                      <div className="mb-1 text-xs text-zinc-500">from: {a.applicantPubkey}</div>
                      {(a.jobTitle || a.jobId) && (
                        <div className="mb-1 text-xs text-zinc-400">Applying for: {a.jobTitle || a.jobId}</div>
                      )}
                      <button
                        className="text-blue-400 hover:underline"
                        onClick={() => setViewApp(a)}
                      >
                        Open application
                      </button>
      </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {viewJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl flex flex-col">
            <div className="mb-3 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold">{viewJob.title}</h2>
              <button className="rounded-md border border-zinc-700 px-2 py-1 text-xs" onClick={() => setViewJob(null)}>Close</button>
            </div>
            <div className="overflow-y-auto min-h-0 pr-1">
              <div className="text-xs text-zinc-500">{viewJob.company} • {[viewJob.location, viewJob.salary].filter(Boolean).join(" • ")}</div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{viewJob.description}</div>
              {Array.isArray(viewJob.tags) && viewJob.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {viewJob.tags.map((t: string) => (
                    <span key={t} className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showApply && applyJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Apply to {applyJob.title}
              </h2>
              <button
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs"
                onClick={() => setShowApply(false)}
              >
                Close
              </button>
            </div>
            <div className="grid gap-2 text-sm">
              <input
                className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                placeholder="Name"
                value={applyForm.name}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, name: e.target.value })
                }
              />
              <input
                className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                placeholder="Email"
                value={applyForm.email}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, email: e.target.value })
                }
              />
              <input
                className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                placeholder="Resume URL"
                value={applyForm.resumeUrl}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, resumeUrl: e.target.value })
                }
              />
              <textarea
                className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2"
                rows={5}
                placeholder="Message"
                value={applyForm.message}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, message: e.target.value })
                }
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="rounded-md border border-zinc-700 px-3 py-1.5"
                  onClick={() => setShowApply(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md border border-zinc-700 px-3 py-1.5"
                  onClick={async () => {
                    if (!session || !signer) {
                      setError("Sign in first");
                      return;
                    }
                    try {
                      const id = crypto.randomUUID();
                      const body = {
                        id,
                        employerPubkey: applyJob.authorPubKey,
                        applicantPubkey: signer.publicKey.z32(),
                        name: applyForm.name,
                        email: applyForm.email,
                        resumeUrl: applyForm.resumeUrl || undefined,
                        message: applyForm.message,
                        jobId: applyJob.id,
                        timestamp: new Date().toISOString(),
                      };
                      await session.storage.putJson(
                        `/pub/${APP_NAMESPACE}/applications/${id}.json` as any,
                        body as any
                      );
                      setShowApply(false);
                      setApplyForm({
                        name: "",
                        email: "",
                        resumeUrl: "",
                        message: "",
                      });
                      alert("Application sent");
                    } catch (err) {
                      setError(String(err));
                    }
                  }}
                >
                  Send application
        </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

export default App;
