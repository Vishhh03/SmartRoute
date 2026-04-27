import { useState, useEffect } from "react";
import {
  LayoutDashboard, Activity, BarChart3, Database, Info, Radio, Leaf, Settings,
  BarChart2, Clock, MapPin, TrendingUp, Download
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Global Overview", url: "/", icon: LayoutDashboard },
  { title: "Live Predictor", url: "/predict", icon: Activity },
  { title: "Analytics Lab", url: "/analytics", icon: BarChart3 },
  { title: "Sustainability", url: "/dataset", icon: Leaf },
  { title: "System Settings", url: "/about", icon: Settings },
];

const analyticsItems = [
  { title: "Model Comparison", url: "/model-comparison", icon: BarChart2 },
  { title: "Peak Hour Analysis", url: "/peak-hour", icon: Clock },
];

const dataExplorerItems = [
  { title: "Landmark Hotspots", url: "/hotspots", icon: MapPin },
  { title: "Baseline Metrics", url: "/baseline", icon: TrendingUp },
];

const LIVE_UPDATES = [
  "Heavy rain detected in Downtown — model recalibrating.",
  "Peak hour traffic surge on I-94 corridor.",
  "Fog advisory issued — visibility below 2 miles.",
  "Holiday weekend detected — demand forecast elevated.",
  "Thunderstorm warning: congestion +38% predicted.",
  "Clear skies across metro — optimal traffic flow.",
  "Construction zone active on Highway 55 — rerouting.",
  "Temperature drop detected — black ice risk flagged.",
  "Evening rush: XGBoost confidence at 95.8%.",
  "Snow advisory: expect 25% volume reduction.",
];

const LiveTicker = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % LIVE_UPDATES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
      <div className="mx-2 mb-3 rounded-lg neon-glow border-white/20 bg-black/30 p-2.5 overflow-hidden">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Radio className="h-2.5 w-2.5 neon-teal animate-pulse" />
          <span className="orbitron-mono text-[9px] font-bold uppercase tracking-widest neon-teal">
            SYSTEM FEED
          </span>
        </div>
      <p
        className="text-[9px] leading-relaxed text-slate-400"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(4px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        {LIVE_UPDATES[index]}
      </p>
    </div>
  );
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <div
        className="flex flex-col h-full border-r neon-glow"
        style={{
          backgroundColor: "#0a0a0f",
        }}
      >
        {/* Header */}
        <SidebarHeader className="p-4 border-b neon-glow">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg neon-glow"
              style={{ background: "#00ffcc", boxShadow: "0 0 16px #00ffcc" }}
            >
              <Activity className="h-5 w-5 text-black font-bold" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-display orbitron-mono text-sm font-bold neon-teal tracking-wider">
                  TRAFFIC NET
                </span>
                <span className="text-[10px] neon-teal opacity-80 leading-tight font-mono">
                  CYBER CONTROL v2.1
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        {/* Nav */}
        <SidebarContent className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel className="orbitron-mono text-[10px] uppercase tracking-widest neon-teal px-4 pt-4 pb-1 opacity-90">
              CORE SYSTEMS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive =
                    item.url === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                          <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="glow-hover flex items-center gap-2 mx-2 px-3 py-2 rounded-lg neon-teal text-sm font-mono transition-all duration-200 hover:neon-glow hover:bg-white/5"
                          activeClassName=""
                          style={isActive ? {
                            backgroundColor: "#00ffcc20",
                            color: "#00ffcc",
                            fontWeight: 700,
                            boxShadow: "0 0 20px #00ffcc50, inset 0 0 10px #00ffcc30",
                          } : {}}  
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="orbitron-mono text-[10px] uppercase tracking-widest neon-teal px-4 pt-4 pb-1 opacity-90">
              ANALYTICS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analyticsItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                          <NavLink
                          to={item.url}
                          className="glow-hover flex items-center gap-2 mx-2 px-3 py-2 rounded-lg neon-teal text-sm font-mono transition-all duration-200 hover:neon-glow hover:bg-white/5"
                          activeClassName=""
                          style={isActive ? {
                            backgroundColor: "#00ffcc20",
                            color: "#00ffcc",
                            fontWeight: 700,
                            boxShadow: "0 0 20px #00ffcc50, inset 0 0 10px #00ffcc30",
                          } : {}}  
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="orbitron-mono text-[10px] uppercase tracking-widest neon-teal px-4 pt-4 pb-1 opacity-90">
              DATA EXPLORER
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dataExplorerItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                          <NavLink
                          to={item.url}
                          className="glow-hover flex items-center gap-2 mx-2 px-3 py-2 rounded-lg neon-teal text-sm font-mono transition-all duration-200 hover:neon-glow hover:bg-white/5"
                          activeClassName=""
                          style={isActive ? {
                            backgroundColor: "#00ffcc20",
                            color: "#00ffcc",
                            fontWeight: 700,
                            boxShadow: "0 0 20px #00ffcc50, inset 0 0 10px #00ffcc30",
                          } : {}}  
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Live ticker — only when expanded */}
        {!collapsed && <LiveTicker />}

        {/* Footer */}
        {!collapsed && (
          <SidebarFooter className="p-4 border-t neon-glow">
            <div className="rounded-lg neon-glow bg-black/40 border-white/20 p-3 mb-2 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => window.print()}>
              <div className="flex items-center gap-2 text-emerald-400">
                <Download className="h-4 w-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Export Report</span>
              </div>
            </div>
            <div className="rounded-lg neon-glow bg-black/40 border-white/20 p-3">
              <p className="orbitron-mono text-[10px] font-bold neon-teal">NEURAL CORE</p>
              <p className="text-[9px] neon-teal mt-0.5 font-mono opacity-90">XGBoost R²: 0.9583</p>
            </div>
          </SidebarFooter>
        )}
      </div>
    </Sidebar>
  );
}