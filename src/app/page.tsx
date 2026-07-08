'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Users, Activity, Layers, ArrowLeftRight, Rocket, Droplets, Shield, ExternalLink, Zap, Globe, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { StatCard } from '@/components/ui/Card';
import { Badge, ChangeTag } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FullChart, generateChartData, MiniChart } from '@/components/charts/MiniChart';
import { useWallet } from '@/lib/hooks';
import { useMultipleTokenBalances } from '@/lib/web3-hooks';
import { BASE_TOKENS } from '@/lib/constants';
import { useBalance } from 'wagmi';
import { loadDeployedTokens, fetchTokenOnChainMetadata } from '@/lib/deployed-tokens';
import { usePublicClient } from 'wagmi';

// Fallback token prices
const TOKEN_PRICE_FALLBACKS: Record<string, number> = {
  'ETH': 3842.50,
  'WETH': 3842.50,
  'USDC': 1.00,
  'USDbC': 1.00,
  'DAI': 1.00,
  'cbETH': 4021.30,
};

const volumeData = generateChartData(30, 25_000_000, 0.12);
const tvlData    = generateChartData(30, 128_000_000, 0.06);

const recentActivity = [
  { type: 'launch', desc: 'Deploy a B20 token', amount: 'On-chain', time: 'Ready' },
  { type: 'liquidity', desc: 'Add liquidity on Aerodrome', amount: 'Base', time: 'Ready' },
  { type: 'swap', desc: 'Route and compare quotes', amount: 'Live', time: 'Ready' },
];

