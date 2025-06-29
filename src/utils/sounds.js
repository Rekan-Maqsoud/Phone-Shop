// Sound utility for the app
export const playWarningSound = () => {
  try {
    // Create a more noticeable warning sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set frequency and type for warning sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High pitch
    oscillator.type = 'square'; // Sharp sound
    
    // Set volume
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    // Play 3 quick beeps
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
    
    // Second beep
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(800, audioContext.currentTime);
      osc2.type = 'square';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.1);
    }, 150);
    
    // Third beep
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.setValueAtTime(800, audioContext.currentTime);
      osc3.type = 'square';
      gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
      osc3.start(audioContext.currentTime);
      osc3.stop(audioContext.currentTime + 0.1);
    }, 300);
    
  } catch (error) {
    // Fallback to system beep if Web Audio API fails
    console.warn('Warning sound failed:', error);
    // Create a simple beep using data URL
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgiBhSBzvTBaCYJLYHM8d2NOwgYYK3u6qJUEAhOqOPwtWMcBjiS2vLNeSsFJH/K8dmJOAgZYLLr6axXFAhOp+PoumMcBzuV2vHKeisGI3/L8d6NOwgZYrnp55tOEAhOp+Hju2EeBTmS2PDAaSMGLYHO8diKNwcbZK7s6KdXFAlBn9vou2MdBDqU2vHOeysGJXzJ8NqMOAcZYrPk66JUFB');
      audio.play().catch(() => {}); // Ignore if fails
    } catch (e) {
      console.warn('Fallback audio also failed');
    }
  }
};

export const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant success sound
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
  } catch (error) {
    console.warn('Success sound failed:', error);
  }
};
