/**
 * Manage Position Modal Component
 * Mevcut pozisyonları yönetmek için modal: Increase, Decrease, Collect, Remove
 */

/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { X, Plus, Minus, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { PositionInfo } from '@/lib/protocols';
import { useLiquidityService } from '@/hooks/useB20SDK';
import { useAccount } from 'wagmi';
import { removeStoredLiquidityPosition } from '@/lib/liquidity-hooks';

type ActionType = 'increase' | 'decrease' | 'collect' | 'remove';

interface ManagePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: PositionInfo;
}

export function ManagePositionModal({
  isOpen,
  onClose,
  position,
}: ManagePositionModalProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>('increase');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [liquidityPercent, setLiquidityPercent] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const liquidityService = useLiquidityService();

  if (!isOpen) return null;

  const handleAction = async () => {
    if (!isConnected || !address || !liquidityService) {
      setTxError('Connect your wallet to manage this position.');
      return;
    }

    try {
      setIsProcessing(true);
      setTxError(null);

      if (selectedAction === 'increase') {
        const result = await liquidityService.addLiquidity(position.dexId, {
          token0: position.token0.address,
          token1: position.token1.address,
          amount0: amount0 || '0',
          amount1: amount1 || '0',
          decimals0: position.token0.decimals ?? 18,
          decimals1: position.token1.decimals ?? 18,
          userAddress: address,
          slippageBps: 50,
        });

        if (!result.success) {
          throw new Error(result.error || 'Increase liquidity failed.');
        }
      } else if (selectedAction === 'decrease') {
        const liquidityAmount = Math.floor(Number(position.liquidity || '0') * (liquidityPercent / 100)).toString();
        const result = await liquidityService.removeLiquidity(position.dexId, position.id, liquidityAmount, 50, address);

        if (!result.success) {
          throw new Error(result.error || 'Remove liquidity failed.');
        }
      } else if (selectedAction === 'collect') {
        const result = await liquidityService.collectFees(position.dexId, position.id, address, {
          token0: position.token0.address,
          token1: position.token1.address,
          poolAddress: position.poolAddress,
        });

        if (!result.success) {
          throw new Error(result.error || 'Collect fees failed.');
        }
      } else {
        const liquidityAmount = Math.floor(Number(position.liquidity || '0')).toString();
        const result = await liquidityService.removeLiquidity(position.dexId, position.id, liquidityAmount, 50, address, {
          token0: position.token0.address,
          token1: position.token1.address,
          recipient: address,
        });

        if (!result.success) {
          throw new Error(result.error || 'Remove liquidity failed.');
        }

        removeStoredLiquidityPosition(position.id);
      }
      
      setTxSuccess(true);
      setTimeout(() => {
        setTxSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Position management error:', error);
      setTxError((error as Error).message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#111B22] border border-[#1B2A32] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1B2A32]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg">Manage Position</h2>
              <Badge variant="blue">{position.dexName}</Badge>
            </div>
            <button onClick={onClose} className="text-[#6B8A99] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Position Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <img src={position.token0.logo} alt={position.token0.symbol} className="w-8 h-8 rounded-full border-2 border-[#111B22]" />
              <img src={position.token1.logo} alt={position.token1.symbol} className="w-8 h-8 rounded-full -ml-3 border-2 border-[#111B22]" />
            </div>
            <div>
              <p className="text-white font-bold">{position.token0.symbol}/{position.token1.symbol}</p>
              <p className="text-[#6B8A99] text-xs">{position.feeFormatted}</p>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="px-5 py-3 border-b border-[#1B2A32] flex gap-2">
          {[
            { id: 'increase' as ActionType, label: 'Increase', icon: Plus },
            { id: 'decrease' as ActionType, label: 'Decrease', icon: Minus },
            { id: 'collect' as ActionType, label: 'Collect Fees', icon: TrendingDown },
            { id: 'remove' as ActionType, label: 'Remove', icon: X },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedAction(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                selectedAction === id
                  ? 'bg-[#14B8A6] text-white'
                  : 'bg-[#0A1520] text-[#6B8A99] hover:text-white hover:bg-[#0f1e2a]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Position Details */}
          <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B8A99]">Position Value</span>
              <span className="text-white font-bold">${position.currentValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B8A99]">{position.token0.symbol} Amount</span>
              <span className="text-white font-mono">{position.token0.amount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B8A99]">{position.token1.symbol} Amount</span>
              <span className="text-white font-mono">{position.token1.amount}</span>
            </div>

            {position.inRange !== undefined && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1B2A32]">
                <span className="text-[#6B8A99]">Status</span>
                <Badge variant={position.inRange ? 'green' : 'gray'}>
                  {position.inRange ? 'In Range' : 'Out of Range'}
                </Badge>
              </div>
            )}
            {position.feesEarned0 && parseFloat(position.feesEarned0) > 0 && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1B2A32]">
                <span className="text-[#6B8A99]">Uncollected Fees</span>
                <div className="text-right">
                  <p className="text-[#2dd4bf] font-mono text-xs">{position.feesEarned0} {position.token0.symbol}</p>
                  <p className="text-[#2dd4bf] font-mono text-xs">{position.feesEarned1} {position.token1.symbol}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Content */}
          {selectedAction === 'increase' && (
            <div className="space-y-3">
              <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3">
                <label className="text-[#6B8A99] text-xs mb-2 block">{position.token0.symbol} Amount</label>
                <input
                  type="number"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-white text-xl font-bold outline-none"
                />
              </div>
              <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3">
                <label className="text-[#6B8A99] text-xs mb-2 block">{position.token1.symbol} Amount</label>
                <input
                  type="number"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-white text-xl font-bold outline-none"
                />
              </div>
            </div>
          )}

          {selectedAction === 'decrease' && (
            <div className="space-y-3">
              <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4">
                <label className="text-[#6B8A99] text-xs mb-3 block">Remove Percentage</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={liquidityPercent}
                    onChange={(e) => setLiquidityPercent(+e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-white font-bold text-lg w-16 text-right">{liquidityPercent}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setLiquidityPercent(pct)}
                      className={clsx(
                        'py-1.5 rounded-lg text-xs font-semibold transition-all',
                        liquidityPercent === pct
                          ? 'bg-[#14B8A6] text-white'
                          : 'bg-[#162535] text-[#6B8A99] hover:text-white'
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3">
                <p className="text-[#6B8A99] text-xs mb-2">You will receive:</p>
                <div className="space-y-1">
                  <p className="text-white text-sm font-mono">
                    {(parseFloat(position.token0.amount) * liquidityPercent / 100).toFixed(6)} {position.token0.symbol}
                  </p>
                  <p className="text-white text-sm font-mono">
                    {(parseFloat(position.token1.amount) * liquidityPercent / 100).toFixed(6)} {position.token1.symbol}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedAction === 'collect' && (
            <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4">
              <p className="text-[#6B8A99] text-xs mb-3">Collectible Fees:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">{position.token0.symbol}</span>
                  <span className="text-[#2dd4bf] font-mono font-bold">{position.feesEarned0 || '0.000000'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">{position.token1.symbol}</span>
                  <span className="text-[#2dd4bf] font-mono font-bold">{position.feesEarned1 || '0.000000'}</span>
                </div>
              </div>
            </div>
          )}

          {selectedAction === 'remove' && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#EF4444] font-semibold text-sm mb-1">Remove Position</p>
                  <p className="text-[#EF4444]/80 text-xs">
                    This will remove 100% of your liquidity and collect all fees. 
                    You will receive both tokens back to your wallet.
                  </p>
                </div>
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
              <span className="text-[#10B981] font-semibold">Transaction Successful!</span>
            </div>
          ) : (
            <Button
              onClick={handleAction}
              variant={selectedAction === 'remove' ? 'danger' : 'primary'}
              fullWidth
              loading={isProcessing}
              disabled={isProcessing || (selectedAction === 'increase' && !amount0 && !amount1)}
            >
              {isProcessing
                ? 'Processing...'
                : selectedAction === 'increase'
                ? 'Increase Liquidity'
                : selectedAction === 'decrease'
                ? `Remove ${liquidityPercent}% Liquidity`
                : selectedAction === 'collect'
                ? 'Collect Fees'
                : 'Remove Position'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
