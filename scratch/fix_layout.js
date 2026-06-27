const fs = require('fs');

const pagePath = 'f:/desklip/Talent/src/app/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

// Fix Layout padding and margin
content = content.replace(
  '<div className="flex-1 overflow-y-auto p-8">\n          <div className="max-w-6xl mx-auto">',
  '<div className="flex-1 overflow-y-auto py-8 pl-4 pr-6">\n          <div className="w-full justify-start">'
);

fs.writeFileSync(pagePath, content, 'utf8');
console.log("Layout fixed.");
