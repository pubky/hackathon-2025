import React, { useMemo, useRef, useState, useEffect } from "react";
import HTMLFlipBook from "react-pageflip";
import { Button } from "./components/Button";
import { Input } from "./components/Input";
import { Card, CardContent } from "./components/Card";
import { Copy, Search, Menu, X, ChevronLeft, ChevronRight, BookOpen, Bookmark, BookmarkCheck, Clock, Check, CheckCircle, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CodeHighlight } from "./components/CodeHighlight";
import { getSessionId, getBookmarks, addBookmark, removeBookmark, type Bookmark as BookmarkType, getTriedRecipes, markRecipeAsTried, unmarkRecipeAsTried, type TriedRecipe } from "./lib/supabase";
import confetti from "canvas-confetti";

// -----------------------------
// Types
// -----------------------------
interface Recipe {
  id: string;
  title: string;
  kind: "intro" | "identity" | "storage" | "auth" | "discovery" | "testing";
  body?: string;
  code?: string;
  notes?: string;
  estimatedTime?: string;
}

interface Kind { id: Recipe["kind"]; label: string }

function LogoCooky({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src="/cooky-logo.png" alt="Cooky logo" className="h-10 w-auto" />
    </div>
  );
}

/**
 * Cooky: Pubky SDK Cookbook
 * Single-file demo React app that looks like a cookbook with page turning.
 * - Left vertical navigation with multi-line menu items
 * - Flipbook view with page-turn transitions
 * - Search, copy-to-clipboard, and responsive layout
 * - Tailwind + lucide-react
 */

