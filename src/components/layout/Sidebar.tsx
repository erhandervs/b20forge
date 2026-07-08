'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ArrowLeftRight, Rocket, Compass, Droplets, PieChart, Shield, ChevronRight, Zap, X } from 'lucide-react';

const navItems = [
  { id:'swap',      label:'Swap',      icon:ArrowLeftRight, path:'/swap'                },
  { id:'launchpad', label:'Launchpad', icon:Rocket,         path:'/launchpad', badge:'B20' },
  { id:'explore',   label:'Explore',   icon:Compass,        path:'/explore'              },
  { id:'liquidity', label:'Liquidity', icon:Droplets,       path:'/liquidity'            },
  { id:'portfolio', label:'Portfolio', icon:PieChart,       path:'/portfolio'            },
  { id:'security',  label:'Security',  icon:Shield,         path:'/security'             },
];

interface SidebarProps { open?:boolean; onClose?:()=>void; }

export function Sidebar({ open=true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {onClose && open && (
        <div className="sidebar-overlay lg:hidden" onClick={onClose} />
      )}
      <aside className={clsx(
        'shrink-0 h-screen sticky top-0 flex flex-col z-50',
        'bg-[#071114] border-r border-[#1B2A32]',
        'fixed lg:static transition-transform duration-300',
        'w-[200px] md:w-[220px]',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="px-3 py-3 border-b border-[#1B2A32] flex items-center justify-center">
          <Link href="/swap" className="flex items-center justify-center" onClick={onClose}>
            <img src="/b20forgewhite.png" alt="B20Forge" className="w-12 h-12 rounded-lg shrink-0 object-cover" />
          </Link>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-[#3D5A6A] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, label, icon:Icon, path, badge }) => {
            const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
            return (
              <Link key={id} href={path} onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative',
                  isActive
                    ? 'bg-[#14B8A6]/12 text-white'
                    : 'text-[#6B8A99] hover:bg-[#111B22] hover:text-[#E2EAF0]'
                )}>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#14B8A6] rounded-r-full" />
                )}
                <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-[#14B8A6]' : 'group-hover:text-[#E2EAF0]')} />
                <span className="text-sm font-medium flex-1">{label}</span>
                {badge && (
                  <span className="text-[9px] font-bold bg-[#14B8A6]/15 text-[#2dd4bf] border border-[#14B8A6]/25 px-1.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 text-[#14B8A6] shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-[#1B2A32]">
          <div className="bg-[#14B8A6]/8 border border-[#14B8A6]/15 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3.5 h-3.5 rounded-full bg-[#14B8A6] flex items-center justify-center shrink-0">
                <span className="text-white text-[7px] font-black">B</span>
              </div>
              <span className="text-[#2dd4bf] text-xs font-semibold">Beryl Upgrade</span>
            </div>
            <p className="text-[#3D5A6A] text-[10px] leading-relaxed">
              B20 native token standard is live.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
