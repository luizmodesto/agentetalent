const fs = require('fs');
const path = require('path');

const pagePath = path.join('f:', 'desklip', 'Talent', 'src', 'app', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Remove ManageEventModule (lines 979 to 1518 roughly)
// It's safer to use regex to find the function ManageEventModule and remove it.
const manageEventRegex = /\/\/ --- MODULE: MANAGE EVENT \(LIVE CONTROLLER 4 COLUMNS\) ---[\s\S]*?function ManageEventModule\([\s\S]*?\n\}\n\n/g;
// Actually I'll find the index of "// --- MODULE: MANAGE EVENT" and "// --- MODULE: EVENTS ---"
const startStr = "// --- MODULE: MANAGE EVENT (LIVE CONTROLLER 4 COLUMNS) ---";
const endStr = "// --- MODULE: EVENTS ---";
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
}

// 2. Add imports at the top
const importsToAdd = `
import { ManageEventModule } from "@/components/admin/ManageEventModule";
import { ReportsModule } from "@/components/admin/ReportsModule";
import { PieChart } from "lucide-react";
`;

content = content.replace('import Link from "next/link";', 'import Link from "next/link";' + importsToAdd);

// 3. Update DashboardView State and Sidebar
content = content.replace(
  'const [activeModule, setActiveModule] = useState<"events" | "control" | "qa" | "settings" | "manage_event" | "voice_settings" | "portals" | "register_speaker" | "register_participant" | "register_manager" | "manage_sponsors">("events");',
  'const [activeModule, setActiveModule] = useState<"events" | "control" | "qa" | "settings" | "manage_event" | "voice_settings" | "portals" | "register_speaker" | "register_participant" | "register_manager" | "manage_sponsors" | "reports">("events");'
);

const reportSidebarItem = `
          <SidebarItem 
            icon={<PieChart />} 
            label="Relatórios" 
            active={activeModule === "reports"} 
            onClick={() => setActiveModule("reports")} 
          />`;

content = content.replace(
  /<SidebarItem \s*icon=\{<MessageSquare \/>\} \s*label="Gestão de Q&A" \s*active=\{activeModule === "qa"\} \s*onClick=\{\(\) => setActiveModule\("qa"\)\} \s*\/>/,
  `$&` + reportSidebarItem
);

content = content.replace(
  /\{activeModule === "events" && "Gestão Global de Eventos"\}/,
  `{activeModule === "reports" && "Relatórios e Analytics"}\n            $&`
);

content = content.replace(
  /\{activeModule === "events" && <EventsModule supabase=\{supabase\} onManageEvent=\{\(id\) => \{ setActiveEventId\(id\); setActiveModule\("manage_event"\); \}\} \/>\}/,
  `{activeModule === "reports" && <ReportsModule eventId={activeEventId} supabase={supabase} />}\n            $&`
);

// 4. Update Colors for ERP Style
// bg-[#0a0a0a] -> bg-[#1E222B]
content = content.replace(/bg-\[#0a0a0a\]/g, 'bg-[#1E222B]');
// bg-[#111] -> bg-slate-300/10 backdrop-blur-md
content = content.replace(/bg-\[#111\]/g, 'bg-slate-300/10 backdrop-blur-md');
// border-neutral-800 -> border-slate-700/50
content = content.replace(/border-neutral-800/g, 'border-slate-700/50');
// text-neutral-400 -> text-slate-400
content = content.replace(/text-neutral-400/g, 'text-slate-400');
// text-neutral-500 -> text-slate-500
content = content.replace(/text-neutral-500/g, 'text-slate-500');
// bg-neutral-800 -> bg-slate-700/50
content = content.replace(/bg-neutral-800/g, 'bg-slate-700/50');
// bg-[#1a1a1a] -> bg-slate-900/50
content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-slate-900/50');
// bg-[#1C202E] -> bg-slate-300/10
content = content.replace(/bg-\[#1C202E\]/g, 'bg-slate-300/10');
// bg-[#131620] -> bg-slate-900/50
content = content.replace(/bg-\[#131620\]/g, 'bg-slate-900/50');

// Fix SidebarItem hover:bg-[#1a1a1a] -> hover:bg-slate-700/50
content = content.replace(/hover:bg-\[#1a1a1a\]/g, 'hover:bg-slate-700/50');

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Refactored page.tsx successfully!');
