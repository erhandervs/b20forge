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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#071114" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Favicon - multiple sizes for all devices */}
        <link rel="icon" type="image/svg+xml" href="/variant_c.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/variant_c.svg" />
        <link rel="icon" type="image/png" sizes="16x16" href="/variant_c.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/variant_c.svg" />
        <link rel="shortcut icon" href="/variant_c.svg" />
      </head>
      <body className="bg-[#071114] text-[#E2EAF0] antialiased overflow-x-hidden">
        <Web3Provider>
          <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 min-h-screen w-full max-w-full overflow-x-hidden">
              <Header onMenuClick={() => setSidebarOpen(o => !o)} />
              <main className="flex-1 w-full max-w-full overflow-x-hidden">
                {children}
              </main>
            </div>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
