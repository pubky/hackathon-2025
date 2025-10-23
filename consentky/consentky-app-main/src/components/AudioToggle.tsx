import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audioService } from '../utils/audioService';

export function AudioToggle() {
  const [preferences, setPreferences] = useState(audioService.getPreferences());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.audio-toggle-menu')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  const toggleSound = () => {
    const newValue = !preferences.soundEnabled;
    audioService.setSoundEnabled(newValue);
    setPreferences({ ...preferences, soundEnabled: newValue });
  };

  const toggleMusic = () => {
    const newValue = !preferences.musicEnabled;
    audioService.setMusicEnabled(newValue);
    setPreferences({ ...preferences, musicEnabled: newValue });
  };

  const isSoundDisabled = !preferences.soundEnabled && !preferences.musicEnabled;

  return (
    <div className="relative audio-toggle-menu">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
        title={isSoundDisabled ? 'Sound disabled' : 'Sound enabled'}
      >
        {isSoundDisabled ? (
          <VolumeX className="w-4 h-4 text-warm-600" />
        ) : (
          <Volume2 className="w-4 h-4 text-warm-600" />
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-soft-lg border border-warm-200 p-2 min-w-[180px] z-50">
          <p className="text-[10px] font-bold text-warm-900 mb-2 px-1">Audio Settings</p>

          <div className="space-y-1">
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-warm-50 transition-colors"
            >
              <span className="text-xs text-warm-800">Sound Effects</span>
              <div
                className={`w-8 h-4 rounded-full transition-colors ${
                  preferences.soundEnabled ? 'bg-emerald-500' : 'bg-warm-300'
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full transform transition-transform mt-0.5 ${
                    preferences.soundEnabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>

            <button
              onClick={toggleMusic}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-warm-50 transition-colors"
            >
              <span className="text-xs text-warm-800">Waiting Music</span>
              <div
                className={`w-8 h-4 rounded-full transition-colors ${
                  preferences.musicEnabled ? 'bg-emerald-500' : 'bg-warm-300'
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full transform transition-transform mt-0.5 ${
                    preferences.musicEnabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-warm-200 px-1">
            <p className="text-[9px] text-warm-600 leading-snug">
              Control audio feedback for session creation, signatures, and waiting periods.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
