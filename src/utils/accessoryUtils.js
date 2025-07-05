// Utility function to get emoji for accessory type
export const getAccessoryEmoji = (type) => {
  if (!type) return '📱'; // Default emoji
  
  const typeStr = type.toLowerCase();
  
  if (typeStr.includes('headphone') || typeStr.includes('earphone') || typeStr.includes('earbud')) {
    return '🎧';
  }
  if (typeStr.includes('case') || typeStr.includes('cover') || typeStr.includes('protector')) {
    return '📱';
  }
  if (typeStr.includes('charger') || typeStr.includes('cable') || typeStr.includes('adapter')) {
    return '🔌';
  }
  if (typeStr.includes('battery') || typeStr.includes('power bank') || typeStr.includes('powerbank')) {
    return '🔋';
  }
  if (typeStr.includes('speaker')) {
    return '🔊';
  }
  if (typeStr.includes('holder') || typeStr.includes('stand') || typeStr.includes('mount')) {
    return '📐';
  }
  if (typeStr.includes('memory') || typeStr.includes('card') || typeStr.includes('storage')) {
    return '💾';
  }
  if (typeStr.includes('screen') || typeStr.includes('protector') || typeStr.includes('glass')) {
    return '🛡️';
  }
  if (typeStr.includes('light') || typeStr.includes('lamp') || typeStr.includes('flashlight')) {
    return '💡';
  }
  if (typeStr.includes('watch') || typeStr.includes('smartwatch')) {
    return '⌚';
  }
  if (typeStr.includes('mic') || typeStr.includes('microphone')) {
    return '🎤';
  }
  if (typeStr.includes('camera') || typeStr.includes('lens')) {
    return '📷';
  }
  if (typeStr.includes('keyboard')) {
    return '⌨️';
  }
  if (typeStr.includes('mouse')) {
    return '🖱️';
  }
  if (typeStr.includes('stylus') || typeStr.includes('pen')) {
    return '✏️';
  }
  
  // Default fallback
  return '📱';
};
