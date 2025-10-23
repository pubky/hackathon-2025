import { Shield, Clock, Lock, CheckCircle, ArrowRight, Key, Users, Timer } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen overflow-y-auto bg-[#1a0b2e]">
      <nav className="border-b border-purple-900/30 bg-[#1a0b2e] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-white tracking-tight">
              CONSENTKY
            </div>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 bg-transparent hover:bg-white/10 text-white rounded-lg font-medium transition-all border border-white/20 text-sm flex items-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 leading-tight tracking-tight">
            Consent Made
            <br />
            <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 bg-clip-text text-transparent">
              Verifiable & Secure
            </span>
          </h1>

          <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Create time-bound consent agreements with cryptographic signatures.
            <br />
            Privacy-preserving, tamper-proof, and decentralized.
          </p>

          <button
            onClick={onGetStarted}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold text-base transition-all shadow-lg shadow-purple-500/30"
          >
            <span>Start Creating Sessions</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-20">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <Key className="w-6 h-6 text-fuchsia-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Signed</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Cryptographic signatures that cannot be forged
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <Timer className="w-6 h-6 text-fuchsia-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Time-bound</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Sessions expire when the window closes
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-fuchsia-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Private</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Only public keys and timestamps stored
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-fuchsia-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Mutual</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Both parties must sign to activate
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 text-center tracking-tight">
          How it Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-8 backdrop-blur-sm">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6">
              1
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Create a Session</h3>
            <p className="text-gray-400 leading-relaxed mb-6">
              Choose time window and share via QR code
            </p>
            <div className="bg-purple-900/50 border border-purple-700/30 rounded-lg p-4">
              <div className="bg-purple-950/50 rounded-lg p-3 mb-3">
                <p className="text-xs text-purple-300 mb-2 font-semibold">What is Pubky Ring?</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your personal key manager for signing consent agreements with cryptographic proof.
                </p>
              </div>
              <div className="bg-purple-950/50 rounded-lg p-4 flex items-center justify-center mb-3">
                <div className="bg-white p-3 rounded-lg">
                  <div className="w-24 h-24 bg-purple-100 rounded"></div>
                </div>
              </div>
              <p className="text-xs text-center text-purple-300 mb-3">Scan with Pubky Ring</p>
              <div className="bg-purple-800/30 rounded-lg p-2">
                <p className="text-xs text-purple-300 text-center">⏳ Waiting for authentication...</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-8 backdrop-blur-sm">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6">
              2
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Review & Sign</h3>
            <p className="text-gray-400 leading-relaxed mb-6">
              Both review and sign with cryptographic keys
            </p>
            <div className="bg-purple-950/70 border border-purple-700/30 rounded-2xl p-6 shadow-xl">
              <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full"></div>
                </div>
                <p className="text-white text-sm font-semibold text-center mb-1">Satoshi Nakamoto</p>
                <p className="text-purple-300 text-xs text-center font-mono break-all">
                  ssngafm9...qnsm7jc
                </p>
              </div>
              <button className="w-full py-3 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2">
                <Key className="w-4 h-4" />
                <span>Authorize</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-8 backdrop-blur-sm">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6">
              3
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Active Consent</h3>
            <p className="text-gray-400 leading-relaxed mb-6">
              Session is active until timer expires
            </p>
            <div className="bg-gradient-to-br from-pink-600/20 to-fuchsia-600/20 border border-pink-500/30 rounded-2xl p-6">
              <div className="space-y-4">
                <div className="bg-purple-950/50 rounded-lg p-3 border border-purple-700/30">
                  <p className="text-xs text-purple-300 font-semibold mb-1">DURATION</p>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-white" />
                    <p className="text-white font-semibold">120 minutes</p>
                  </div>
                </div>
                <div className="bg-purple-950/50 rounded-lg p-3 border border-purple-700/30">
                  <p className="text-xs text-purple-300 font-semibold mb-1">STARTS AT</p>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-white" />
                    <p className="text-white font-semibold">04:57 PM</p>
                  </div>
                </div>
                <div className="bg-purple-950/50 rounded-lg p-3 border border-purple-700/30">
                  <p className="text-xs text-purple-300 font-semibold mb-1">YOUR KEY</p>
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-white" />
                    <p className="text-white font-mono text-xs">ssngafm9...qnsm7jc</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-purple-700/30">
                <p className="text-emerald-400 font-semibold text-center flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Jeff Approved</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-transparent hover:bg-white/10 text-white rounded-xl font-semibold text-base transition-all border border-white/20"
          >
            <span>Start a Session</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-fuchsia-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Tamper-Proof</h3>
            <p className="text-gray-400 leading-relaxed">
              Cannot be altered
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Timer className="w-8 h-8 text-fuchsia-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Decentralized</h3>
            <p className="text-gray-400 leading-relaxed">
              Built on Pubky
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-fuchsia-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Private</h3>
            <p className="text-gray-400 leading-relaxed">
              No personal data
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-purple-900/30 bg-[#1a0b2e] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center space-x-2 text-gray-400">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">ConsentKy</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <a
                href="https://pubky.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fuchsia-400 transition-colors"
              >
                Powered by Pubky
              </a>
              <span>•</span>
              <span>Privacy-Preserving</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