// ---- Demo content ----
const RECIPES: Recipe[] = [
  {
    id: "welcome",
    title: "Pubky SDK Cookbook",
    kind: "intro",
    estimatedTime: "1 min read",
    body: `## About Cooky
Cooky is a developer-friendly, copy-and-paste cookbook for building on the Pubky ecosystem.

## What you can expect
• Code snippets. Every page starts with a working snippet that compiles against pubky 0.6 series.
• Practical defaults. Staging and local testnet examples.
• Short context. When to use, what to tweak, and common gotchas.

## Conventions
• Version. Recipes target \`pubky = "=0.6.0"\` and Tokio runtime.
• Paths. We use \`pubky://<PUBKY>/pub/<app>/...\` for public files and HTTPS relay forms for read-only examples.
• Keys. Generate a keypair locally, store an encrypted recovery file, and keep secrets out of your repo.`,
  },
  {
    id: "welcome-2",
    title: "Let's cook",
    kind: "intro",
    estimatedTime: "1 min read",
    body: `## Quick start
1) cargo add pubky@=0.6.0 tokio --features macros,rt-multi-thread
2) Pick a backend: local \`pubky-testnet\` for offline dev or staging (see beta guide for host key and tokens).
3) Paste "Create a client," then try "Sign up," then "Write a file," and verify with "HEAD" and "List."

## Beta shortcuts
• Staging homeserver public key, example signup tokens, and the admin endpoint are in the tester PDF (currently only available internally or on request). Rotate as needed.

## Safety tips
• Treat recovery files like secrets. Use strong passphrases.
• When in doubt, first test against \`pubky-testnet\` first, then stage, and then prod.

Ready? Let's cook. 👨‍🍳`,
  },
  {
    id: "client",
    title: "Create a Pubky instance",
    kind: "identity",
    estimatedTime: "1 min",
    code: `use pubky::Pubky;

fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    Ok(())
}`,
    notes: "Every program needs one. The Pubky instance is your entry point to the SDK.",
  },
  {
    id: "signup",
    title: "Sign up a new user to a homeserver",
    kind: "identity",
    estimatedTime: "3 min",
    code: `use pubky::{Pubky, Keypair};
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    let keypair = Keypair::random();
    let homeserver = "ufib...u1uy";
    let token = Some("G12J-824M-F0V0");

    let signer = pubky.signer(keypair);
    let session = signer.signup(&homeserver, token).await?;
    println!("Signed up: {:?}", session);
    Ok(())
}`,
    notes: "Use staging host key and token during beta. Keypair::random() generates a new key.",
  },
  {
    id: "signin",
    title: "Sign in later with the same keypair",
    kind: "identity",
    estimatedTime: "2 min",
    code: `use pubky::{Pubky, Keypair};
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    let keypair = Keypair::random(); // load your real key from recovery file
    let signer = pubky.signer(keypair);
    let session = signer.signin().await?;
    println!("Signed in: {:?}", session);
    Ok(())
}`,
    notes: "Use recovery file to restore your keypair securely.",
  },
  {
    id: "putget",
    title: "Write a file and read it back (public)",
    kind: "storage",
    estimatedTime: "3 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    // Assume you have a session from signin/signup
    let session = /* your session */;

    // Write to public storage
    session.storage().put("/pub/my.app/hello.txt", "hello world").await?;

    // Read back using public storage (no auth needed)
    let text = pubky.public_storage()
        .get("/pub/my.app/hello.txt")
        .await?
        .text()
        .await?;
    println!("Got: {}", text);
    Ok(())
}`,
    notes: "Use domain-like paths: /pub/mycoolnew.app/ for public data.",
  },
  {
    id: "head",
    title: "HEAD check for size and existence",
    kind: "storage",
    estimatedTime: "2 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    let session = /* your session */;

    let resp = session.storage().head("/pub/my.app/hello.txt").await?;
    if let Some(size) = resp.content_length() {
        println!("Size: {} bytes", size);
    } else {
        println!("File exists, size unknown");
    }
    Ok(())
}`,
    notes: "HEAD is efficient for checking existence without downloading content.",
  },
  {
    id: "list",
    title: "List files with cursor and limit",
    kind: "storage",
    estimatedTime: "3 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    let session = /* your session */;
    let base = "/pub/my.app/";

    // List files with pagination
    let files = session.storage().list(base).await?;
    println!("Files: {:?}", files);
    Ok(())
}`,
    notes: "List returns file paths under the specified directory.",
  },
  {
    id: "delete",
    title: "Delete a file",
    kind: "storage",
    estimatedTime: "1 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    let session = /* your session */;

    session.storage().delete("/pub/my.app/hello.txt").await?;
    println!("File deleted");
    Ok(())
}`,
    notes: "Deletes are permanent. Make sure you have the right path!",
  },
  {
    id: "public-get",
    title: "Get public data from any user",
    kind: "storage",
    estimatedTime: "2 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;

    // Read public data from any user (no auth needed)
    let url = "pubky://USER_PUBKY/pub/pubky.app/profile.json";
    let data = pubky.public_storage()
        .get(url)
        .await?
        .text()
        .await?;

    println!("Public data: {}", data);
    Ok(())
}`,
    notes: "Access public data from any Pubky user without authentication.",
  },
  {
    id: "resolve",
    title: "Resolve homeserver for a given Pubky",
    kind: "discovery",
    estimatedTime: "2 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    let user_id = "YOUR_PUBKY";

    if let Some(homeserver) = pubky.resolve_homeserver(user_id).await? {
        println!("Homeserver: {}", homeserver);
    } else {
        println!("Not found");
    }
    Ok(())
}`,
    notes: "Uses Pkarr DNS to discover where a user's data lives.",
  },
  {
    id: "pairing",
    title: "Pubky Ring pairing (QR login flow)",
    kind: "auth",
    estimatedTime: "4 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;

    // Start authentication flow
    let auth_flow = pubky.start_auth_flow().await?;
    println!("Show this URL as QR code: {}", auth_flow.url());

    // Wait for user to scan and approve
    let session = auth_flow.wait_for_auth().await?;
    println!("Authenticated! Session: {:?}", session);
    Ok(())
}`,
    notes: "Display the URL as a QR code for users to scan with Pubky Ring app.",
  },
  {
    id: "recovery",
    title: "Create and decrypt a recovery file",
    kind: "identity",
    estimatedTime: "3 min",
    code: `use pubky::Keypair;

