const fs = require('fs');

const pagePath = 'f:/desklip/Talent/src/app/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

// Ensure PieChart is in lucide-react imports
if (!content.includes('PieChart')) {
  content = content.replace('Activity, Zap, MicOff, UserCheck, Play, Pause, FastForward, StopCircle', 'Activity, Zap, MicOff, UserCheck, Play, Pause, FastForward, StopCircle, PieChart');
}

// Ensure ReportsModule is imported
if (!content.includes('import { ReportsModule }')) {
  content = content.replace('import { ManageEventModule } from "@/components/admin/ManageEventModule";', 'import { ManageEventModule } from "@/components/admin/ManageEventModule";\nimport { ReportsModule } from "@/components/admin/ReportsModule";');
}

fs.writeFileSync(pagePath, content, 'utf8');
console.log("Imports fixed via node.");
