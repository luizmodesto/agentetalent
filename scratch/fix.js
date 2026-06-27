const fs = require('fs');
let c = fs.readFileSync('f:/desklip/Talent/src/app/page.tsx', 'utf8');
c = c.replace('"use client";\n\nimport React, { useState, useEffect } from "react";\n"use client";\n\nimport React, { useState, useEffect } from "react";\n', '"use client";\n\nimport React, { useState, useEffect } from "react";\n');
fs.writeFileSync('f:/desklip/Talent/src/app/page.tsx', c);
console.log("Done.");
