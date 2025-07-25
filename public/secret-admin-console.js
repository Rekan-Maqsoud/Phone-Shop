// Secret Admin Console Commands - DISABLED
// These commands have been disabled in favor of UI-based balance management
// Balance setting is now available through Settings > Balance Management

// Prevent multiple loading
if (!window.__secretAdminLoaded) {
  window.__secretAdminLoaded = true;

  // Display a message when this file loads
  console.log('🔒 Secret admin commands have been disabled. Please use the Settings panel for balance management.');
  
  // Inform users about the new UI-based approach
  console.log('💡 To set balances, go to Admin Panel > Settings > Balance Management');

} // End of __secretAdminLoaded check