fn main() -> anyhow::Result<()> {
    let keypair = Keypair::random();
    let passphrase = "strong passphrase";

    // Save keypair to encrypted file
    keypair.save_to_file("my_recovery.bin", passphrase)?;

    // Restore keypair from file
    let restored = Keypair::from_file("my_recovery.bin", passphrase)?;
    assert_eq!(restored.public_key(), keypair.public_key());
    println!("Recovery successful!");
    Ok(())
}`,
    notes: "NEVER share your recovery file or passphrase. Store them securely like passwords.",
  },
  {
    id: "logging",
    title: "Enable debug logging",
    kind: "testing",
    estimatedTime: "2 min",
    code: `use tracing_subscriber;

fn main() -> anyhow::Result<()> {
    // Initialize tracing subscriber for debug output
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .init();

    // Now run your Pubky operations
    // You'll see detailed debug logs for all SDK activity
    println!("Logging enabled!");
    Ok(())
}`,
    notes: "See what's happening under the hood. Great for debugging storage roundtrips.",
  },
  {
    id: "testnet",
    title: "Run an embedded local testnet",
    kind: "testing",
    estimatedTime: "2 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Create Pubky instance with testnet config
    let pubky = Pubky::testnet().await?;

    // Now you can test signup, signin, and storage operations
    // without connecting to staging or production servers
    println!("Testnet ready for testing!");
    Ok(())
}`,
    notes: "Perfect for offline development and testing. No internet required!",
  },
  {
    id: "capabilities",
    title: "Define granular access with Capabilities",
    kind: "auth",
    estimatedTime: "3 min",
    code: `use pubky::{Pubky, Capabilities};
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;

    // Define specific permissions for auth flow
    let caps = Capabilities::builder()
        .read("/pub/my.app/**")
        .write("/pub/my.app/posts/**")
        .delete("/pub/my.app/drafts/**")
        .build();

    let auth_flow = pubky.start_auth_flow_with_caps(caps).await?;
    println!("Auth URL: {}", auth_flow.url());
    Ok(())
}`,
    notes: "Limit what apps can access. Use wildcards for flexible path matching.",
  },
  {
    id: "pkdns",
    title: "Publish and resolve PKDNS records",
    kind: "discovery",
    estimatedTime: "3 min",
    code: `use pubky::Pubky;
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;
    let session = /* your session */;

    // Publish a DNS-like record using Pkarr
    session.publish_pkarr_record("myapp", "example.com").await?;

    // Resolve it later
    let record = pubky.resolve_pkarr("YOUR_PUBKY", "myapp").await?;
    println!("Record: {:?}", record);
    Ok(())
}`,
    notes: "Pkarr enables decentralized DNS using your Pubky as the root of trust.",
  },
  {
    id: "session-persist",
    title: "Persist and restore sessions",
    kind: "identity",
    estimatedTime: "2 min",
    code: `use pubky::{Pubky, PubkySession};
use tokio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pubky = Pubky::new()?;

    // After signin/signup, save session
    let session = /* your session */;
    let session_data = session.to_bytes()?;
    std::fs::write("session.dat", session_data)?;

    // Restore later
    let saved = std::fs::read("session.dat")?;
    let restored = PubkySession::from_bytes(&saved)?;
    println!("Session restored!");
    Ok(())
}`,
    notes: "Store session secrets securely. Treat them like passwords!",
  },
];

const KINDS: Kind[] = [
  { id: "intro", label: "Intro" },
  { id: "identity", label: "Identity" },
  { id: "storage", label: "Storage" },
  { id: "auth", label: "Auth" },
  { id: "discovery", label: "Discovery" },
  { id: "testing", label: "Testing" },
];

const SORTED_RECIPES = (() => {
  const kindOrder = KINDS.map(k => k.id);
  return [...RECIPES].sort((a, b) => {
    const aIndex = kindOrder.indexOf(a.kind);
    const bIndex = kindOrder.indexOf(b.kind);
    return aIndex - bIndex;
  });
})();

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const up = () => setReduced(q.matches);
    up();
    q.addEventListener("change", up);
    return () => q.removeEventListener("change", up);
  }, []);
  return reduced;
}

