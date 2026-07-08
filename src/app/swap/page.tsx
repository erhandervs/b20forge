'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowUpDown, Settings, TrendingUp, CheckCircle, Zap, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FullChart, generateChartData } from '@/components/charts/MiniChart';

// Import real tokens
import { BASE_TOKENS } from '@/lib/constants';
import { useAccount, useBalance } from 'wagmi';
import { useMultipleTokenBalances } from '@/lib/web3-hooks';
import { useDexPrices, getPriceWithFallback, useHistoricalPrices } from '@/lib/dex-price-api';
import { useSwapQuotes, type SwapQuoteResult } from '@/hooks/useSwapQuotes';
import { useSwapExecution } from '@/hooks/useSwapExecution';
import { useTokenApproval } from '@/lib/web3-hooks';
import { AERODROME_ROUTER_ADDRESS } from '@/lib/aerodrome-router';
import type { Address } from 'viem';

// Create token type that includes balance and price
type SwapToken = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  price: number;
  balance: number;
  color: string;
  logo: string;
};

// Remove old ROUTES constant - we'll get dynamic routes from DEX aggregator

type Period = '1D' | '1W' | '1M' | '3M';

const PERIOD_DAYS: Record<Period, number> = { '1D': 1, '1W': 7, '1M': 30, '3M': 90 };

const DEX_LOGOS: Record<string, string> = {
  wrap: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  aerodrome: 'https://assets.coingecko.com/coins/images/31745/standard/token.png',
  uniswap: 'https://assets.coingecko.com/coins/images/12504/standard/uni.jpg',
  sushiswap: 'https://assets.coingecko.com/coins/images/12271/standard/512x512_Logo_no_chop.png',
  pancakeswap: 'https://assets.coingecko.com/coins/images/12632/standard/pancakeswap-cake-logo_%281%29.png',
};

