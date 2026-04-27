import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Brain, Clock } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <SidebarProvider>
      <div className="cyberpunk-layout min-h-screen flex w-full cyber-bg">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 cyber-bg">

          {/* Cyberpunk Header */}
          <header
            className="h-14 flex items-center justify-between px-6 sticky top-0 z-50 neon-glow border-b border-white/20"
            style={{
              backgroundColor: "#0a0a0f",
            }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="font-display orbitron-mono text-sm font-bold neon-teal hidden sm:inline tracking-wider">
                TRAFFIC CONTROL CENTER
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Subtle Model Online badge */}
              <div className="flex items-center gap-1.5 rounded-full neon-glow px-3 py-1 text-xs bg-black/30 border-white/20">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffcc] opacity-75" style={{boxShadow: '0 0 8px #00ffcc'}} />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ffcc] neon-glow" />
                </span>
                <Brain className="h-3 w-3 neon-teal" />
                <span className="font-bold tracking-wider">AI ONLINE</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-4 w-4 neon-teal glow-hover" />
                <span className="hidden sm:inline neon-teal opacity-90 font-mono tracking-wider">{formattedDate} ·</span>
                <span className="orbitron-mono font-bold text-lg neon-teal drop-shadow-[0_0_12px_#00ffcc]">{formattedTime}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 cyber-bg relative">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}