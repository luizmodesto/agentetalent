const fs = require('fs');
let c = fs.readFileSync('f:/desklip/Talent/src/app/page.tsx', 'utf8');

const target = `"use client";\n\nimport React, { useState, useEffect } from "react";\n"use client";\n\nimport React, { useState, useEffect } from "react";`;
const replacement = `"use client";\n\nimport React, { useState, useEffect } from "react";`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync('f:/desklip/Talent/src/app/page.tsx', c);
  console.log("Fixed duplicate use client");
} else {
  // Try another approach if the exact string doesn't match
  const lines = c.split('\n');
  if (lines[0].includes('use client') && lines[3] && lines[3].includes('use client')) {
    lines.splice(0, 3);
    fs.writeFileSync('f:/desklip/Talent/src/app/page.tsx', lines.join('\n'));
    console.log("Fixed duplicate use client via lines splice");
  } else {
    console.log("No duplicate found");
  }
}
