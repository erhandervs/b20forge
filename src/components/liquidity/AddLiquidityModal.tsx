/**
 * Add Liquidity Modal Component
 * DEX-agnostic likidite ekleme modali
 */

/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ArrowUpDown, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Address } from 'viem';
import type { PoolInfo, DexId } from '@/lib/protocols';
import { BASE_TOKENS } from '@/lib/constants';
import { useAccount, useBalance } from 'wagmi';
import { useMultipleTokenBalances } from '@/lib/web3-hooks';
import { useDexPrices, getPriceWithFallback } from '@/lib/dex-price-api';
import { addStoredLiquidityPosition } from '@/lib/liquidity-hooks';
import { useLiquidityService } from '@/hooks/useB20SDK';
import type { PositionInfo } from '@/lib/protocols';

interface Token {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  logo: string;
  price: number;
  balance: number;
}

interface AddLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPool?: PoolInfo | null;
  selectedDex: DexId;
}

export function AddLiquidityModal({
  isOpen,
  onClose,
  selectedPool,
  selectedDex,
}: AddLiquidityModalProps) {
  const { address, isConnected } = useAccount();
  const liquidityService = useLiquidityService();
  
  // Token data
  const { data: ethBalance } = useBalance({ address });
  const tokensForBalance = useMemo(() => 
    BASE_TOKENS.map(t => ({ address: t.address, decimals: t.decimals })),
    []
  );
  const { balances } = useMultipleTokenBalances(tokensForBalance, address);
  const tokenAddresses = useMemo(() => BASE_TOKENS.map(t => t.address), []);
  const { prices: dexPrices } = useDexPrices(tokenAddresses);

  // Build token list
  const TOKENS = useMemo<Token[]>(() => {
    const ethValue = ethBalance ? parseFloat(ethBalance.formatted) : 0;
    const wethPrice = getPriceWithFallback(BASE_TOKENS[0].address, dexPrices[BASE_TOKENS[0].address.toLowerCase()]);

    return [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000' as Address,
        decimals: 18,
        price: wethPrice,
        balance: address ? ethValue : 0,
        logo: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
      },
      ...BASE_TOKENS.map((token, index) => {
        const raw = address && balances && typeof balances[index] !== 'undefined'
          ? parseFloat(balances[index])
          : undefined;
        const finalBalance = typeof raw === 'number' ? raw : 0;

        return {
          symbol: token.symbol,
          name: token.name,
          address: token.address as Address,
          decimals: token.decimals,
          price: getPriceWithFallback(token.address, dexPrices[token.address.toLowerCase()]),
          balance: finalBalance,
          logo: token.logo,
        };
      }),
    ];
  }, [address, ethBalance, balances, dexPrices]);

  // Modal state
  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [feeTier, setFeeTier] = useState('0.30%');
  const [priceRangeMode, setPriceRangeMode] = useState<'full' | 'custom'>('full');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'adding'>('idle');
  const [txSuccess, setTxSuccess] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Initialize tokens from selected pool
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedPool && Array.isArray(TOKENS) && TOKENS.length > 0) {
        const t0 = TOKENS.find(t => t.address.toLowerCase() === selectedPool.token0.address.toLowerCase());
        const t1 = TOKENS.find(t => t.address.toLowerCase() === selectedPool.token1.address.toLowerCase());
        if (t0) setToken0(t0);
        if (t1) setToken1(t1);
      } else if (Array.isArray(TOKENS) && TOKENS.length > 0 && !token0 && !token1) {
        // Default: ETH and USDC
        const eth = TOKENS.find(t => t.symbol === 'ETH');
        const usdc = TOKENS.find(t => t.symbol === 'USDC');
        if (eth) setToken0(eth);
        if (usdc) setToken1(usdc);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedPool, TOKENS, token0, token1]);

  // Auto-calculate amount1 based on price ratio
  const rate = useMemo(() => {
    if (!token0 || !token1 || token1.price === 0) return 0;
    return token0.price / token1.price;
  }, [token0, token1]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (amount0 && !isNaN(+amount0) && rate > 0) {
        const calculated = (+amount0 * rate).toFixed(6);
        setAmount1(calculated);
      } else {
        setAmount1('');
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [amount0, rate]);

  // Modal lifecycle
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwapTokens = () => {
    const temp = token0;
    setToken0(token1);
    setToken1(temp);
    const tempAmount = amount0;
    setAmount0(amount1);
    setAmount1(tempAmount);
  };

  const handleSubmit = async () => {
    if (!isConnected || !address || !token0 || !token1 || !amount0 || !amount1) {
      return;
    }

    try {
      setStep('approving');
      setTxError(null);
      
      if (!liquidityService) {
        throw new Error('Liquidity service not available');
      }

      // Add liquidity using real service
      const result = await liquidityService.addLiquidity(selectedDex, {
        token0: token0.address,
        token1: token1.address,
        amount0,
        amount1,
        decimals0: token0.decimals,
        decimals1: token1.decimals,
        userAddress: address,
        slippageBps: 50, // 0.5% slippage
      });

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      addStoredLiquidityPosition({
        id: `local-${Date.now()}`,
        dexId: selectedDex,
        dexName: selectedDex === 'aerodrome-v2' ? 'Aerodrome' : selectedDex === 'uniswap-v3' ? 'Uniswap V3' : 'Liquidity Pool',
        poolAddress: selectedPool?.poolAddress || ('0x0000000000000000000000000000000000000000' as Address),
        token0: {
          address: token0.address,
          symbol: token0.symbol,
          decimals: token0.decimals,
          logo: token0.logo,
          amount: amount0,
        },
        token1: {
          address: token1.address,
          symbol: token1.symbol,
          decimals: token1.decimals,
          logo: token1.logo,
          amount: amount1,
        },
        liquidity: (Number(amount0) + Number(amount1)).toString(),
        feeFormatted: selectedPool?.feeFormatted || '0.30%',
        currentValue: (Number(amount0) * token0.price) + (Number(amount1) * token1.price),
        feesEarned0: '0',
        feesEarned1: '0',
        apr: selectedPool?.apr ? selectedPool.apr : 6.5,
        ownerAddress: address,
      } as PositionInfo);
      
      setTxSuccess(true);
      setTimeout(() => {
        setTxSuccess(false);
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Add liquidity error:', error);
      setTxError((error as Error).message || 'Transaction failed');
      setStep('idle');
    }
  };

  const isLoading = step === 'approving' || step === 'adding';
  const canSubmit = isConnected && token0 && token1 && amount0 && amount1 && !isLoading;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#111B22] border border-[#1B2A32] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B2A32]">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-lg">Add Liquidity</h2>
            {selectedPool && <Badge variant="blue">{selectedPool.dexName}</Badge>}
          </div>
          <button 
            onClick={onClose}
            className="text-[#6B8A99] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* DEX Info */}
          {selectedPool && (
            <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B8A99]">Protocol</span>
                <span className="text-white font-semibold">{selectedPool.dexName}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-[#6B8A99]">Pool Type</span>
                <Badge variant={selectedPool.poolType === 'volatile' ? 'yellow' : 'green'}>
                  {selectedPool.poolType}
                </Badge>
              </div>
            </div>
          )}

          {/* Fee Tier (Uniswap V3 / Aerodrome CL only) */}
          {(selectedDex === 'uniswap-v3' || selectedDex === 'aerodrome-cl') && (
            <div>
              <label className="text-[#6B8A99] text-xs font-medium mb-2 block">Fee Tier</label>
              <div className="grid grid-cols-4 gap-2">
                {['0.01%', '0.05%', '0.30%', '1.00%'].map(fee => (
                  <button
                    key={fee}
                    onClick={() => setFeeTier(fee)}
                    className={clsx(
                      'py-2 rounded-lg text-xs font-bold border transition-all',
                      feeTier === fee
                        ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-[#2dd4bf]'
                        : 'bg-[#0A1520] border-[#1B2A32] text-[#6B8A99] hover:border-[#253C48]'
                    )}
                  >
                    {fee}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Token 0 Input */}
          <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <TokenSelector token={token0} onChange={setToken0} tokens={TOKENS} />
              {isConnected && token0 && (
                <span className="text-[#6B8A99] text-xs">
                  Balance: {token0.balance.toFixed(6)}
                </span>
              )}
            </div>
            <input
              type="number"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-white text-2xl font-bold outline-none placeholder-[#1B2A32]"
            />
            {token0 && amount0 && (
              <p className="text-[#6B8A99] text-xs mt-1">
                ≈ ${(+amount0 * token0.price).toFixed(2)}
              </p>
            )}
            {isConnected && token0 && (
              <div className="flex gap-1 mt-2">
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => {
                      const amount = (token0.balance * pct) / 100;
                      const limited = Math.floor(amount * 1000000) / 1000000;
                      setAmount0(limited.toString());
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-[#162535] hover:bg-[#14B8A6]/20 border border-[#253C48] hover:border-[#14B8A6]/40 rounded text-[#6B8A99] hover:text-[#14B8A6] transition-all"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="p-2 bg-[#0A1520] border border-[#1B2A32] hover:border-[#14B8A6]/40 hover:bg-[#14B8A6]/10 rounded-lg transition-all"
            >
              <ArrowUpDown className="w-4 h-4 text-[#6B8A99]" />
            </button>
          </div>

          {/* Token 1 Input */}
          <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <TokenSelector token={token1} onChange={setToken1} tokens={TOKENS} />
              {isConnected && token1 && (
                <span className="text-[#6B8A99] text-xs">
                  Balance: {token1.balance.toFixed(6)}
                </span>
              )}
            </div>
            <input
              type="number"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-white text-2xl font-bold outline-none placeholder-[#1B2A32]"
            />
            {token1 && amount1 && (
              <p className="text-[#6B8A99] text-xs mt-1">
                ≈ ${(+amount1 * token1.price).toFixed(2)}
              </p>
            )}
          </div>

          {/* Price Range (Uniswap V3 / Aerodrome CL only) */}
          {(selectedDex === 'uniswap-v3' || selectedDex === 'aerodrome-cl') && (
            <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-white text-sm font-semibold">Price Range</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPriceRangeMode('full')}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      priceRangeMode === 'full'
                        ? 'bg-[#14B8A6] text-white'
                        : 'bg-transparent text-[#6B8A99] hover:text-white'
                    )}
                  >
                    Full Range
                  </button>
                  <button
                    onClick={() => setPriceRangeMode('custom')}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      priceRangeMode === 'custom'
                        ? 'bg-[#14B8A6] text-white'
                        : 'bg-transparent text-[#6B8A99] hover:text-white'
                    )}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {priceRangeMode === 'full' ? (
                <div className="flex items-center gap-2 text-xs text-[#6B8A99]">
                  <Info className="w-4 h-4" />
                  <span>Your liquidity will be active across all price ranges</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#6B8A99] text-xs mb-1 block">Min Price</label>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-[#111B22] border border-[#1B2A32] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#14B8A6]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[#6B8A99] text-xs mb-1 block">Max Price</label>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="∞"
                      className="w-full bg-[#111B22] border border-[#1B2A32] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#14B8A6]/40"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Rate Info */}
          {token0 && token1 && rate > 0 && (
            <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B8A99]">Current Rate</span>
                <span className="text-white font-mono">
                  1 {token0.symbol} = {rate.toFixed(6)} {token1.symbol}
                </span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {txError && (
            <div className="flex items-center gap-2 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
              <span className="text-[#EF4444] text-xs">{txError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1B2A32]">
          {txSuccess ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-[#10B981]/15 border border-[#10B981]/30 rounded-xl">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
              <span className="text-[#10B981] font-semibold">Liquidity Added Successfully!</span>
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="primary"
              fullWidth
              disabled={!canSubmit}
              loading={isLoading}
            >
              {!isConnected
                ? 'Connect Wallet'
                : !token0 || !token1
                ? 'Select Tokens'
                : !amount0 || !amount1
                ? 'Enter Amounts'
                : isLoading
                ? step === 'approving'
                  ? 'Approving Tokens...'
                  : 'Adding Liquidity...'
                : 'Add Liquidity'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Token Selector Dropdown Component
 */
function TokenSelector({
  token,
  onChange,
  tokens,
}: {
  token: Token | null;
  onChange: (token: Token) => void;
  tokens: Token[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#162535] border border-[#253C48] hover:border-[#14B8A6]/40 rounded-xl px-3 py-2 transition-all"
      >
        {token ? (
          <>
            <img src={token.logo} alt={token.symbol} className="w-6 h-6 rounded-full" />
            <span className="text-white text-sm font-bold">{token.symbol}</span>
          </>
        ) : (
          <span className="text-[#6B8A99] text-sm">Select token</span>
        )}
        <svg className="w-4 h-4 text-[#6B8A99]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-80 bg-[#111B22] border border-[#1B2A32] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              {tokens.map((t) => (
                <button
                  key={t.address}
                  onClick={() => {
                    onChange(t);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0f1e2a] transition-colors text-left border-b border-[#1B2A32] last:border-b-0',
                    token?.address === t.address && 'bg-[#14B8A6]/10'
                  )}
                >
                  <img src={t.logo} alt={t.symbol} className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{t.symbol}</p>
                    <p className="text-[#6B8A99] text-xs">{t.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{t.balance.toFixed(6)}</p>
                    {t.price > 0 && (
                      <p className="text-[#6B8A99] text-xs">${(t.balance * t.price).toFixed(2)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
