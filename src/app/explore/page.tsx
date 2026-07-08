'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Star, ExternalLink, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, ChangeTag } from '@/components/ui/Badge';
import { MiniChart } from '@/components/charts/MiniChart';
import { useDebounce } from '@/lib/hooks';

type Tab = 'trending' | 'new' | 'top-volume' | 'most-watched';

// Import real token list
import { BASE_TOKENS, formatNumber } from '@/lib/constants';
import { useDexPrices, getPriceWithFallback } from '@/lib/dex-price-api';
import { loadDeployedTokens, fetchTokenOnChainMetadata } from '@/lib/deployed-tokens';
import { usePublicClient } from 'wagmi';

type Token = {
  rank: number;
  symbol: string;
  name: string;
  address: string;
  logo: string;
  price: number;
  change: number;
  vol: string;
  mc: string;
  liq: string;
  holders: string;
  verified: boolean;
  b20: boolean;
  positive: boolean;
};

const TABS: { id: Tab; label: string }[] = [
  { id:'trending',     label:'Trending'    },
  { id:'new',          label:'New'         },
  { id:'top-volume',   label:'Top Volume'  },
  { id:'most-watched', label:'Most Watched'},
];

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>('trending');
  const publicClient = usePublicClient();
  const [query, setQuery] = useState('');
  const [watched, setWatched] = useState<Set<string>>(new Set(['WETH','USDC']));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const debouncedQ = useDebounce(query, 250);

  const deployedTokens = useMemo(() => loadDeployedTokens(), []);

  // Fetch real prices from DexScreener
  const tokenAddresses = useMemo(() => {
    const addresses = BASE_TOKENS.map(t => t.address);
    return [...addresses, ...deployedTokens.map(t => t.address)];
  }, [deployedTokens]);
  const { prices: dexPrices, isLoading } = useDexPrices(tokenAddresses);

  const [onChainTokens, setOnChainTokens] = useState<Record<string, { name: string; symbol: string; decimals: number; totalSupply: string }>>({});

  useEffect(() => {
    if (!publicClient || deployedTokens.length === 0) return;
    const run = async () => {
      const entries = await Promise.all(
        deployedTokens.map(async (token) => {
          const metadata = await fetchTokenOnChainMetadata(publicClient, token.address as `0x${string}`);
          return [token.address.toLowerCase(), metadata ?? { name: token.name, symbol: token.symbol, decimals: token.decimals, totalSupply: token.totalSupply }];
        })
      );
      setOnChainTokens(Object.fromEntries(entries));
    };
    void run();
  }, [publicClient, deployedTokens]);
  
  // Build token list from real data
  const TOKENS = useMemo<Token[]>(() => {
    const baseTokens = BASE_TOKENS.map((token, index) => {
      const priceData = dexPrices[token.address.toLowerCase()];
      const price = getPriceWithFallback(token.address, priceData);
      const change = priceData?.priceChange24h ?? 0;
      const volume = priceData?.volume24h ?? 0;
      const liquidity = priceData?.liquidity ?? 0;
      const fdv = priceData?.fdv ?? 0;
      
      return {
        rank: index + 1,
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        logo: token.logo,
        price,
        change,
        vol: formatNumber(volume),
        mc: formatNumber(fdv),
        liq: formatNumber(liquidity),
        holders: '—',
        verified: true,
        b20: true,
        positive: change >= 0,
      };
    });

    const deployed = deployedTokens.map((token, index) => {
      const metadata = onChainTokens[token.address.toLowerCase()];
      const priceData = dexPrices[token.address.toLowerCase()];
      const price = getPriceWithFallback(token.address, priceData);
      const change = priceData?.priceChange24h ?? 0;
      const volume = priceData?.volume24h ?? 0;
      const liquidity = priceData?.liquidity ?? 0;
      const fdv = priceData?.fdv ?? 0;

      return {
        rank: baseTokens.length + index + 1,
        symbol: metadata?.symbol || token.symbol,
        name: metadata?.name || token.name,
        address: token.address,
        logo: token.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata?.symbol || token.symbol)}&background=111B22&color=14B8A6&rounded=true`,
        price,
        change,
        vol: formatNumber(volume),
        mc: formatNumber(fdv),
        liq: formatNumber(liquidity),
        holders: '—',
        verified: true,
        b20: true,
        positive: change >= 0,
      };
    });

    return [...baseTokens, ...deployed];
  }, [dexPrices, deployedTokens, onChainTokens]);

  const filtered = TOKENS.filter(t =>
    !debouncedQ ||
    t.symbol.toLowerCase().includes(debouncedQ.toLowerCase()) ||
    t.name.toLowerCase().includes(debouncedQ.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTokens = filtered.slice(startIndex, endIndex);

  const toggleWatch = (s: string) => {
    setWatched((w) => {
      const n = new Set(w);
      if (n.has(s)) {
        n.delete(s);
      } else {
        n.add(s);
      }
      return n;
    });
  };

  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalVolume = TOKENS.reduce((sum, t) => {
      const vol = parseFloat(t.vol.replace(/[$KMB]/g, ''));
      const multiplier = t.vol.includes('M') ? 1000000 : t.vol.includes('K') ? 1000 : 1;
      return sum + (vol * multiplier);
    }, 0);
    
    return {
      totalTokens: TOKENS.length.toString(),
      volume24h: formatNumber(totalVolume),
      b20Tokens: TOKENS.filter(t => t.b20).length.toString(),
      new7d: '—', // Would need historical data
    };
  }, [TOKENS]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 animate-fade-in">
        <div className="bg-[#131720] border border-[#1e2535] rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-[#14B8A6]/30 border-t-[#14B8A6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8892a4] text-sm">Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in space-y-4 sm:space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D5A6A]" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search token name or symbol..."
            className="w-full bg-[#111B22] border border-[#1B2A32] rounded-xl pl-9 pr-4 h-10 text-sm text-white placeholder-[#3D5A6A] focus:border-[#14B8A6]/50 focus:ring-1 focus:ring-[#14B8A6]/10 outline-none hover:border-[#253C48] transition-all" />
        </div>
        <div className="flex bg-[#0A1520] rounded-xl p-1 border border-[#1B2A32] overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                tab === t.id ? 'bg-[#111B22] text-white border border-[#1B2A32] shadow-sm' : 'text-[#6B8A99] hover:text-white'
              )}>{t.label}</button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 h-10 bg-[#111B22] border border-[#1B2A32] rounded-xl text-[#6B8A99] hover:text-white hover:border-[#253C48] text-sm transition-all shrink-0">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Tokens',     value: stats.totalTokens },
          { label:'24H Trade Volume', value: stats.volume24h },
          { label:'B20 Tokens',       value: stats.b20Tokens },
          { label:'New (7D)',         value: stats.new7d },
        ].map(s => (
          <div key={s.label} className="bg-[#111B22] border border-[#1B2A32] rounded-xl px-4 py-3">
            <p className="text-[#3D5A6A] text-xs mb-0.5">{s.label}</p>
            <p className="text-white text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#1B2A32]">
              {['#','Token','Price','24H','Volume','Market Cap','Liquidity','Chart',''].map(h => (
                <th key={h} className="px-4 sm:px-5 py-3.5 text-left text-[#3D5A6A] text-xs font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1B2A32]">
              {currentTokens.map(t => (
                <tr key={t.symbol} className="hover:bg-[#0f1e2a] transition-colors group cursor-pointer">
                  <td className="px-4 sm:px-5 py-3.5 text-[#3D5A6A] text-sm w-10">{t.rank}</td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#162535] border border-[#253C48] overflow-hidden shrink-0">
                        <img
                          src={t.logo}
                          alt={t.symbol}
                          className="w-full h-full object-cover"
                          onError={(event) => {
                            const img = event.currentTarget;
                            img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.symbol)}&background=111B22&color=14B8A6&rounded=true`;
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-bold">{t.symbol}</span>
                          {t.verified && <span title="Verified" className="text-[#14B8A6] text-xs">✓</span>}
                          {t.b20 && <Badge variant="blue">B20</Badge>}
                        </div>
                        <p className="text-[#3D5A6A] text-xs hidden sm:block">{t.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 text-white text-sm font-semibold font-mono">
                    ${t.price < 0.0001 ? t.price.toExponential(2) : t.price.toLocaleString('en',{maximumSignificantDigits:5})}
                  </td>
                  <td className="px-4 sm:px-5 py-3.5"><ChangeTag value={t.change} /></td>
                  <td className="px-4 sm:px-5 py-3.5 text-[#6B8A99] text-sm hidden sm:table-cell">{t.vol}</td>
                  <td className="px-4 sm:px-5 py-3.5 text-[#6B8A99] text-sm hidden md:table-cell">{t.mc}</td>
                  <td className="px-4 sm:px-5 py-3.5 text-[#6B8A99] text-sm hidden lg:table-cell">{t.liq}</td>
                  <td className="px-4 sm:px-5 py-3.5 w-16"><MiniChart positive={t.positive} height={28} /></td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleWatch(t.symbol)}
                        className={clsx('transition-colors', watched.has(t.symbol) ? 'text-[#f59e0b]' : 'text-[#3D5A6A] hover:text-[#f59e0b]')}>
                        <Star className="w-4 h-4" fill={watched.has(t.symbol) ? '#f59e0b' : 'none'} />
                      </button>
                      <a href={`https://basescan.org/token/${t.address}`} target="_blank" rel="noopener noreferrer"
                        className="text-[#3D5A6A] hover:text-[#2dd4bf] transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#1B2A32] flex items-center justify-between">
          <span className="text-[#3D5A6A] text-xs">
            Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} tokens
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs bg-[#0A1520] border border-[#1B2A32] rounded-lg text-[#6B8A99] hover:text-white hover:border-[#253C48] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={clsx(
                      'w-8 h-8 text-xs font-bold rounded-lg transition-all',
                      currentPage === page
                        ? 'bg-[#14B8A6] text-white'
                        : 'bg-[#0A1520] border border-[#1B2A32] text-[#6B8A99] hover:text-white hover:border-[#253C48]'
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs bg-[#0A1520] border border-[#1B2A32] rounded-lg text-[#6B8A99] hover:text-white hover:border-[#253C48] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
