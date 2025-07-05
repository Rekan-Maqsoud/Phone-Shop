// Professional Sound Effects System for Phone Shop App

// Sound settings management
const SOUND_SETTINGS_KEY = 'phoneShopSoundSettings';

const getDefaultSoundSettings = () => ({
  enabled: true,
  volume: 0.7,
  enabledTypes: {
    success: true,
    warning: true,
    error: true,
    action: true,
    notification: true,
    system: true
  }
});

export const getSoundSettings = () => {
  try {
    const saved = localStorage.getItem(SOUND_SETTINGS_KEY);
    return saved ? { ...getDefaultSoundSettings(), ...JSON.parse(saved) } : getDefaultSoundSettings();
  } catch {
    return getDefaultSoundSettings();
  }
};

export const setSoundSettings = (settings) => {
  try {
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save sound settings:', error);
  }
};

// Professional sound generation using Web Audio API
class SoundEffectGenerator {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
  }

  async initializeAudio() {
    if (this.initialized) return true;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Handle audio context suspension (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
      return false;
    }
  }

  createTone(frequency, duration, waveType = 'sine', volume = 0.3) {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = waveType;
    
    // Apply volume with smooth fade out
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode };
  }

  async playTone(frequency, duration, waveType = 'sine', volume = 0.3) {
    await this.initializeAudio();
    if (!this.audioContext) return;

    const { oscillator } = this.createTone(frequency, duration, waveType, volume);
    if (!oscillator) return;

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  async playSequence(notes, baseVolume = 0.3) {
    await this.initializeAudio();
    if (!this.audioContext) return;

    notes.forEach(({ frequency, duration, waveType = 'sine', delay = 0 }) => {
      setTimeout(() => {
        this.playTone(frequency, duration, waveType, baseVolume);
      }, delay);
    });
  }
}

const soundGenerator = new SoundEffectGenerator();

// High-level sound functions with settings integration
const playSoundEffect = async (soundType, soundFunction) => {
  const settings = getSoundSettings();
  
  if (!settings.enabled || !settings.enabledTypes[soundType]) {
    return;
  }
  
  try {
    await soundFunction(settings.volume);
  } catch (error) {
    console.warn(`Sound effect failed for ${soundType}:`, error);
  }
};

// Professional sound effects for different actions
export const playSuccessSound = () => playSoundEffect('success', async (volume) => {
  // Pleasant ascending chord progression
  await soundGenerator.playSequence([
    { frequency: 523.25, duration: 0.15, waveType: 'sine' }, // C5
    { frequency: 659.25, duration: 0.15, waveType: 'sine', delay: 100 }, // E5
    { frequency: 783.99, duration: 0.25, waveType: 'sine', delay: 200 }, // G5
  ], volume * 0.6);
});

export const playWarningSound = () => playSoundEffect('warning', async (volume) => {
  // Attention-grabbing triple beep
  await soundGenerator.playSequence([
    { frequency: 800, duration: 0.1, waveType: 'square' },
    { frequency: 800, duration: 0.1, waveType: 'square', delay: 150 },
    { frequency: 800, duration: 0.1, waveType: 'square', delay: 300 },
  ], volume * 0.8);
});

export const playErrorSound = () => playSoundEffect('error', async (volume) => {
  // Descending error tone
  await soundGenerator.playSequence([
    { frequency: 440, duration: 0.2, waveType: 'square' },
    { frequency: 330, duration: 0.2, waveType: 'square', delay: 200 },
    { frequency: 220, duration: 0.3, waveType: 'square', delay: 400 },
  ], volume * 0.7);
});

export const playActionSound = () => playSoundEffect('action', async (volume) => {
  // Subtle click sound for button presses
  await soundGenerator.playTone(1000, 0.05, 'sine', volume * 0.4);
});

export const playNotificationSound = () => playSoundEffect('notification', async (volume) => {
  // Gentle notification chime
  await soundGenerator.playSequence([
    { frequency: 659.25, duration: 0.2, waveType: 'sine' }, // E5
    { frequency: 523.25, duration: 0.3, waveType: 'sine', delay: 100 }, // C5
  ], volume * 0.5);
});

export const playSystemSound = () => playSoundEffect('system', async (volume) => {
  // System startup/ready sound
  await soundGenerator.playSequence([
    { frequency: 440, duration: 0.1, waveType: 'sine' },
    { frequency: 554.37, duration: 0.1, waveType: 'sine', delay: 100 },
    { frequency: 659.25, duration: 0.2, waveType: 'sine', delay: 200 },
  ], volume * 0.6);
});

export const playSaleCompleteSound = () => playSoundEffect('success', async (volume) => {
  // Cash register-like completion sound
  await soundGenerator.playSequence([
    { frequency: 523.25, duration: 0.1, waveType: 'sine' }, // C5
    { frequency: 659.25, duration: 0.1, waveType: 'sine', delay: 50 }, // E5
    { frequency: 783.99, duration: 0.1, waveType: 'sine', delay: 100 }, // G5
    { frequency: 1046.50, duration: 0.3, waveType: 'sine', delay: 150 }, // C6
  ], volume * 0.7);
});

export const playDeleteSound = () => playSoundEffect('warning', async (volume) => {
  // Soft delete confirmation
  await soundGenerator.playTone(440, 0.15, 'sine', volume * 0.5);
});

export const playNavigationSound = () => playSoundEffect('action', async (volume) => {
  // Subtle navigation sound
  await soundGenerator.playTone(880, 0.03, 'sine', volume * 0.3);
});

export const playFormSubmitSound = () => playSoundEffect('action', async (volume) => {
  // Form submission confirmation
  await soundGenerator.playSequence([
    { frequency: 659.25, duration: 0.08, waveType: 'sine' },
    { frequency: 783.99, duration: 0.12, waveType: 'sine', delay: 80 },
  ], volume * 0.5);
});

export const playModalOpenSound = () => playSoundEffect('system', async (volume) => {
  // Modal opening sound
  await soundGenerator.playTone(698.46, 0.06, 'sine', volume * 0.3);
});

export const playModalCloseSound = () => playSoundEffect('system', async (volume) => {
  // Modal closing sound
  await soundGenerator.playTone(523.25, 0.06, 'sine', volume * 0.3);
});
