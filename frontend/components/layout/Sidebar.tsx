"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/stores/useAppState";
import { canAccessRoute } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Newspaper, 
  Radar, 
  LineChart, 
  Bell, 
  FileText, 
  Settings, 
  BarChart2, 
  HelpCircle, 
  User as UserIcon,
  ShieldAlert,
  Zap,
  Dices,
  GitCompare,
  RotateCcw
} from "lucide-react";

// Complete navigation list matching all app routes
const ALL_NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "ML Stress Tester", href: "/scenarios", icon: ShieldAlert },
  { name: "Scenario Automate", href: "/scenario-automate", icon: Zap },
  { name: "Business Stress", href: "/business-stress", icon: BarChart2 },
  { name: "Monte Carlo", href: "/monte-carlo", icon: Dices },
  { name: "Reverse Stress", href: "/reverse", icon: RotateCcw },
  { name: "Compare Scenarios", href: "/compare", icon: GitCompare },
  { name: "Forecasts", href: "/forecasts", icon: LineChart },
  { name: "Intelligence", href: "/intelligence", icon: Radar },
  { name: "Board Briefs", href: "/briefs", icon: FileText },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "News Feed", href: "/news", icon: Newspaper },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { state } = useAppState();
  const user = state.currentUser;

  // Dynamically filter navigation items based on current logged-in user role
  const visibleNavItems = user 
    ? ALL_NAV_ITEMS.filter(item => canAccessRoute(user.role, item.href))
    : ALL_NAV_ITEMS;

  return (
    <div className="w-64 bg-black border-r border-brand-border/30 h-screen flex flex-col fixed left-0 top-0 z-30">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#facc15] text-black font-bold text-sm px-2 py-1 rounded-sm">
            MTN
          </div>
          <div className="leading-tight">
            <div className="text-white font-bold tracking-widest text-sm">QUANTRISK</div>
            <div className="text-[#888] font-mono text-[10px] tracking-widest uppercase">PRECISION ANALYSIS</div>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <Link
          href="/scenarios"
          className="w-full bg-[#facc15] hover:bg-[#eab308] text-black font-bold py-2.5 px-4 rounded-sm transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
        >
          <BarChart2 size={16} className="text-black" />
          Analyze Risk
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-mtn-yellow/10 text-mtn-yellow font-semibold" 
                  : "text-on-surface-variant hover:text-white hover:bg-surface-container"
              }`}
            >
              <item.icon size={18} className={isActive ? "text-mtn-yellow" : "text-on-surface-variant"} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-1 border-t border-brand-border/30 bg-black">
        <Link 
          href="/help" 
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-on-surface-variant hover:text-white hover:bg-surface-container transition-colors"
        >
          <HelpCircle size={18} />
          Help & Support
        </Link>

        {/* Logged in Persona Info */}
        {user && (
          <div className="pt-2 px-3 flex items-center justify-between border-t border-outline/10 mt-2">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-xs font-bold text-white truncate">{user.name || user.email}</p>
              <p className="text-[10px] font-mono text-mtn-yellow uppercase tracking-wider font-semibold">{user.role}</p>
            </div>
            <UserIcon size={16} className="text-on-surface-variant shrink-0" />
          </div>
        )}

        <div className="mt-4 px-3 text-[10px] font-mono text-on-surface-variant/60 tracking-widest uppercase">
          CONFIDENTIAL &middot; MTN GHANA &middot; 2026
        </div>
      </div>
    </div>
  );
}