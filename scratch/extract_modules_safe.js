const fs = require('fs');
const path = require('path');

const pagePath = 'f:/desklip/Talent/src/app/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');
let lines = content.split('\n');

const standardImports = `"use client";\n
import React, { useState, useEffect } from "react";
import { 
  Lock, User, LogIn, LayoutDashboard, Settings, 
  MessageSquare, Radio, Check, X, Edit, Trash2, 
  PlayCircle, Mic, TerminalSquare, AlertCircle, PlusCircle,
  Monitor, MonitorPlay, Smartphone, ExternalLink, CalendarDays,
  ArrowLeft, Plus, BriefcaseBusiness, Bot, Link as LinkIcon, RotateCcw,
  Activity, Zap, MicOff, UserCheck, Play, Pause, FastForward, StopCircle
} from "lucide-react";
import QRCode from "react-qr-code";
import Link from "next/link";\n\n`;

const componentsDir = 'f:/desklip/Talent/src/components/admin';
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

const funcs = [];
lines.forEach((l, i) => {
  if (l.startsWith('function ')) {
    funcs.push({ name: l.split('(')[0].replace('function ', '').trim(), line: i });
  }
});

const modulesToExtract = funcs.filter(f => f.name.endsWith('Module') && f.name !== 'ManageEventModule');
const extractedNames = ["ManageEventModule"]; // already extracted

let newLines = [...lines];

// Go backwards to not mess up line numbers when deleting
for (let i = modulesToExtract.length - 1; i >= 0; i--) {
  const currentFunc = modulesToExtract[i];
  const nextFuncIdx = funcs.findIndex(f => f.name === currentFunc.name) + 1;
  const nextFunc = funcs[nextFuncIdx];
  
  const endLine = nextFunc ? nextFunc.line - 1 : lines.length - 1;
  
  // Extract block
  const blockLines = lines.slice(currentFunc.line, endLine + 1);
  blockLines[0] = blockLines[0].replace(`function ${currentFunc.name}(`, `export function ${currentFunc.name}(`);
  
  const fileContent = standardImports + blockLines.join('\n');
  fs.writeFileSync(path.join(componentsDir, `${currentFunc.name}.tsx`), fileContent, 'utf8');
  console.log(`Extracted ${currentFunc.name} to ${currentFunc.name}.tsx`);
  
  extractedNames.push(currentFunc.name);
  
  // Remove from newLines
  newLines.splice(currentFunc.line, endLine - currentFunc.line + 1);
}

// Now remove ManageEventModule from page.tsx too
const manageIdx = funcs.findIndex(f => f.name === 'ManageEventModule');
if (manageIdx !== -1) {
  const currentFunc = funcs[manageIdx];
  const nextFunc = funcs[manageIdx + 1];
  const endLine = nextFunc ? nextFunc.line - 1 : lines.length - 1;
  
  // Need to find the mapped line in newLines. Since we deleted stuff after ManageEventModule, 
  // its start line in newLines might have shifted if there were modules before it. 
  // Wait, let's just find "function ManageEventModule" in newLines
  const newStartLine = newLines.findIndex(l => l.startsWith('function ManageEventModule'));
  if (newStartLine !== -1) {
     const newEndLine = newLines.findIndex((l, i) => i > newStartLine && l.startsWith('function '));
     const finalEndLine = newEndLine !== -1 ? newEndLine - 1 : newLines.length - 1;
     newLines.splice(newStartLine, finalEndLine - newStartLine + 1);
  }
}

// Add Imports
const imports = extractedNames.map(n => `import { ${n} } from "@/components/admin/${n}";`).join('\n');
const pieIndex = newLines.findIndex(l => l.includes('import { PieChart }'));
if (pieIndex !== -1) {
  newLines.splice(pieIndex + 1, 0, imports);
} else {
  newLines.splice(15, 0, imports); // roughly top
}

fs.writeFileSync(pagePath, newLines.join('\n'), 'utf8');
console.log('page.tsx updated.');
