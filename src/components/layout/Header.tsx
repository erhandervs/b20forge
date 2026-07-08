'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const pageTitles: Record<string, { title:string; subtitle:string }> = {
  '/swap':      { title:'Swap',       subtitle:'Swap tokens at the best rates'              },
  '/launchpad': { title:'Launchpad',  subtitle:'Deploy tokens with the B20 native standard' },
  '/explore':   { title:'Explore',    subtitle:'Discover tokens on Base'                    },
  '/liquidity': { title:'Liquidity',  subtitle:'Manage liquidity on Base'                   },
  '/portfolio': { title:'Portfolio',  subtitle:'Track your assets and performance'          },
  '/security':  { title:'Security',   subtitle:'Analyze token contract security'           },
};

interface HeaderProps { onMenuClick?:()=>void; }

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] ?? { title:'B20Forge', subtitle:'Base Network' };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-15 py-3 bg-[#071114]/95 backdrop-blur-sm border-b border-[#1B2A32]">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[#6B8A99] hover:text-white hover:bg-[#111B22] transition-all shrink-0 border border-transparent hover:border-[#1B2A32]">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-white text-base sm:text-lg font-bold leading-tight truncate">{pageInfo.title}</h1>
          <p className="text-[#3D5A6A] text-xs hidden sm:block truncate">{pageInfo.subtitle}</p>
        </div>
      </div>

      <div className="relative shrink-0">
        <ConnectButton 
          chainStatus="icon" 
          showBalance={false}
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
      </div>
    </header>
  );
}
