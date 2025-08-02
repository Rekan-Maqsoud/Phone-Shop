const fs = require('fs');

function removeDuplicateKeys() {
  const filePath = './src/contexts/LocaleContext.jsx';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Split by English and Arabic sections
  const sections = content.split('ar: {');
  const englishSection = sections[0] + 'ar: {';
  const arabicSection = sections[1];
  
  // Function to clean object section
  function cleanObjectSection(section, isArabic = false) {
    const lines = section.split('\n');
    const cleanedLines = [];
    const seenKeys = new Set();
    let inObject = false;
    let braceCount = 0;
    
    for (const line of lines) {
      // Count braces to track if we're inside the object
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      if (braceCount > 0) inObject = true;
      if (braceCount === 0 && inObject) inObject = false;
      
      // If we're in the object and this line contains a key
      if (inObject && line.includes(':') && !line.trim().startsWith('//')) {
        const keyMatch = line.match(/^\s*([a-zA-Z_]\w*):/);
        if (keyMatch) {
          const key = keyMatch[1];
          if (seenKeys.has(key)) {
            console.log(`Removing duplicate key: ${key}`);
            continue; // Skip this line
          }
          seenKeys.add(key);
        }
      }
      
      cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n');
  }
  
  // Clean both sections
  const cleanedEnglish = cleanObjectSection(englishSection, false);
  const cleanedArabic = cleanObjectSection(arabicSection, true);
  
  // Combine back
  const cleanedContent = cleanedEnglish + cleanedArabic;
  
  // Write back
  fs.writeFileSync(filePath, cleanedContent);
  console.log('Cleaned LocaleContext.jsx');
}

removeDuplicateKeys();
