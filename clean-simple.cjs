const fs = require('fs');

function removeObviousDuplicates() {
  const filePath = './src/contexts/LocaleContext.jsx';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find obvious duplicate patterns and remove them
  const duplicatePatterns = [
    /(\s+unknownError:\s*'[^']*',)\s*\n[\s\S]*?\n\s+unknownError:\s*'[^']*',/g,
    /(\s+totalCompanyDebtIQD:\s*'[^']*',)\s*\n[\s\S]*?\n\s+totalCompanyDebtIQD:\s*'[^']*',/g,
    /(\s+usd:\s*'[^']*',)\s*\n[\s\S]*?\n\s+usd:\s*'[^']*',/g,
    /(\s+iqd:\s*'[^']*',)\s*\n[\s\S]*?\n\s+iqd:\s*'[^']*',/g,
    /(\s+inventoryValue:\s*'[^']*',)\s*\n[\s\S]*?\n\s+inventoryValue:\s*'[^']*',/g,
    /(\s+archiveFailed:\s*'[^']*',)\s*\n[\s\S]*?\n\s+archiveFailed:\s*'[^']*',/g,
    /(\s+unarchiveFailed:\s*'[^']*',)\s*\n[\s\S]*?\n\s+unarchiveFailed:\s*'[^']*',/g,
  ];
  
  // Apply each pattern to remove duplicates
  for (const pattern of duplicatePatterns) {
    content = content.replace(pattern, '$1');
  }
  
  // Write back
  fs.writeFileSync(filePath, content);
  console.log('Removed some obvious duplicates from LocaleContext.jsx');
}

removeObviousDuplicates();