function parseBodyWithHeadings(body: string) {
  const lines = body.split('\n');
  const elements: JSX.Element[] = [];
  let currentParagraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push(
        <div key={key++} className="text-sm leading-relaxed text-zinc-700 mb-3">
          {currentParagraph.join('\n')}
        </div>
      );
      currentParagraph = [];
    }
  };

  lines.forEach((line) => {
    if (line.startsWith('## ')) {
      flushParagraph();
      elements.push(
        <h3 key={key++} className="text-lg font-bold text-orange-600 mt-4 mb-2 first:mt-0">
          {line.substring(3)}
        </h3>
      );
    } else {
      currentParagraph.push(line);
    }
  });

  flushParagraph();
  return <div className="whitespace-pre-wrap flex-1">{elements}</div>;
}

function Sidebar({ items, currentId, onSelect, open, bookmarkedIds, triedIds }: { items: Recipe[]; currentId: string; onSelect: (id: string) => void; open?: boolean; bookmarkedIds: Set<string>; triedIds: Set<string> }) {
  return (
    <AnimatePresence>
      {(open || typeof open === "undefined") && (
        <motion.aside
          initial={{ x: -16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -16, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full w-72 shrink-0 p-6 hidden md:flex md:flex-col gap-3"
        >
          <div className="flex items-center gap-2 px-1 py-1">
            <BookOpen className="size-5" />
            <div className="font-semibold tracking-tight">Pubky SDK Cookbook</div>
          </div>
         
          <nav className="flex-1 overflow-auto pr-1">
            {KINDS.map((k) => (
              <div key={k.id} className="mb-2">
                <div className="px-1 pb-1 text-xs uppercase tracking-wide text-orange-600 font-semibold">{k.label}</div>
                <ul className="space-y-1">
                  {items
                    .filter((it) => it.kind === k.id)
                    .map((it) => (
                      <li key={it.id}>
                        <button
                          onClick={() => onSelect(it.id)}
                          className={`text-left w-full rounded-xl px-3 py-1 hover:bg-orange-50 transition-colors flex items-center justify-between gap-2 ${
                            currentId === it.id ? "bg-orange-100 text-orange-600" : "text-zinc-700"
                          }`}
                        >
                          <div className="text-xs font-medium leading-snug flex-1">
                            {it.title}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {triedIds.has(it.id) && (
                              <Check className="size-3.5 text-orange-600" />
                            )}
                            {bookmarkedIds.has(it.id) && (
                              <BookmarkCheck className="size-3.5 fill-orange-600 text-orange-600" />
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
       
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Page({ recipe, copyFeedback, setCopyFeedback, bookmarkFeedback, triedFeedback, isBookmarked, onToggleBookmark, isTried, onToggleTried, onEnlargeCode }: { recipe: Recipe; copyFeedback: boolean; setCopyFeedback: (value: boolean) => void; bookmarkFeedback: string | null; triedFeedback: string | null; isBookmarked: boolean; onToggleBookmark: (recipeId: string) => void; isTried: boolean; onToggleTried: (recipeId: string) => void; onEnlargeCode?: (code: string) => void }) {
  return (
    <div className="w-full h-full shadow-xl rounded-3xl">
      <Card className="w-full h-full rounded-3xl shadow-[0_8px_40px_rgba(217,119,6,0.12)] border-orange-300/50 bg-orange-100">
        <CardContent className="p-7 h-full flex flex-col relative overflow-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase tracking-wide text-orange-600 font-semibold">
              {KINDS.find((k) => k.id === recipe.kind)?.label}
            </div>
            {recipe.estimatedTime && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <Clock className="size-3" />
                {recipe.estimatedTime}
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold leading-snug mb-3 tracking-tight text-zinc-900">{recipe.title}</h2>
          {recipe.body && parseBodyWithHeadings(recipe.body)}
          {recipe.code && (
            <div className="mt-1 flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(recipe.code!);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }}
                  title="Copy to clipboard"
                >
                  <Copy className="size-4 mr-1" />
                  {copyFeedback ? "Copied!" : "Copy"}
                </Button>
                {onEnlargeCode && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEnlargeCode(recipe.code!)}
                    title="Enlarge code view"
                  >
                    <Maximize2 className="size-4 mr-1" />
                    Enlarge
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onToggleBookmark(recipe.id)}
                  className={isBookmarked ? '!bg-orange-600 !border-orange-600 hover:!bg-orange-700 !text-white' : ''}
                  title={isBookmarked ? "Bookmarked" : "Bookmark recipe"}
                >
                  <Bookmark className={`size-4 mr-1 ${isBookmarked ? 'fill-white text-white' : ''}`} />
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onToggleTried(recipe.id)}
                  className={isTried ? '!bg-orange-600 !border-orange-600 hover:!bg-orange-700 !text-white' : ''}
                  title={isTried ? "Mark as not tried" : "Mark as tried"}
                >
                  <CheckCircle className={`size-4 mr-1 ${isTried ? 'text-white' : ''}`} />
                  {isTried ? "Cooked!" : "Cooked!"}
                </Button>
              </div>
              <div className="relative">
                <div className="rounded-xl overflow-auto max-h-[420px]">
                  <CodeHighlight code={recipe.code} />
                </div>
              </div>
            </div>
          )}
          {recipe.notes && (
            <div className="mt-3 text-xs text-orange-600">
              {recipe.notes}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FlipBookView({ recipes, currentId, onFlip, copyFeedback, setCopyFeedback, bookmarkFeedback, triedFeedback, bookmarkedIds, onToggleBookmark, triedIds, onToggleTried, onEnlargeCode }: { recipes: Recipe[]; currentId: string; onFlip: (id: string) => void; copyFeedback: boolean; setCopyFeedback: (value: boolean) => void; bookmarkFeedback: string | null; triedFeedback: string | null; bookmarkedIds: Set<string>; onToggleBookmark: (recipeId: string) => void; triedIds: Set<string>; onToggleTried: (recipeId: string) => void; onEnlargeCode: (code: string) => void }) {
  const bookRef = useRef<any>(null);
  const isProgrammaticFlip = useRef(false);
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    recipes.forEach((r, i) => map.set(r.id, i));
    return map;
  }, [recipes]);

  useEffect(() => {
    const idx = indexById.get(currentId);
    if (idx != null && bookRef.current) {
      try {
        isProgrammaticFlip.current = true;
        bookRef.current.pageFlip().turnToPage(idx);
      } catch {}
    }
  }, [currentId, indexById]);

  if (recipes.length === 0) {
    return (
      <div className="relative flex-1 h-full p-2 md:p-6 flex items-center justify-center">
        <p className="text-orange-600 text-center">No recipes found</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 h-full p-2 md:p-6">
      <HTMLFlipBook
        key={recipes.map(r => r.id).join(',')}
        width={680}
        height={900}
        minWidth={300}
        maxWidth={900}
        minHeight={600}
        maxHeight={1400}
        className="mx-auto"
        size="stretch"
        showCover={false}
        mobileScrollSupport
        onFlip={(e: any) => {
          if (isProgrammaticFlip.current) {
            isProgrammaticFlip.current = false;
            return;
          }
          const pageIndex = e?.data ?? 0;
          const next = recipes[pageIndex]?.id;
          if (next) onFlip(next);
        }}
        ref={bookRef}
      >
        {recipes.map((r) => (
          <div key={r.id} className="bg-transparent">
            <Page recipe={r} copyFeedback={copyFeedback} setCopyFeedback={setCopyFeedback} bookmarkFeedback={bookmarkFeedback} triedFeedback={triedFeedback} isBookmarked={bookmarkedIds.has(r.id)} onToggleBookmark={onToggleBookmark} isTried={triedIds.has(r.id)} onToggleTried={onToggleTried} onEnlargeCode={onEnlargeCode} />
          </div>
        ))}
      </HTMLFlipBook>
      <div className="absolute inset-x-0 bottom-8 gap-3 flex justify-center pointer-events-none">
        <span className="pointer-events-auto">
          <Button size="icon" variant="secondary" onClick={() => bookRef.current?.pageFlip().flipPrev()} aria-label="Previous page">
            <ChevronLeft className="size-5" />
          </Button>
        </span>
        <span className="pointer-events-auto">
          <Button size="icon" variant="secondary" onClick={() => bookRef.current?.pageFlip().flipNext()} aria-label="Next page">
            <ChevronRight className="size-5" />
          </Button>
        </span>
      </div>
    </div>
  );
}

function ScrollView({ recipes, currentId, copyFeedback, setCopyFeedback, bookmarkFeedback, triedFeedback, bookmarkedIds, onToggleBookmark, triedIds, onToggleTried, onEnlargeCode }: { recipes: Recipe[]; currentId: string; copyFeedback: boolean; setCopyFeedback: (value: boolean) => void; bookmarkFeedback: string | null; triedFeedback: string | null; bookmarkedIds: Set<string>; onToggleBookmark: (recipeId: string) => void; triedIds: Set<string>; onToggleTried: (recipeId: string) => void; onEnlargeCode: (code: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-id='${currentId}']`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentId]);

  if (recipes.length === 0) {
    return (
      <div className="flex-1 h-full overflow-auto px-6 py-8 flex items-center justify-center">
        <p className="text-orange-600 text-center">No recipes found</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 h-full overflow-auto px-6 py-8 space-y-6">
      {recipes.map((r) => (
        <div key={r.id} data-id={r.id}>
          <Page recipe={r} copyFeedback={copyFeedback} setCopyFeedback={setCopyFeedback} bookmarkFeedback={bookmarkFeedback} triedFeedback={triedFeedback} isBookmarked={bookmarkedIds.has(r.id)} onToggleBookmark={onToggleBookmark} isTried={triedIds.has(r.id)} onToggleTried={onToggleTried} onEnlargeCode={onEnlargeCode} />
        </div>
      ))}
    </div>
  );
}

export default function CookyApp() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string>(SORTED_RECIPES[0].id);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);
  const [triedFeedback, setTriedFeedback] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [triedRecipes, setTriedRecipes] = useState<TriedRecipe[]>([]);
  const [sessionId] = useState(() => getSessionId());
  const [enlargedCode, setEnlargedCode] = useState<string | null>(null);
  const [showChefCelebration, setShowChefCelebration] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map(b => b.recipe_id)), [bookmarks]);
  const triedIds = useMemo(() => new Set(triedRecipes.map(t => t.recipe_id)), [triedRecipes]);

  const actualRecipes = useMemo(() => SORTED_RECIPES.filter(r => r.kind !== "intro"), []);
  const actualRecipesCount = actualRecipes.length;

  useEffect(() => {
    getBookmarks(sessionId).then(setBookmarks);
    getTriedRecipes(sessionId).then(setTriedRecipes);
  }, [sessionId]);

  const handleToggleBookmark = async (recipeId: string) => {
    const isCurrentlyBookmarked = bookmarkedIds.has(recipeId);
    console.log('handleToggleBookmark called:', { recipeId, isCurrentlyBookmarked, sessionId, currentBookmarks: bookmarks.map(b => b.recipe_id) });

    if (isCurrentlyBookmarked) {
      console.log('Removing bookmark...');
      const success = await removeBookmark(recipeId, sessionId);
      console.log('Remove bookmark result:', success);
      if (success) {
        const updatedBookmarks = await getBookmarks(sessionId);
        console.log('Updated bookmarks after removal:', updatedBookmarks.map(b => b.recipe_id));
        setBookmarks(updatedBookmarks);
      }
    } else {
      console.log('Adding bookmark...');
      const success = await addBookmark(recipeId, sessionId);
      console.log('Add bookmark result:', success);
      if (success) {
        const updatedBookmarks = await getBookmarks(sessionId);
        console.log('Updated bookmarks after addition:', updatedBookmarks.map(b => b.recipe_id));
        setBookmarks(updatedBookmarks);
        setBookmarkFeedback(recipeId);
        setTimeout(() => setBookmarkFeedback(null), 2000);
      }
    }
  };

  const handleToggleTried = async (recipeId: string) => {
    const isCurrentlyTried = triedIds.has(recipeId);
    console.log('handleToggleTried called:', { recipeId, isCurrentlyTried, sessionId, currentTried: triedRecipes.map(t => t.recipe_id) });

    if (isCurrentlyTried) {
      console.log('Removing tried status...');
      const success = await unmarkRecipeAsTried(recipeId, sessionId);
      console.log('Remove tried result:', success);
      if (success) {
        const updatedTried = await getTriedRecipes(sessionId);
        console.log('Updated tried recipes after removal:', updatedTried.map(t => t.recipe_id));
        setTriedRecipes(updatedTried);
      }
    } else {
      console.log('Adding tried status...');
      const success = await markRecipeAsTried(recipeId, sessionId);
      console.log('Add tried result:', success);
      if (success) {
        const updatedTried = await getTriedRecipes(sessionId);
        console.log('Updated tried recipes after addition:', updatedTried.map(t => t.recipe_id));
        setTriedRecipes(updatedTried);
        setTriedFeedback(recipeId);
        setTimeout(() => setTriedFeedback(null), 2000);

        const triedActualRecipes = updatedTried.filter(t => actualRecipes.some(r => r.id === t.recipe_id));
        if (triedActualRecipes.length === actualRecipesCount) {
          triggerChefCelebration();
        }
      }
    }
  };

  const triggerChefCelebration = () => {
    setShowChefCelebration(true);

    const duration = 4000;
    const end = Date.now() + duration;

    const colors = ['#ea580c', '#fb923c', '#fdba74', '#fed7aa'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    setTimeout(() => setShowChefCelebration(false), 5000);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SORTED_RECIPES;
    return SORTED_RECIPES.filter((r) => r.title.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q) || r.body?.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((r) => r.id === currentId)) {
      setCurrentId(filtered[0].id);
    }
  }, [filtered, currentId]);

  useEffect(() => {
    console.assert(Array.isArray(SORTED_RECIPES) && SORTED_RECIPES.length > 0, "SORTED_RECIPES should be a non-empty array");
    console.assert(SORTED_RECIPES[0].id === "welcome" && SORTED_RECIPES[1].id === "welcome-2", "Intro should span two pages: welcome, welcome-2");
    const ids = new Set(SORTED_RECIPES.map((r) => r.id));
    console.assert(ids.size === SORTED_RECIPES.length, "Recipe IDs must be unique");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        document.querySelector<HTMLButtonElement>("[aria-label='Previous page']")?.click();
      } else if (e.key === "ArrowRight") {
        document.querySelector<HTMLButtonElement>("[aria-label='Next page']")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen h-screen w-full bg-gradient-to-br from-orange-50 via-white to-amber-50 text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-orange-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-6 md:py-6 flex items-center gap-4">
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
          <LogoCooky className="scale-100" />
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs px-8">
            <div className="flex-1 h-2 bg-orange-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-600 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${(triedRecipes.filter(t => actualRecipes.some(r => r.id === t.recipe_id)).length / actualRecipesCount) * 100}%` }}
              />

            </div>
            <div className="text-xs text-orange-600 font-medium whitespace-nowrap">
              {triedRecipes.filter(t => actualRecipes.some(r => r.id === t.recipe_id)).length}/{actualRecipesCount} cooked
            </div>
          </div>
          <div className="ml-auto w-full max-w-md relative hidden md:block">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes, commands, or code" className="pl-8 text-orange-600" />
            <Search className="absolute left-3 top-3 size-4 text-orange-600" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto h-[calc(100vh-60px)] md:h-[calc(100vh-130px)] flex relative">
        <div className="hidden md:block">
          <Sidebar
            items={filtered}
            currentId={currentId}
            onSelect={setCurrentId}
            open={true}
            bookmarkedIds={bookmarkedIds}
            triedIds={triedIds}
          />
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.18 }}
              className="fixed z-40 top-[61px] md:top-[89px] bottom-0 left-0 w-72 bg-white border-r border-orange-200 md:hidden overflow-auto shadow-lg"
            >
              <div className="h-full w-full p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1 py-1">
                  <BookOpen className="size-5" />
                  <div className="font-semibold tracking-tight">Pubky SDK Cookbook</div>
                </div>

                <nav className="flex-1 overflow-auto pr-1">
                  {KINDS.map((k) => (
                    <div key={k.id} className="mb-2">
                      <div className="px-1 pb-1 text-xs uppercase tracking-wide text-orange-600 font-semibold">{k.label}</div>
                      <ul className="space-y-1">
                        {filtered
                          .filter((it) => it.kind === k.id)
                          .map((it) => (
                            <li key={it.id}>
                              <button
                                onClick={() => { setCurrentId(it.id); setOpen(false); }}
                                className={`text-left w-full rounded-xl px-3 py-1 hover:bg-orange-50 transition-colors flex items-center justify-between gap-2 ${
                                  currentId === it.id ? "bg-orange-100 text-orange-600" : "text-zinc-700"
                                }`}
                              >
                                <div className="text-xs font-medium leading-snug flex-1">
                                  {it.title}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {triedIds.has(it.id) && (
                                    <Check className="size-3.5 text-orange-600" />
                                  )}
                                  {bookmarkedIds.has(it.id) && (
                                    <BookmarkCheck className="size-3.5 fill-orange-600 text-orange-600" />
                                  )}
                                </div>
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="flex-1 h-full relative">
          {reducedMotion ? (
            <ScrollView recipes={filtered} currentId={currentId} copyFeedback={copyFeedback} setCopyFeedback={setCopyFeedback} bookmarkFeedback={bookmarkFeedback} triedFeedback={triedFeedback} bookmarkedIds={bookmarkedIds} onToggleBookmark={handleToggleBookmark} triedIds={triedIds} onToggleTried={handleToggleTried} onEnlargeCode={setEnlargedCode} />
          ) : (
            <FlipBookView recipes={filtered} currentId={currentId} onFlip={setCurrentId} copyFeedback={copyFeedback} setCopyFeedback={setCopyFeedback} bookmarkFeedback={bookmarkFeedback} triedFeedback={triedFeedback} bookmarkedIds={bookmarkedIds} onToggleBookmark={handleToggleBookmark} triedIds={triedIds} onToggleTried={handleToggleTried} onEnlargeCode={setEnlargedCode} />
          )}
        </section>
      </main>

      <footer className="border-t border-orange-200 text-xs text-orange-600 py-3 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div>Cooky v.0.7 © {new Date().getFullYear()} • Built for Pubky SDK v0.6 • <a className="hover:underline" href="https://docs.rs/pubky/0.6.0-rc.6/pubky/index.html" target="_blank" rel="noreferrer">Docs •</a> <a className="hover:underline" href="https://crates.io/crates/pubky/0.6.0-rc.6" target="_blank" rel="noreferrer">Crates</a></div>
          <div className="flex items-center gap-3">
            <a className="hover:underline" href="https://pubky.org" target="_blank" rel="noreferrer">pubky.org</a>
            <a className="hover:underline" href="https://pubky.app" target="_blank" rel="noreferrer">pubky.app</a>
            <a className="hover:underline" href="https://pubkyring.app" target="_blank" rel="noreferrer">pubkyring.app</a>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-sm z-50"
          >
            Code copied! Let's cook! 👨‍🍳
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {triedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-sm z-50 flex items-center gap-2"
          >
            <CheckCircle className="size-5" />
            Cooked Recipe! 👨‍🍳 🍔
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookmarkFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-sm z-50 flex items-center gap-2"
          >
            <Bookmark className="size-5" />
            Bookmarked! 📖
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {enlargedCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEnlargedCode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-orange-200 bg-orange-50">
                <h3 className="text-lg font-semibold text-orange-600">Code View</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(enlargedCode);
                      setCopyFeedback(true);
                      setTimeout(() => setCopyFeedback(false), 2000);
                    }}
                    title="Copy to clipboard"
                  >
                    <Copy className="size-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEnlargedCode(null)}
                    title="Close"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </div>
              <div className="overflow-auto max-h-[calc(90vh-80px)] p-6">
                <CodeHighlight code={enlargedCode} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChefCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-orange-600 text-white px-12 py-8 rounded-3xl shadow-2xl text-center">
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: 10 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.5 }}
                className="text-7xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-4xl font-bold mb-2">Congratulations!</h2>
              <p className="text-2xl">You're a Pubky Chef now!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
