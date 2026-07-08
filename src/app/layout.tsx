'use client';

import { useState } from 'react';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Web3Provider } from '@/components/providers/Web3Provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>B20Forge — Base Network B20 Launchpad</title>
        <meta name="description" content="Deploy, swap and manage liquidity for B20 native tokens on Base." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/variant_c.svg" />
      </head>
      <body className="bg-[#071114] text-[#E2EAF0] antialiased">
        <Web3Provider>
          <div className="flex min-h-screen">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
              <Header onMenuClick={() => setSidebarOpen(o => !o)} />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
