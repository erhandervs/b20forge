/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ExternalLink, TrendingUp, Loader2 } from 'lucide-react';
import { Badge, ChangeTag } from '@/components/ui/Badge';
import { FullChart, generateChartData } from '@/components/charts/MiniChart';
import { Button } from '@/components/ui/Button';
import { useAccount, useBalance } from 'wagmi';
import { useMultipleTokenBalances } from '@/lib/web3-hooks';
import { BASE_TOKENS } from '@/lib/constants';
import { useDexPrices, getPriceWithFallback } from '@/lib/dex-price-api';
import type { Address } from 'viem';

const chartData = generateChartData(30, 4351, 0.06);

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });

  const tokensForBalance = useMemo(() => {
    if (!BASE_TOKENS || BASE_TOKENS.length === 0) return [];
    return BASE_TOKENS.map(t => ({ address: t.address as Address, decimals: t.decimals }));
  }, []);

  const { balances, isLoading: isLoadingBalances } = useMultipleTokenBalances(tokensForBalance, address);
  const safeBalances = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return BASE_TOKENS.map(() => '0');
    if (balances.length < BASE_TOKENS.length) {
      return [...balances, ...Array(BASE_TOKENS.length - balances.length).fill('0')] as string[];
    }
    return balances.slice(0, BASE_TOKENS.length);
  }, [balances]);

  const tokenAddresses = useMemo(() => BASE_TOKENS.map(t => t.address), []);
  const { prices: dexPrices, isLoading: isLoadingPrices } = useDexPrices(tokenAddresses);

  const assets = useMemo(() => {
    const ethValue = ethBalance ? parseFloat(ethBalance.formatted) : 0;
    const wethPrice = getPriceWithFallback(BASE_TOKENS[0].address, dexPrices[BASE_TOKENS[0].address.toLowerCase()]);
    const wethChange = dexPrices[BASE_TOKENS[0].address.toLowerCase()]?.priceChange24h ?? 0;

    const result = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: ethValue,
        price: wethPrice,
        change: wethChange,
        value: ethValue * wethPrice,
        color: '#627eea',
        logo: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
      },
      ...BASE_TOKENS.map((token, index) => {
        const balance = parseFloat(safeBalances[index] || '0');
        const price = getPriceWithFallback(token.address, dexPrices[token.address.toLowerCase()]);
        const change = dexPrices[token.address.toLowerCase()]?.priceChange24h ?? 0;
        return {
          symbol: token.symbol,
          name: token.name,
          balance,
          price,
          change,
          value: balance * price,
          color: token.color,
          logo: token.logo,
        };
      }),
    ];

    return result.filter(a => a.balance > 0).sort((a, b) => b.value - a.value);
  }, [ethBalance, safeBalances, dexPrices]);

  const totalValue = useMemo(() => assets.reduce((sum, a) => sum + a.value, 0), [assets]);
  const assetsWithAllocation = useMemo(
    () => assets.map(a => ({ ...a, alloc: totalValue > 0 ? (a.value / totalValue) * 100 : 0 })),
    [assets, totalValue]
  );

  const totalChange = 0;
  const totalChangePct = 0;

  if (!isConnected) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="bg-[#131720] border border-[#1e2535] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1e2535] flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-[#4a5568]" />
          </div>
          <h3 className="text-[#e8eaf0] text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-[#8892a4] text-sm">Connect your wallet to view your portfolio</p>
        </div>
      </div>
    );
  }

  if (isLoadingBalances || isLoadingPrices) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="bg-[#131720] border border-[#1e2535] rounded-2xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-[#0052ff] animate-spin mx-auto mb-4" />
          <p className="text-[#8892a4] text-sm">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#131720] border border-[#1e2535] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[#8892a4] text-xs font-medium uppercase tracking-wider mb-1">Total Value</p>
              <p className="text-[#e8eaf0] text-4xl font-bold tracking-tight">
                ${totalValue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[#10B981] text-sm font-semibold">+${totalChange.toFixed(2)}</span>
                <Badge variant="green">+{totalChangePct}%</Badge>
                <span className="text-[#4a5568] text-xs">in 24h</span>
              </div>
            </div>
          </div>
          <FullChart data={chartData} color="#0052ff" height={140} showTooltip />
          <div className="flex gap-2 mt-3">
            {(['1D', '1W', '1M', '3M'] as const).map(p => (
              <button key={p} className="px-2.5 py-1 rounded-lg text-xs font-medium text-[#8892a4] hover:bg-[#1a1f2e] hover:text-[#e8eaf0] transition-all">
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#131720] border border-[#1e2535] rounded-2xl p-5">
          <h3 className="text-[#e8eaf0] text-sm font-semibold mb-4">Allocation</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={assetsWithAllocation} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                  {assetsWithAllocation.map((a, i) => <Cell key={i} fill={a.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#131720', border: '1px solid #1e2535', borderRadius: '10px', fontSize: '12px', color: '#e8eaf0', padding: '6px 10px' }}
                  formatter={(v) => v ? [`$${Number(v).toFixed(2)}`, ''] : ['', '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[#4a5568] text-xs">Total</p>
              <p className="text-[#e8eaf0] text-base font-bold">
                ${totalValue >= 1000 ? (totalValue / 1000).toFixed(1) + 'K' : totalValue.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            {assetsWithAllocation.slice(0, 4).map(a => (
              <div key={a.symbol} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                <span className="text-[#8892a4] text-xs flex-1">{a.symbol}</span>
                <span className="text-[#e8eaf0] text-xs font-semibold">{a.alloc.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#131720] border border-[#1e2535] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2535]">
          <p className="text-[#e8eaf0] text-sm font-semibold">Token Holdings</p>
          <a href="https://basescan.org" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>Basescan</Button>
          </a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2535]">
              {['Asset', 'Balance', 'Price', '24H', 'Value', 'Allocation'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[#4a5568] text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2535]">
            {assetsWithAllocation.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center">
                  <p className="text-[#8892a4] text-sm">No assets found</p>
                  <p className="text-[#4a5568] text-xs mt-1">Add some tokens to your wallet to see them here</p>
                </td>
              </tr>
            ) : (
              assetsWithAllocation.map(a => (
                <tr key={a.symbol} className="hover:bg-[#1a1f2e] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={a.logo}
                        alt={a.symbol}
                        className="w-8 h-8 rounded-xl"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${a.symbol}&background=${a.color.replace('#', '')}&color=fff&size=128`;
                        }}
                      />
                      <div>
                        <p className="text-[#e8eaf0] text-sm font-semibold">{a.symbol}</p>
                        <p className="text-[#4a5568] text-xs">{a.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#e8eaf0] text-sm font-mono">
                    {a.balance < 0.0001 ? a.balance.toFixed(8) : a.balance.toFixed(4)}
                  </td>
                  <td className="px-5 py-3.5 text-[#e8eaf0] text-sm font-mono">
                    ${a.price < 0.001 ? a.price.toFixed(5) : a.price.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5"><ChangeTag value={a.change} /></td>
                  <td className="px-5 py-3.5 text-[#e8eaf0] text-sm font-semibold">${a.value.toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#1e2535] rounded-full h-1.5 max-w-[80px]">
                        <div className="h-1.5 rounded-full" style={{ width: `${a.alloc}%`, background: a.color }} />
                      </div>
                      <span className="text-[#8892a4] text-xs">{a.alloc.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
