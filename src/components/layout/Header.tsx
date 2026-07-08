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
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-[#071114]/95 backdrop-blur-sm border-b border-[#1B2A32]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button onClick={onMenuClick}
          className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-[#6B8A99] hover:text-white hover:bg-[#111B22] transition-all shrink-0 border border-transparent hover:border-[#1B2A32]">
          <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-white text-sm sm:text-base md:text-lg font-bold leading-tight truncate">{pageInfo.title}</h1>
          <p className="text-[#3D5A6A] text-xs hidden sm:block truncate">{pageInfo.subtitle}</p>
        </div>
      </div>

      <div className="relative shrink-0 max-w-full overflow-hidden ml-auto">
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
