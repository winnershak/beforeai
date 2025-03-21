const fs = require('fs');
const path = require('path');

// Path to the YGNode.cpp file
const ygNodePath = path.join(
  __dirname,
  'node_modules',
  'react-native',
  'ReactCommon',
  'yoga',
  'yoga',
  'YGNode.cpp'
);

console.log('Checking if YGNode.cpp exists at:', ygNodePath);

// Check if the file exists
if (fs.existsSync(ygNodePath)) {
  console.log('YGNode.cpp found, adding algorithm header...');
  
  // Read the file content
  let content = fs.readFileSync(ygNodePath, 'utf8');
  
  // Check if the algorithm header is already included
  if (!content.includes('#include <algorithm>')) {
    // Add the algorithm header at the beginning of the file
    content = '#include <algorithm>\n' + content;
    
    // Write the modified content back to the file
    fs.writeFileSync(ygNodePath, content);
    console.log('Successfully added algorithm header to YGNode.cpp');
  } else {
    console.log('algorithm header already exists in YGNode.cpp');
  }
} else {
  console.error('YGNode.cpp not found at the expected path');
  // This will not fail the build, just log an error
}

console.log('Yoga fix script completed'); 