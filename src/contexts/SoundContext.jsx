import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSoundSettings, setSoundSettings } from '../utils/sounds';

const SoundContext = createContext();

export function SoundProvider({ children }) {
  const [soundSettings, updateSoundSettings] = useState(getSoundSettings);

  const setSounds = (newSettings) => {
    const merged = { ...soundSettings, ...newSettings };
    updateSoundSettings(merged);
    setSoundSettings(merged);
  };

  const toggleSounds = () => {
    setSounds({ enabled: !soundSettings.enabled });
  };

  const setVolume = (volume) => {
    setSounds({ volume: Math.max(0, Math.min(1, volume)) });
  };

  const toggleSoundType = (soundType) => {
    setSounds({
      enabledTypes: {
        ...soundSettings.enabledTypes,
        [soundType]: !soundSettings.enabledTypes[soundType]
      }
    });
  };

  // Load settings on mount
  useEffect(() => {
    const settings = getSoundSettings();
    updateSoundSettings(settings);
  }, []);

  return (
    <SoundContext.Provider value={{
      soundSettings,
      setSounds,
      toggleSounds,
      setVolume,
      toggleSoundType
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
