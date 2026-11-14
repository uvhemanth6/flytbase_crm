'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Shield, Zap,
  ChevronRight, Database, type LucideIcon,
} from 'lucide-react';

type NavLeaf = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; icon: LucideIcon; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Accounts',
    icon: Building2,
    children: [
      { label: 'Eastern Counties Police Alliance', href: '/accounts/eastern-counties-police-alliance', icon: Shield },
      { label: 'Aldermoor Industrial Group', href: '/accounts/aldermoor-industrial-group', icon: Building2 },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-slate-900 h-screen flex flex-col border-r border-slate-800 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">FlytBase</p>
            <p className="text-slate-400 text-xs mt-0.5">Customer Success</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => {
          if ('href' in item) {
            const active = path === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}>
                  <Icon size={16} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          }

          // Group with children
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <div className="flex items-center gap-3 px-3 py-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mt-3 mb-1">
                <Icon size={13} />
                {item.label}
              </div>
              {item.children.map(child => {
                const active = path === child.href || path.startsWith(child.href);
                const CIcon = child.icon;
                return (
                  <Link key={child.href} href={child.href}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      active
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-700/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}>
                      <CIcon size={14} className="shrink-0" />
                      <span className="text-xs font-medium leading-tight">{child.label}</span>
                      {active && <ChevronRight size={12} className="ml-auto" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Database size={12} />
          <span>MCP · questathon.aihackerscollective.com</span>
        </div>
        <p className="text-slate-600 text-xs mt-1">FlytBase Questathon 2026</p>
      </div>
    </aside>
  );
}
