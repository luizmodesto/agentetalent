const fs = require('fs');

const pagePath = 'f:/desklip/Talent/src/app/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Imports
if (!content.includes('PieChart')) {
  content = content.replace(
    'Activity, Zap, MicOff, UserCheck, Play, Pause, FastForward, StopCircle\n} from "lucide-react";',
    'Activity, Zap, MicOff, UserCheck, Play, Pause, FastForward, StopCircle, PieChart\n} from "lucide-react";'
  );
}

if (!content.includes('import { ReportsModule }')) {
  content = content.replace(
    'import { ManageEventModule } from "@/components/admin/ManageEventModule";',
    'import { ManageEventModule } from "@/components/admin/ManageEventModule";\nimport { ReportsModule } from "@/components/admin/ReportsModule";'
  );
}

// 2. ERP Styles
content = content.replace(
  '<aside className="w-64 bg-[#111] border-r border-neutral-800 flex flex-col hidden md:flex">',
  '<aside className="w-64 bg-slate-300/10 backdrop-blur-md border-r border-slate-700/50 flex flex-col hidden md:flex">'
);
content = content.replace(
  '<div className="p-6 border-b border-neutral-800 flex items-center gap-3">',
  '<div className="p-6 border-b border-slate-700/50 flex items-center gap-3">'
);

content = content.replace(
  `        className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm
          \${active 
            ? "bg-indigo-500/10 text-indigo-400" 
            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }\`}`,
  `        className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border
          \${active 
            ? "bg-slate-100 text-slate-900 border-slate-200 shadow-sm" 
            : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white"
          }\`}`
);

content = content.replace(
  '<header className="h-16 border-b border-neutral-800 bg-[#111]/50 backdrop-blur-md flex items-center px-8 shrink-0">',
  '<header className="h-16 border-b border-slate-700/50 bg-slate-300/10 backdrop-blur-md flex items-center px-8 shrink-0">'
);

// 3. Reports Menu
if (!content.includes('activeModule === "reports"')) {
  content = content.replace(
    'const [activeModule, setActiveModule] = useState<"events" | "control" | "qa" | "settings" | "manage_event" | "voice_settings" | "portals" | "register_speaker" | "register_participant" | "register_manager" | "manage_sponsors">("events");',
    'const [activeModule, setActiveModule] = useState<"events" | "control" | "qa" | "settings" | "manage_event" | "voice_settings" | "portals" | "register_speaker" | "register_participant" | "register_manager" | "manage_sponsors" | "reports">("events");'
  );

  const reportMenu = `
          <SidebarItem 
            icon={<PieChart />} 
            label="Relatórios e Métricas" 
            active={activeModule === "reports"} 
            onClick={() => setActiveModule("reports")} 
          />
`;
  content = content.replace(
    '<div className="pt-4 mt-2 border-t border-neutral-800">',
    `${reportMenu}\n          <div className="pt-4 mt-2 border-t border-slate-700/50">`
  );

  content = content.replace(
    '{activeModule === "manage_sponsors" && <ManageSponsorsModule eventId={activeEventId} supabase={supabase} />}',
    `{activeModule === "manage_sponsors" && <ManageSponsorsModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "reports" && <ReportsModule eventId={activeEventId} supabase={supabase} />}`
  );
}

// 4. Layout Spacing Fix (Removing max-w-6xl mx-auto and heavy padding)
content = content.replace(
  '<div className="flex-1 overflow-y-auto p-8">\n          <div className="max-w-6xl mx-auto">',
  '<div className="flex-1 overflow-y-auto py-8 pl-4 pr-6">\n          <div className="w-full justify-start">'
);

fs.writeFileSync(pagePath, content, 'utf8');
console.log("page.tsx perfectly updated via node.");