const quickActions = [
  { label: 'Swap',          desc: 'Trade tokens',        icon: ArrowLeftRight, color: 'blue',   href: '/swap' },
  { label: 'Launch Token',  desc: 'B20 native standard', icon: Rocket,         color: 'purple', href: '/launchpad', badge: 'B20' },
  { label: 'Add Liquidity', desc: 'Aerodrome / Uniswap', icon: Droplets,       color: 'green',  href: '/liquidity' },
  { label: 'Security Scan', desc: 'Contract analysis',   icon: Shield,         color: 'orange', href: '/security' },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-[#14B8A6]/10', text: 'text-[#2dd4bf]',  border: 'border-[#14B8A6]/20' },
  purple: { bg: 'bg-[#a855f7]/10', text: 'text-[#a855f7]',  border: 'border-[#a855f7]/20' },
  green:  { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]',  border: 'border-[#10B981]/20' },
  orange: { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]',  border: 'border-[#f59e0b]/20' },
};

type Period = '24H' | '7D' | '30D' | '90D';

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('30D');
  const [chartView, setChartView] = useState<'volume' | 'tvl'>('volume');
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { name: string; symbol: string; decimals: number; totalSupply: string }>>({});
  const chartData = chartView === 'volume' ? volumeData : tvlData;
  const publicClient = usePublicClient();

  const { address, isConnected } = useWallet();
  const { data: ethBalance } = useBalance({ address: address as `0x${string}` | undefined });

  const tokens = useMemo(() => BASE_TOKENS.map(t => ({
    address: t.address,
    decimals: t.decimals,
  })), []);

  const { balances } = useMultipleTokenBalances(
    tokens,
    address as `0x${string}` | undefined
  );

  const deployedTokens = useMemo(() => loadDeployedTokens(), []);

  useEffect(() => {
    if (!publicClient || deployedTokens.length === 0) return;
    const run = async () => {
      const entries = await Promise.all(
        deployedTokens.map(async (token) => {
          const metadata = await fetchTokenOnChainMetadata(publicClient, token.address as `0x${string}`);
          return [token.address.toLowerCase(), metadata ?? { name: token.name, symbol: token.symbol, decimals: token.decimals, totalSupply: token.totalSupply }];
        })
      );
      setTokenMetadata(Object.fromEntries(entries));
    };
    void run();
  }, [publicClient, deployedTokens]);

  const trendingTokens = useMemo(() => {
    const base = BASE_TOKENS.map((token, index) => ({
      rank: index + 1,
      symbol: token.symbol,
      name: token.name,
      price: '$—',
      change: 0,
      vol: '$—',
      mc: '$—',
    }));

    const deployed = deployedTokens.map((token, index) => ({
      rank: base.length + index + 1,
      symbol: tokenMetadata[token.address.toLowerCase()]?.symbol || token.symbol,
      name: tokenMetadata[token.address.toLowerCase()]?.name || token.name,
      price: '$—',
      change: 0,
      vol: '$—',
      mc: '$—',
    }));

    return [...base, ...deployed];
  }, [deployedTokens, tokenMetadata]);

  // Calculate total portfolio value
  const portfolioValue = useMemo(() => {
    if (!isConnected) return 0;
    
    const ethValue = ethBalance ? parseFloat(ethBalance.formatted) * (TOKEN_PRICE_FALLBACKS['ETH'] ?? 0) : 0;
    const tokensValue = BASE_TOKENS.reduce((sum, token, index) => {
      const balance = parseFloat(balances[index] || '0');
      const price = TOKEN_PRICE_FALLBACKS[token.symbol] ?? 0;
      return sum + (balance * price);
    }, 0);
    
    return ethValue + tokensValue;
  }, [isConnected, ethBalance, balances]);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#14B8A6]/12 via-[#111B22] to-[#10B981]/6 border border-[#14B8A6]/20 rounded-2xl p-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#14B8A6]/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="teal" dot>Base Mainnet</Badge>
              <Badge variant="green">Beryl Upgrade</Badge>
            </div>
            <h2 className="text-white text-xl sm:text-2xl font-bold mb-1">
              B20<span className="text-[#14B8A6]">Forge</span>{' '}
              <span className="text-[#3D5A6A] font-normal text-base sm:text-lg">— The B20 Launchpad on Base</span>
            </h2>
            <p className="text-[#3D5A6A] text-sm max-w-xl">
              Deploy tokens using the B20 native standard. Manage liquidity through Aerodrome and Uniswap.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/launchpad">
              <Button icon={<Rocket className="w-4 h-4" />}>Launch Token</Button>
            </Link>
            <Link href="/explore" className="hidden sm:block">
              <Button variant="secondary" icon={<Globe className="w-4 h-4" />}>Explore</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isConnected && portfolioValue > 0 ? (
          <StatCard 
            label="Your Portfolio" 
            value={`$${portfolioValue.toFixed(2)}`} 
            change="+0%" 
            sub="connected" 
            icon={<Wallet className="w-4 h-4" />} 
            color="teal" 
          />
        ) : (
          <StatCard label="24H Volume"   value="$25.62M" change="+18.7%" sub="past 24h"  icon={<Activity className="w-4 h-4" />}   color="teal"   />
        )}
        <StatCard label="Total Txns"   value="128,742" change="+15.3%" sub="this week" icon={<ArrowUpRight className="w-4 h-4" />} color="green"  />
        <StatCard label="Active Users" value="24,531"  change="+14.8%" sub="today"     icon={<Users className="w-4 h-4" />}      color="purple" />
        <StatCard label="New Tokens"   value="96"      change="+8.7%"  sub="this week" icon={<Layers className="w-4 h-4" />}     color="yellow" />
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 bg-[#111B22] border border-[#1B2A32] rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex bg-[#0A1520] rounded-lg p-0.5 border border-[#1B2A32] w-fit">
              {(['volume','tvl'] as const).map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                    chartView === v ? 'bg-[#1a2f3a] text-white shadow-sm' : 'text-[#6B8A99] hover:text-white'
                  )}>{v === 'volume' ? '24H Volume' : 'TVL'}</button>
              ))}
            </div>
            <div className="flex bg-[#0A1520] rounded-lg p-0.5 border border-[#1B2A32] w-fit">
              {(['24H','7D','30D','90D'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={clsx('px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                    period === p ? 'bg-[#1a2f3a] text-white shadow-sm' : 'text-[#6B8A99] hover:text-white'
                  )}>{p}</button>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-white text-2xl font-bold">{chartView === 'volume' ? '$25.62M' : '$128.7M'}</p>
            <p className="text-[#10B981] text-xs font-medium mt-0.5">↑ {chartView === 'volume' ? '18.7%' : '6.2%'} last {period}</p>
          </div>
          <FullChart data={chartData} color={chartView === 'volume' ? '#14B8A6' : '#10B981'} height={160} showAxes showTooltip />
        </div>

        <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map(({ label, desc, icon: Icon, color, href, badge }) => {
              const c = colorMap[color] ?? colorMap['blue'];
              return (
                <Link key={label} href={href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#0f1e2a] border border-transparent hover:border-[#1B2A32] transition-all group">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', c.bg, c.border)}>
                    <Icon className={clsx('w-5 h-5', c.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-semibold">{label}</span>
                      {badge && <span className="text-[9px] font-bold bg-[#14B8A6]/20 text-[#2dd4bf] border border-[#14B8A6]/25 px-1.5 py-0.5 rounded-full">{badge}</span>}
                    </div>
                    <p className="text-[#3D5A6A] text-xs mt-0.5">{desc}</p>
                  </div>
                  <ArrowUpRight className={clsx('w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity', c.text)} />
                </Link>
              );
            })}
          </div>
          <div className="mt-4 bg-gradient-to-br from-[#14B8A6]/10 to-[#10B981]/5 border border-[#14B8A6]/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#2dd4bf]" />
              <span className="text-[#2dd4bf] text-xs font-semibold">B20 Native Standard</span>
            </div>
            <p className="text-[#3D5A6A] text-xs leading-relaxed">Beryl upgrade brings B20 — ERC-20 compatible, role-based mint/burn, policy lists, ERC-2612 permit.</p>
            <a href="https://docs.base.org/base-chain/specs/upgrades/beryl/b20" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#2dd4bf] text-xs font-medium mt-2 hover:text-[#14B8A6] transition-colors">
              Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Trending + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
        <div className="xl:col-span-3 bg-[#111B22] border border-[#1B2A32] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B2A32]">
            <h3 className="text-white text-sm font-semibold">Trending Tokens</h3>
            <Link href="/explore" className="text-[#2dd4bf] text-xs hover:text-[#14B8A6] transition-colors">View All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#1B2A32]">
                {['#','Token','Price','24H','Volume','MC','Chart'].map(h => (
                  <th key={h} className="px-4 sm:px-5 py-3 text-left text-[#3D5A6A] text-xs font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#1B2A32]">
                {trendingTokens.map(t => (
                  <tr key={t.symbol} className="hover:bg-[#0f1e2a] transition-colors cursor-pointer">
                    <td className="px-4 sm:px-5 py-3 text-[#3D5A6A] text-sm">{t.rank}</td>
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#162535] border border-[#253C48] flex items-center justify-center text-xs font-bold text-[#2dd4bf] shrink-0">{t.symbol[0]}</div>
                        <div>
                          <p className="text-white text-sm font-semibold">{t.symbol}</p>
                          <p className="text-[#3D5A6A] text-xs hidden sm:block">{t.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-white text-sm font-medium">{t.price}</td>
                    <td className="px-4 sm:px-5 py-3"><ChangeTag value={t.change} /></td>
                    <td className="px-4 sm:px-5 py-3 text-[#6B8A99] text-sm hidden sm:table-cell">{t.vol}</td>
                    <td className="px-4 sm:px-5 py-3 text-[#6B8A99] text-sm hidden md:table-cell">{t.mc}</td>
                    <td className="px-4 sm:px-5 py-3 w-16"><MiniChart positive={t.change >= 0} height={28} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-2 bg-[#111B22] border border-[#1B2A32] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B2A32]">
            <h3 className="text-white text-sm font-semibold">Recent Activity</h3>
            <Badge variant="teal" dot>Live</Badge>
          </div>
          <div className="divide-y divide-[#1B2A32]">
            {recentActivity.map((a, i) => {
              const icons: Record<string,string> = { swap:'↔', launch:'🚀', liquidity:'💧' };
              const colors: Record<string,string> = { swap:'bg-[#14B8A6]/10', launch:'bg-[#a855f7]/10', liquidity:'bg-[#10B981]/10' };
              const textColors: Record<string,string> = { swap:'text-[#2dd4bf]', launch:'text-[#a855f7]', liquidity:'text-[#10B981]' };
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-[#0f1e2a] transition-colors cursor-pointer">
                  <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm', colors[a.type])}>{icons[a.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold">{a.desc}</p>
                    <p className="text-[#3D5A6A] text-xs mt-0.5">{a.time}</p>
                  </div>
                  <p className={clsx('text-xs font-semibold shrink-0', textColors[a.type])}>{a.amount}</p>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-[#1B2A32]">
            <button className="text-[#2dd4bf] text-xs hover:text-[#14B8A6] transition-colors">View all activity →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
