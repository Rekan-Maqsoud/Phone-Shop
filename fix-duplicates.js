const fs = require('fs');
const path = require('path');

// Read the LocaleContext.jsx file
const localeFile = path.join(__dirname, 'src', 'contexts', 'LocaleContext.jsx');
let content = fs.readFileSync(localeFile, 'utf8');

// Function to remove duplicate keys from an object literal in the content
function removeDuplicateKeys(content) {
  // Find all object literal sections
  const lines = content.split('\n');
  let inObject = false;
  let objectStart = -1;
  let braceCount = 0;
  let seenKeys = new Set();
  let linesToRemove = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're entering an object (en: {, ku: {, ar: {)
    if (line.match(/^\s*(en|ku|ar):\s*\{/)) {
      inObject = true;
      objectStart = i;
      braceCount = 1;
      seenKeys.clear();
      continue;
    }
    
    if (inObject) {
      // Count braces to know when object ends
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      // If we're back to 0 braces, object is closed
      if (braceCount <= 0) {
        inObject = false;
        seenKeys.clear();
        continue;
      }
      
      // Extract key from line (key: 'value',)
      const keyMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
      if (keyMatch) {
        const key = keyMatch[1];
        if (seenKeys.has(key)) {
          // Mark this line for removal
          linesToRemove.push(i);
          console.log(`Removing duplicate key "${key}" at line ${i + 1}`);
        } else {
          seenKeys.add(key);
        }
      }
    }
  }
  
  // Remove lines in reverse order to maintain indices
  linesToRemove.reverse().forEach(lineIndex => {
    lines.splice(lineIndex, 1);
  });
  
  return lines.join('\n');
}

console.log('Fixing duplicate keys in LocaleContext.jsx...');
const fixedContent = removeDuplicateKeys(content);

// Write the fixed content back to file
fs.writeFileSync(localeFile, fixedContent, 'utf8');
console.log('Fixed duplicate keys in LocaleContext.jsx');
