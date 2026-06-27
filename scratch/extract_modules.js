const fs = require('fs');
const path = require('path');

const pagePath = 'f:/desklip/Talent/src/app/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const modulesToExtract = [
  "RegisterSpeakerModule",
  "RegisterParticipantModule",
  "RegisterManagerModule",
  "ManageSponsorsModule",
  "EventsModule",
  "ControlRoomModule",
  "QAModule",
  "VoiceSettingsModule",
  "SettingsModule",
  "PortalsModule"
];

const componentsDir = 'f:/desklip/Talent/src/components/admin';
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

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

let newPageContent = content;
const extractedModules = [];

modulesToExtract.forEach(modName => {
  const funcStart = newPageContent.indexOf(`function ${modName}(`);
  if (funcStart === -1) {
    console.log(`Could not find ${modName}`);
    return;
  }
  
  // Find the first { after function declaration
  let i = funcStart;
  while (i < newPageContent.length && newPageContent[i] !== '{') {
    i++;
  }
  
  let braceCount = 1;
  let funcEnd = i + 1;
  
  while (braceCount > 0 && funcEnd < newPageContent.length) {
    if (newPageContent[funcEnd] === '{') braceCount++;
    if (newPageContent[funcEnd] === '}') braceCount--;
    funcEnd++;
  }
  
  const funcCode = newPageContent.substring(funcStart, funcEnd);
  
  // Convert function to export function
  let exportCode = funcCode.replace(`function ${modName}(`, `export function ${modName}(`);
  
  const fileContent = standardImports + exportCode + "\n";
  
  fs.writeFileSync(path.join(componentsDir, `${modName}.tsx`), fileContent, 'utf8');
  console.log(`Extracted ${modName} to ${modName}.tsx`);
  
  extractedModules.push(modName);
  
  // Remove from page.tsx
  newPageContent = newPageContent.substring(0, funcStart) + newPageContent.substring(funcEnd);
});

// Add imports to page.tsx
let importStatements = extractedModules.map(mod => `import { ${mod} } from "@/components/admin/${mod}";`).join('\n');
newPageContent = newPageContent.replace('import { PieChart } from "lucide-react";', `import { PieChart } from "lucide-react";\n${importStatements}`);

fs.writeFileSync(pagePath, newPageContent, 'utf8');
console.log('page.tsx updated.');
