// Utility function to get icon class for accessory type
export const getAccessoryIcon = (type) => {
  if (!type) return 'phone'; // Default icon
  
  const typeStr = type.toLowerCase();
  
  if (typeStr.includes('headphone') || typeStr.includes('earphone') || typeStr.includes('earbud')) {
    return 'headphones';
  }
  if (typeStr.includes('case') || typeStr.includes('cover') || typeStr.includes('protector')) {
    return 'phone';
  }
  if (typeStr.includes('charger') || typeStr.includes('cable') || typeStr.includes('adapter')) {
    return 'cable';
  }
  if (typeStr.includes('battery') || typeStr.includes('power bank') || typeStr.includes('powerbank')) {
    return 'battery';
  }
  if (typeStr.includes('speaker')) {
    return 'speaker';
  }
  if (typeStr.includes('holder') || typeStr.includes('stand') || typeStr.includes('mount')) {
    return 'stand';
  }
  if (typeStr.includes('memory') || typeStr.includes('card') || typeStr.includes('storage')) {
    return 'storage';
  }
  if (typeStr.includes('screen') || typeStr.includes('protector') || typeStr.includes('glass')) {
    return 'shield';
  }
  if (typeStr.includes('light') || typeStr.includes('lamp') || typeStr.includes('flashlight')) {
    return 'light';
  }
  if (typeStr.includes('watch') || typeStr.includes('smartwatch')) {
    return 'watch';
  }
  if (typeStr.includes('mic') || typeStr.includes('microphone')) {
    return 'microphone';
  }
  if (typeStr.includes('camera') || typeStr.includes('lens')) {
    return 'camera';
  }
  if (typeStr.includes('keyboard')) {
    return 'keyboard';
  }
  if (typeStr.includes('mouse')) {
    return 'mouse';
  }
  if (typeStr.includes('stylus') || typeStr.includes('pen')) {
    return 'pen';
  }
  
  // Default fallback
  return 'phone';
};