function formatDexName(value?: string) {
  if (!value) return 'DEX';
  return value
    .replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function TokenSelect({
  token,
  onChange,
  tokens,
}: {
  token: SwapToken;
  onChange: (t: SwapToken) => void;
  tokens: SwapToken[];
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const closeTokenSelect = useCallback(() => {
    setSearchQuery('');
    setOpen(false);
  }, []);

  // Filter tokens based on search (by symbol, name, or address)
  const filteredTokens = useMemo(() => {
    let result = tokens;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.address.toLowerCase().includes(query)
      );
    }
    
    // Sort: tokens with balance first, then by balance amount descending
    return [...result].sort((a, b) => {
      if (a.balance > 0 && b.balance === 0) return -1;
      if (a.balance === 0 && b.balance > 0) return 1;
      if (a.balance > 0 && b.balance > 0) {
        return (b.balance * b.price) - (a.balance * a.price); // Sort by USD value
      }
      return 0;
    });
  }, [tokens, searchQuery]);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-[#162535] border border-[#253C48] hover:border-[#14B8A6]/40 rounded-xl px-3 py-2 transition-all shrink-0"
      >
        <img 
          src={token.logo} 
          alt={token.symbol} 
          className="w-6 h-6 rounded-full"
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=${token.color.replace('#', '')}&color=fff&size=128`;
          }}
        />
        <span className="text-white text-sm font-bold">{token.symbol}</span>
        <svg className="w-3.5 h-3.5 text-[#6B8A99]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999]" onClick={closeTokenSelect} />
          
          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-[90vw] max-w-md bg-[#1a1f2e] border border-[#2a3348] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#2a3348]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">Select Token</h3>
                <button 
                  onClick={closeTokenSelect}
                  className="text-[#6B8A99] hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D5A6A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, symbol or paste address"
                  className="w-full bg-[#0f1520] border border-[#2a3348] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#3D5A6A] focus:border-[#14B8A6]/50 focus:ring-1 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Token List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredTokens.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-[#6B8A99] text-sm">No tokens found</p>
                  <p className="text-[#3D5A6A] text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                filteredTokens.map(t => (
                  <button
                    key={t.address}
                    onClick={() => { onChange(t); setOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0f1520] transition-colors text-left border-b border-[#2a3348] last:border-b-0',
                      t.symbol === token.symbol && 'bg-[#0f1520]'
                    )}
                  >
                    <img 
                      src={t.logo} 
                      alt={t.symbol} 
                      className="w-9 h-9 rounded-full shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${t.symbol}&background=${t.color.replace('#', '')}&color=fff&size=128`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{t.symbol}</p>
                      <p className="text-[#3D5A6A] text-xs truncate">{t.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">
                        {t.balance > 0 ? t.balance.toFixed(6) : '0'}
                      </p>
                      {t.balance > 0 && (
                        <p className="text-[#3D5A6A] text-xs">
                          ${(t.balance * t.price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  
  // Get native ETH balance
  const { data: ethBalance } = useBalance({ address });
  
  // Get ERC20 token balances
  const tokensForBalance = useMemo(() => 
    BASE_TOKENS.map(t => ({ address: t.address, decimals: t.decimals })),
    []
  );
  const { balances, isLoading: isLoadingBalances, refetch: refetchBalances } = useMultipleTokenBalances(
    tokensForBalance,
    address
  );
  
  // Fetch real prices from DexScreener
  const tokenAddresses = useMemo(() => BASE_TOKENS.map(t => t.address), []);
  const { prices: dexPrices, isLoading: isLoadingPrices } = useDexPrices(tokenAddresses);
  
  // DEX aggregator hooks
  const { 
    executeSwap,
    isPending: isSwapPending,
    isConfirming: isSwapConfirming,
    isSuccess: isSwapSuccess,
    isError: isSwapError,
  } = useSwapExecution();
  
  // Token approval hook
  const {
    approve,
    isPending: isApprovePending,
    isConfirming: isApproveConfirming,
  } = useTokenApproval();

  const [storedBalances, setStoredBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!address || !balances) {
        setStoredBalances({});
        return;
      }

      setStoredBalances(prev => {
        const next = { ...prev };
        BASE_TOKENS.forEach((token, index) => {
          const raw = typeof balances[index] !== 'undefined' ? parseFloat(balances[index]) : undefined;
          if (typeof raw === 'number') {
            next[token.address] = raw;
          }
        });
        return next;
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [balances, address]);

  const TOKENS = useMemo<SwapToken[]>(() => {
    const ethValue = ethBalance ? parseFloat(ethBalance.formatted) : 0;
    const wethPrice = getPriceWithFallback(BASE_TOKENS[0].address, dexPrices[BASE_TOKENS[0].address.toLowerCase()]);
    // Use last known balances to avoid brief flashes when balances are loading.
    const tokenList = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        price: wethPrice,
        balance: address ? ethValue : 0, // Only show balance if connected
        color: '#627eea',
        logo: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
      },
      ...BASE_TOKENS.map((token, index) => {
        const raw = address && !isLoadingBalances && balances && typeof balances[index] !== 'undefined'
          ? parseFloat(balances[index])
          : undefined;
        const last = storedBalances[token.address] ?? 0;
        const finalBalance = typeof raw === 'number' ? raw : last;

        return {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          decimals: token.decimals,
          price: getPriceWithFallback(token.address, dexPrices[token.address.toLowerCase()]),
          balance: finalBalance,
          color: token.color,
          logo: token.logo,
        };
      }),
    ];
    
    return tokenList;
  }, [address, ethBalance, balances, dexPrices, storedBalances, isLoadingBalances]);

  // Keep previous stable rate to avoid 1s flicker on reload
  const [stableRate, setStableRate] = useState<number>(0);
  
  const [fromToken, setFromToken]         = useState<SwapToken | null>(null);
  const [toToken, setToToken]             = useState<SwapToken | null>(null);
  const [fromAmount, setFromAmount]       = useState('');
  const [slippage, setSlippage]           = useState('0.5');
  const [showSettings, setShowSettings]   = useState(false);
  const [swapDone, setSwapDone]           = useState(false);
  const [period, setPeriod]               = useState<Period>('1W');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [swapStep, setSwapStep]           = useState<'idle' | 'approving' | 'swapping'>('idle');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  
  const { data: quoteRoutes, isLoading: isLoadingRoutes } = useSwapQuotes({
    tokenIn: fromToken ? { address: fromToken.address, decimals: fromToken.decimals } : null,
    tokenOut: toToken ? { address: toToken.address, decimals: toToken.decimals } : null,
    amountIn: fromAmount,
    enabled: Boolean(fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0),
  });

  const quoteRoutesList = useMemo<SwapQuoteResult[]>(() => quoteRoutes ?? [], [quoteRoutes]);

  const selectedRouteIndexClamped = useMemo(() => {
    if (quoteRoutesList.length === 0) return 0;
    return Math.min(selectedRouteIndex, quoteRoutesList.length - 1);
  }, [quoteRoutesList, selectedRouteIndex]);

  const selectedQuote = useMemo(
    () => quoteRoutes?.[selectedRouteIndexClamped] ?? quoteRoutes?.[0] ?? null,
    [quoteRoutes, selectedRouteIndexClamped]
  );

  const selectedRoute = selectedQuote;

  // Reset success state after showing
  useEffect(() => {
    if (!isSwapSuccess) {
      return;
    }

    let successTimer: number | undefined;

    const timer = window.setTimeout(() => {
      setSwapDone(true);
      setNeedsApproval(false);
      setFromAmount('');

      void (async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          refetchBalances();
        }
      })();

      successTimer = window.setTimeout(() => {
        setSwapDone(false);
        setSwapStep('idle');
      }, 4000);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (successTimer !== undefined) {
        window.clearTimeout(successTimer);
      }
    };
  }, [isSwapSuccess, refetchBalances]);

  useEffect(() => {
    if (!isSwapConfirming) {
      return;
    }

    const interval = setInterval(() => {
      refetchBalances();
    }, 1000);

    return () => clearInterval(interval);
  }, [isSwapConfirming, refetchBalances]);

  // Initialize tokens once data is loaded - Set ETH and USDC as defaults
  useEffect(() => {
    if (TOKENS.length === 0) {
      return;
    }

      const timer = window.setTimeout(() => {
        if (fromToken) {
          const updatedFromToken = TOKENS.find(t => t.symbol === fromToken.symbol);
          if (updatedFromToken && updatedFromToken.balance !== fromToken.balance) {
            setFromToken(updatedFromToken);
          }
        }

        if (toToken) {
          const updatedToToken = TOKENS.find(t => t.symbol === toToken.symbol);
          if (updatedToToken && updatedToToken.balance !== toToken.balance) {
            setToToken(updatedToToken);
          }
        }

        if (!fromToken && !toToken) {
          const ethToken = TOKENS.find(t => t.symbol === 'ETH');
          const usdcToken = TOKENS.find(t => t.symbol === 'USDC');

          if (ethToken && usdcToken) {
            setFromToken(ethToken);
            setToToken(usdcToken);
          }
        }
      }, 0);

      return () => clearTimeout(timer);
    }, [TOKENS, fromToken, toToken]);

  const fromPrice = fromToken?.price || 0;
  const toPrice = toToken?.price || 0;
  const rate = (fromToken && toToken && toPrice > 0) ? fromPrice / toPrice : 0;
  const displayedRate = stableRate > 0 && (isLoadingPrices || rate === 0) ? stableRate : rate;
  useEffect(() => {
    if (!isLoadingPrices && rate > 0) {
      const timer = window.setTimeout(() => {
        setStableRate(rate);
      }, 0);

      return () => clearTimeout(timer);
    }

    return;
  }, [isLoadingPrices, rate]);

  const parsedFromAmount = parseFloat(fromAmount || '0');
  const selectedQuoteAmount = selectedQuote ? parseFloat(selectedQuote.amountOutFormatted) : 0;
  const selectedRouteAmount = selectedRoute ? selectedQuoteAmount : 0;
  const minReceivedAmount = selectedRouteAmount > 0
    ? selectedRouteAmount * (1 - parseFloat(slippage) / 100)
    : 0;
  const hasValidRate = parsedFromAmount > 0 && displayedRate > 0;
  const routeAmount = selectedQuoteAmount > 0
    ? selectedQuoteAmount
    : hasValidRate
      ? parsedFromAmount * displayedRate
      : 0;

  const toAmountRaw = (fromAmount && fromToken && toToken && routeAmount > 0)
    ? routeAmount
    : 0;
  const toAmount = fromAmount && routeAmount > 0
    ? toAmountRaw.toLocaleString('en', { maximumFractionDigits: 6 })
    : '';
  const minReceivedText = minReceivedAmount > 0
    ? (minReceivedAmount < 0.000001
      ? minReceivedAmount.toExponential(4)
      : minReceivedAmount.toFixed(toToken?.decimals ?? 6))
    : '0.0';
  const fromUsd = (fromAmount && fromToken) ? `≈ $${(parseFloat(fromAmount) * fromPrice).toFixed(2)}` : '';
  const toUsd = (toAmount && toToken) ? `≈ $${(toAmountRaw * toPrice).toFixed(2)}` : '';

  
  // Fetch real historical data from CoinGecko
  // Map ETH native address to WETH for CoinGecko
  const chartTokenAddress = fromToken?.address === '0x0000000000000000000000000000000000000000' 
    ? '0x4200000000000000000000000000000000000006' // Use WETH for ETH
    : fromToken?.address;

  const currentChartPrice = useMemo(() => {
    if (!fromToken || !toToken) return 0;
    return fromPrice > 0 && toPrice > 0 ? fromPrice / toPrice : 0;
  }, [fromPrice, toPrice, fromToken, toToken]);
    
  const { data: historicalData } = useHistoricalPrices(
    chartTokenAddress || null,
    PERIOD_DAYS[period]
  );
  
  // Use real historical data if available, otherwise generate fallback
  const chartData = useMemo(() => {
    if (historicalData && historicalData.length > 0) {
      // Use real data from API
      return historicalData;
    }
    
    // Fallback: generate simulated data
    if (!fromToken || !toToken) return [];
    
    const currentRate = currentChartPrice > 0 ? currentChartPrice : (fromToken.price / (toToken.price || 1));
    const days = PERIOD_DAYS[period];
    const dataPoints = period === '1D' ? 24 : days;
    const volatility = period === '1D' ? 0.01 : period === '1W' ? 0.03 : period === '1M' ? 0.06 : 0.10;
    
    return generateChartData(dataPoints, currentRate, volatility);
  }, [historicalData, fromToken, toToken, currentChartPrice, period]);

  const flip = useCallback(() => {
    if (!fromToken || !toToken) return;
    const tmp = fromToken;
    setFromToken(toToken);
    setToToken(tmp);
    setFromAmount(toAmount.replace(/,/g, ''));
  }, [fromToken, toToken, toAmount]);

  const doSwap = async () => {
    if (!isConnected || !address || !fromToken || !toToken || !fromAmount || !selectedRoute) {
        if (!selectedRoute) {
          console.warn('Swap blocked: no route available for the selected pair or amount.');
        }
        return;
      }
    try {
      const isFromETH = fromToken.address === '0x0000000000000000000000000000000000000000';
      const requiresApproval = !isFromETH && selectedRoute?.dex !== 'wrap';

      if (requiresApproval) {
        setNeedsApproval(true);
        setSwapStep('approving');

        const routerAddress = AERODROME_ROUTER_ADDRESS as Address;
        const MAX_APPROVAL = '1000000000000000000000000000000';

        await approve(
          fromToken.address as Address,
          routerAddress,
          MAX_APPROVAL,
          fromToken.decimals
        );

        setNeedsApproval(false);
      }
      
      // Proceed with swap on best DEX
      setSwapStep('swapping');

      if (!selectedRoute) {
        throw new Error('No quote available for swap')
      }

      await executeSwap({
        tokenIn: { address: fromToken.address, decimals: fromToken.decimals },
        tokenOut: { address: toToken.address, decimals: toToken.decimals },
        amountIn: fromAmount,
        quote: selectedRoute,
        slippage: parseFloat(slippage),
      });
    } catch (error) {
      console.error('Swap error:', error);
      setSwapStep('idle');
      setNeedsApproval(false);
    }
  };
  
  if (!fromToken || !toToken) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">

        {/* Swap card - 2 cols */}
        <div className="xl:col-span-2 order-2 xl:order-1">
          <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl p-4 sm:p-5">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-base">Swap</h2>
                <Badge variant="blue" dot>Base</Badge>
              </div>
              <button
                onClick={() => setShowSettings(s => !s)}
                className={clsx(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all border',
                  showSettings
                    ? 'bg-[#14B8A6]/15 border-[#14B8A6]/30 text-[#2dd4bf]'
                    : 'bg-transparent border-transparent text-[#6B8A99] hover:bg-[#162535] hover:border-[#253C48] hover:text-white'
                )}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Slippage panel */}
            {showSettings && (
              <div className="mb-4 bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4 space-y-3">
                <p className="text-[#6B8A99] text-xs font-semibold uppercase tracking-wider">Slippage Tolerance</p>
                <div className="flex gap-2">
                  {['0.1', '0.5', '1.0'].map(v => (
                    <button
                      key={v}
                      onClick={() => setSlippage(v)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        slippage === v
                          ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-[#2dd4bf]'
                          : 'bg-transparent border-[#1B2A32] text-[#6B8A99] hover:border-[#253C48]'
                      )}
                    >
                      {v}%
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Custom"
                    className="flex-1 bg-transparent border border-[#1B2A32] rounded-lg px-2 py-1.5 text-xs text-white placeholder-[#3D5A6A] focus:border-[#14B8A6]/50 outline-none"
                    onChange={e => setSlippage(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* From */}
            <div className="bg-[#0A1520] border border-[#1B2A32] hover:border-[#253C48] focus-within:border-[#14B8A6]/40 rounded-xl p-4 transition-all mb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#6B8A99] text-xs">You Pay</span>
                {isConnected && (
                  <span className="text-[#3D5A6A] text-xs">
                    Balance: {isLoadingBalances ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : fromToken.balance < 0.000001 && fromToken.balance > 0 ? (
                      '< 0.000001'
                    ) : (
                      fromToken.balance.toFixed(6)
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={e => {
                    const value = e.target.value;
                    // Limit to 6 decimal places
                    if (value.includes('.')) {
                      const decimal = value.split('.')[1];
                      if (decimal && decimal.length > 6) {
                        return; // Don't update if more than 6 decimals
                      }
                    }
                    setFromAmount(value);
                  }}
                  onInput={e => {
                    const input = e.currentTarget;
                    const value = input.value;
                    // Force limit to 6 decimal places
                    if (value.includes('.')) {
                      const decimal = value.split('.')[1];
                      if (decimal && decimal.length > 6) {
                        input.value = `${value.split('.')[0]}.${decimal.slice(0, 6)}`;
                        setFromAmount(input.value);
                      }
                    }
                  }}
                  step="0.000001"
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-[#1B2A32] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                />
                <TokenSelect token={fromToken} onChange={setFromToken} tokens={TOKENS} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#3D5A6A] text-xs">{fromUsd}</span>
                <div className="flex gap-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      onClick={() => {
                        const amount = (fromToken.balance * pct) / 100;
                        // Limit to 6 decimal places
                        const limited = Math.floor(amount * 1000000) / 1000000;
                        setFromAmount(limited.toString());
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-[#162535] hover:bg-[#14B8A6]/20 border border-[#253C48] hover:border-[#14B8A6]/40 rounded text-[#6B8A99] hover:text-[#14B8A6] transition-all"
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Flip button */}
            <div className="flex justify-center my-1">
              <button
                onClick={flip}
                className="w-9 h-9 rounded-xl bg-[#162535] border border-[#253C48] hover:border-[#14B8A6]/40 hover:bg-[#14B8A6]/10 flex items-center justify-center text-[#6B8A99] hover:text-[#2dd4bf] transition-all active:scale-95"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            {/* To */}
            <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4 mt-1 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#6B8A99] text-xs">You Receive (estimated)</span>
                {isConnected && (
                  <span className="text-[#3D5A6A] text-xs">
                    Balance: {isLoadingBalances ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : toToken.balance < 0.000001 && toToken.balance > 0 ? (
                      '< 0.000001'
                    ) : (
                      toToken.balance.toFixed(6)
                    )} {toToken.symbol}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-2xl font-bold text-white min-w-0 truncate">
                  {toAmount || <span className="text-[#1B2A32]">0.0</span>}
                </div>
                <TokenSelect token={toToken} onChange={setToToken} tokens={TOKENS} />
              </div>
              <span className="text-[#3D5A6A] text-xs mt-2 block">{toUsd}</span>
            </div>

            {/* Route summary */}
            {fromAmount && selectedRoute && (
              <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B8A99]">Best route</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#162535] text-[10px] grid place-items-center overflow-hidden">
                      <img
                        src={DEX_LOGOS[selectedRoute.dex] || DEX_LOGOS.wrap}
                        alt={selectedRoute.dexName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = DEX_LOGOS.wrap;
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold">{formatDexName(selectedRoute.dexName)}</span>
                    <Badge variant="green">Best Price</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#6B8A99]">You get</span>
                  <span className="text-white font-mono font-semibold">
                    {selectedRoute.amountOutFormatted} {toToken.symbol}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#6B8A99]">Rate</span>
                  <span className="text-white font-mono">
                    1 {fromToken.symbol} = {displayedRate.toFixed(4)} {toToken.symbol}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#6B8A99]">Price impact</span>
                  <span
                    className={clsx(
                      'font-semibold',
                      selectedRoute.priceImpact < 1
                        ? 'text-[#10B981]'
                        : selectedRoute.priceImpact < 3
                        ? 'text-[#f59e0b]'
                        : 'text-[#ff4d6a]'
                    )}
                  >
                    ~{selectedRoute.priceImpact.toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#6B8A99]">Min. received</span>
                  <span className="text-white">
                    {minReceivedText} {toToken.symbol}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#6B8A99]">Est. gas</span>
                  <span className="text-white">~200K</span>
                </div>
              </div>
            )}

            {/* Swap button */}
            {swapDone ? (
              <div className="flex items-center justify-center gap-2 h-12 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl text-[#10B981] font-semibold text-sm">
                <CheckCircle className="w-4 h-4" /> Swap successful!
              </div>
            ) : isSwapError ? (
              <div className="flex items-center justify-center gap-2 h-12 bg-[#ff4d6a]/10 border border-[#ff4d6a]/30 rounded-xl text-[#ff4d6a] font-semibold text-sm">
                <AlertCircle className="w-4 h-4" /> Swap failed
              </div>
            ) : (
              <Button
                fullWidth
                size="lg"
                onClick={doSwap}
                loading={isSwapPending || isSwapConfirming || isApprovePending || isApproveConfirming}
                disabled={!fromAmount || parseFloat(fromAmount) <= 0 || !isConnected || !selectedRoute}
                icon={<Zap className="w-4 h-4" />}
              >
                {!isConnected
                  ? 'Connect Wallet'
                  : !fromAmount
                  ? 'Enter Amount'
                  : swapStep === 'approving'
                  ? 'Approving...'
                  : swapStep === 'swapping'
                  ? 'Swapping...'
                  : needsApproval && fromToken?.address !== '0x0000000000000000000000000000000000000000'
                  ? 'Approve & Swap'
                  : `Swap ${fromToken?.symbol} -> ${toToken?.symbol}`}
              </Button>
            )}
          </div>
        </div>

        {/* Chart panel - 3 cols */}
        <div className="xl:col-span-3 order-1 xl:order-2 bg-[#111B22] border border-[#1B2A32] rounded-2xl p-4 sm:p-5 flex flex-col">

          {/* Chart header */}
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex">
                  <img 
                    src={fromToken.logo} 
                    alt={fromToken.symbol} 
                    className="w-6 h-6 rounded-full border-2 border-[#111B22]"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${fromToken.symbol}&background=${fromToken.color.replace('#', '')}&color=fff&size=128`;
                    }}
                  />
                  <img 
                    src={toToken.logo} 
                    alt={toToken.symbol} 
                    className="w-6 h-6 rounded-full -ml-1.5 border-2 border-[#111B22]"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${toToken.symbol}&background=${toToken.color.replace('#', '')}&color=fff&size=128`;
                    }}
                  />
                </div>
                <span className="text-white text-sm font-bold">
                  {fromToken.symbol} / {toToken.symbol}
                </span>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-white text-2xl font-bold">
                  {rate > 0 ? rate.toLocaleString('en', { maximumSignificantDigits: 6 }) : '-'}
                </span>
                <span className="text-[#3D5A6A] text-sm">{toToken.symbol}</span>
                {chartData.length > 1 && (() => {
                  const firstValue = chartData[0].value;
                  const lastValue = chartData[chartData.length - 1].value;
                  const change = ((lastValue - firstValue) / firstValue) * 100;
                  const isPositive = change >= 0;
                  return (
                    <Badge variant={isPositive ? 'green' : 'red'}>
                      {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </Badge>
                  );
                })()}
              </div>
            </div>

            {/* Period picker */}
            <div className="flex bg-[#0A1520] rounded-lg p-0.5 border border-[#1B2A32]">
              {(['1D', '1W', '1M', '3M'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                    period === p
                      ? 'bg-[#1a2f3a] text-white shadow-sm'
                      : 'text-[#6B8A99] hover:text-white'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-[180px]">
            <FullChart data={chartData} color="#14B8A6" height={220} showAxes showTooltip />
          </div>

          {/* Route selector */}
          <div className="mt-4 pt-4 border-t border-[#1B2A32]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-[#2dd4bf]" />
              <span className="text-white text-xs font-semibold">Route Comparison</span>
              <Badge variant="blue">Live Quotes</Badge>
            </div>
            {isLoadingRoutes ? (
              <div className="flex items-center justify-center py-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#14B8A6] animate-pulse" />
                  <span className="text-[#3D5A6A] text-xs">Finding best rates...</span>
                </div>
              </div>
            ) : quoteRoutesList.length > 0 ? (
              <div className="space-y-2">
                {quoteRoutesList.map((route, i) => (
                  <button
                    key={`${route.dex}-${i}`}
                    onClick={() => setSelectedRouteIndex(i)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-150 text-left',
                      selectedRouteIndex === i
                        ? 'bg-[#14B8A6]/12 border-[#14B8A6]/40 shadow-lg shadow-[#14B8A6]/10'
                        : 'bg-[#0A1520] border-[#1B2A32] hover:border-[#253C48] hover:bg-[#111B22]'
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg shrink-0 bg-[#162535] flex items-center justify-center overflow-hidden">
                      <img
                        src={DEX_LOGOS[route.dex] || DEX_LOGOS.wrap}
                        alt={route.dexName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white text-xs font-semibold truncate">{formatDexName(route.dexName)}</span>
                        {i === 0 && <Badge variant="green">Best</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className="text-[#3D5A6A]">
                          Output: <span className="text-[#6B8A99] font-semibold">{parseFloat(route.amountOutFormatted).toFixed(6)}</span>
                        </span>
                        <span className="text-[#3D5A6A]">
                          Fee: <span className="text-[#6B8A99]">{route.fee}</span>
                        </span>
                      </div>
                    </div>
                    <div
                      className={clsx(
                        'w-3 h-3 rounded-full border-2 shrink-0 transition-all',
                        selectedRouteIndex === i
                          ? 'border-[#14B8A6] bg-[#14B8A6]'
                          : 'border-[#253C48]'
                      )}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#6B8A99] text-xs">Enter amount to see routes</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
