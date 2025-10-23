const AUDIO_PREFS_KEY = 'consentky_audio_preferences';

interface AudioPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private currentMusic: { source: AudioBufferSourceNode; gainNode: GainNode } | null = null;
  private preferences: AudioPreferences;
  private waitingMusicBuffer: AudioBuffer | null = null;
  private waitingMusicLoading: Promise<AudioBuffer> | null = null;

  constructor() {
    this.preferences = this.loadPreferences();
  }

  private loadPreferences(): AudioPreferences {
    try {
      const stored = localStorage.getItem(AUDIO_PREFS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[AudioService] Failed to load preferences:', error);
    }
    return {
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.3,
    };
  }

  savePreferences(prefs: Partial<AudioPreferences>) {
    this.preferences = { ...this.preferences, ...prefs };
    try {
      localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('[AudioService] Failed to save preferences:', error);
    }
  }

  getPreferences(): AudioPreferences {
    return { ...this.preferences };
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }


  playSessionCreated() {
    if (!this.preferences.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();

      const playTone = (freq: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(this.preferences.volume * 0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.15);
      playTone(659.25, now + 0.1, 0.15);
      playTone(783.99, now + 0.2, 0.25);

      console.log('[AudioService] Playing session created sound');
    } catch (error) {
      console.warn('[AudioService] Failed to play session created sound:', error);
    }
  }

  playSignatureComplete() {
    if (!this.preferences.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();

      const playTone = (freq: number, startTime: number, duration: number, vol: number = 0.3) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(this.preferences.volume * vol, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(880, now, 0.1, 0.2);
      playTone(1046.5, now + 0.1, 0.2, 0.25);

      console.log('[AudioService] Playing signature complete sound');
    } catch (error) {
      console.warn('[AudioService] Failed to play signature complete sound:', error);
    }
  }

  playAuthSuccess() {
    if (!this.preferences.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();

      const playTone = (freq: number, startTime: number, duration: number, vol: number = 0.3) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(this.preferences.volume * vol, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(659.25, now, 0.12, 0.25);
      playTone(830.61, now + 0.12, 0.18, 0.3);

      console.log('[AudioService] Playing auth success sound');
    } catch (error) {
      console.warn('[AudioService] Failed to play auth success sound:', error);
    }
  }

  playPartnerJoinSuccess() {
    if (!this.preferences.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();

      const playTone = (freq: number, startTime: number, duration: number, vol: number = 0.3) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(this.preferences.volume * vol, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.15, 0.25);
      playTone(659.25, now + 0.15, 0.15, 0.28);
      playTone(783.99, now + 0.3, 0.2, 0.32);

      console.log('[AudioService] Playing partner join success sound');
    } catch (error) {
      console.warn('[AudioService] Failed to play partner join success sound:', error);
    }
  }

  private async loadWaitingMusic(): Promise<AudioBuffer> {
    if (this.waitingMusicBuffer) {
      return this.waitingMusicBuffer;
    }

    if (this.waitingMusicLoading) {
      return this.waitingMusicLoading;
    }

    this.waitingMusicLoading = (async () => {
      try {
        const response = await fetch('/sounds/wait.mp3');
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const ctx = this.getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.waitingMusicBuffer = audioBuffer;
        console.log('[AudioService] Waiting music loaded successfully');
        return audioBuffer;
      } catch (error) {
        console.error('[AudioService] Failed to load waiting music:', error);
        throw error;
      } finally {
        this.waitingMusicLoading = null;
      }
    })();

    return this.waitingMusicLoading;
  }

  async startWaitingMusic() {
    if (!this.preferences.musicEnabled) return;

    try {
      this.stopWaitingMusic();

      const ctx = this.getAudioContext();
      const buffer = await this.loadWaitingMusic();

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.preferences.volume * 0.5, ctx.currentTime + 0.5);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(ctx.currentTime);

      this.currentMusic = { source, gainNode };

      console.log('[AudioService] Started waiting music from MP3');
    } catch (error) {
      console.warn('[AudioService] Failed to start waiting music:', error);
    }
  }

  stopWaitingMusic(fadeOut: boolean = true) {
    if (!this.currentMusic) return;

    try {
      const ctx = this.getAudioContext();

      if (fadeOut) {
        this.currentMusic.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(() => {
          if (this.currentMusic) {
            this.currentMusic.source.stop();
            this.currentMusic = null;
          }
        }, 600);
      } else {
        this.currentMusic.source.stop();
        this.currentMusic = null;
      }

      console.log('[AudioService] Stopped waiting music');
    } catch (error) {
      console.warn('[AudioService] Failed to stop waiting music:', error);
      this.currentMusic = null;
    }
  }

  isPlayingMusic(): boolean {
    return this.currentMusic !== null;
  }

  setSoundEnabled(enabled: boolean) {
    this.savePreferences({ soundEnabled: enabled });
  }

  setMusicEnabled(enabled: boolean) {
    this.savePreferences({ musicEnabled: enabled });
    if (!enabled && this.currentMusic) {
      this.stopWaitingMusic(true);
    }
  }

  setVolume(volume: number) {
    this.savePreferences({ volume: Math.max(0, Math.min(1, volume)) });
    if (this.currentMusic) {
      const ctx = this.getAudioContext();
      this.currentMusic.gainNode.gain.setValueAtTime(
        this.preferences.volume * 0.5,
        ctx.currentTime
      );
    }
  }
}

export const audioService = new AudioService();
