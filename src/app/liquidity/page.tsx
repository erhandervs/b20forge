/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useMemo } from 'react';
import { Droplets, Plus, ChevronDown, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAccount } from 'wagmi';
import { 
  useDexSelection, 
  useAllPoolsData, 
  useAllLiquidityPositions,
  formatPoolStats,
  type PoolInfo,
} from '@/lib/liquidity-hooks';
import { AddLiquidityModal } from '@/components/liquidity/AddLiquidityModal';
import { ManagePositionModal } from '@/components/liquidity/ManagePositionModal';
import type { PositionInfo } from '@/lib/protocols';

type Tab = 'pools' | 'positions';

export default function LiquidityPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>('pools');
  const { selectedDex, setSelectedDex, availableDexes } = useDexSelection();
  const { pools, isLoading: isLoadingPools } = useAllPoolsData();
  const { positions, isLoading: isLoadingPositions } = useAllLiquidityPositions();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<PositionInfo | null>(null);

  const filteredPools = useMemo(() => {
    return pools;
  }, [pools]);

  const totalLiquidityValue = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.currentValue, 0);
  }, [positions]);

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto mb-4">
            <Droplets className="w-8 h-8 text-[#14B8A6]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-[#6B8A99] text-sm">Connect your wallet to provide liquidity and earn fees</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Liquidity</h1>
          <p className="text-[#6B8A99] text-sm">Provide liquidity and earn trading fees</p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setSelectedPool(null);
            setShowAddModal(true);
          }}
        >
          Add Liquidity
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111B22] border border-[#1B2A32] rounded-xl p-4">
          <p className="text-[#6B8A99] text-xs mb-1">Your Liquidity</p>
          <p className="text-white text-2xl font-bold">
            ${totalLiquidityValue.toFixed(2)}
          </p>
        </div>
        <div className="bg-[#111B22] border border-[#1B2A32] rounded-xl p-4">
          <p className="text-[#6B8A99] text-xs mb-1">Active Positions</p>
          <p className="text-white text-2xl font-bold">{positions.length}</p>
        </div>
        <div className="bg-[#111B22] border border-[#1B2A32] rounded-xl p-4">
          <p className="text-[#6B8A99] text-xs mb-1">Total Pools</p>
          <p className="text-white text-2xl font-bold">{pools.length}</p>
        </div>
        <div className="bg-[#111B22] border border-[#1B2A32] rounded-xl p-4">
          <p className="text-[#6B8A99] text-xs mb-1">Avg APR</p>
          <p className="text-white text-2xl font-bold">
            {pools.length > 0
              ? (pools.reduce((sum, p) => sum + p.apr, 0) / pools.length).toFixed(2)
              : '0.00'}%
          </p>
        </div>
      </div>

      {/* DEX Selector */}
      <div className="bg-[#111B22] border border-[#1B2A32] rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#6B8A99] text-sm mr-2">Protocol:</span>
          {availableDexes.map((dex) => (
            <button
              key={dex.id}
              onClick={() => setSelectedDex(dex.id)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-semibold border transition-all',
                selectedDex === dex.id
                  ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-[#2dd4bf]'
                  : 'bg-transparent border-[#1B2A32] text-[#6B8A99] hover:border-[#253C48]'
              )}
            >
              {dex.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1B2A32]">
        <button
          onClick={() => setActiveTab('pools')}
          className={clsx(
            'px-6 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'pools'
              ? 'border-[#14B8A6] text-white'
              : 'border-transparent text-[#6B8A99] hover:text-white'
          )}
        >
          All Pools ({pools.length})
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={clsx(
            'px-6 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'positions'
              ? 'border-[#14B8A6] text-white'
              : 'border-transparent text-[#6B8A99] hover:text-white'
          )}
        >
          My Positions ({positions.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pools' ? (
        <div className="bg-[#111B22] border border-[#1B2A32] rounded-xl overflow-hidden">
          {isLoadingPools ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin" />
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[#6B8A99]">No pools found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1B2A32]">
                    <th className="px-6 py-4 text-left text-[#6B8A99] text-xs font-medium">Pool</th>
                    <th className="px-6 py-4 text-left text-[#6B8A99] text-xs font-medium">DEX</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">TVL</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">Volume 24h</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">APR</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2A32]">
                  {filteredPools.map((pool) => {
                    const stats = formatPoolStats(pool);
                    return (
                      <tr key={pool.poolAddress} className="hover:bg-[#0f1e2a] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              <img src={pool.token0.logo} alt={pool.token0.symbol} className="w-8 h-8 rounded-full border-2 border-[#111B22]" />
                              <img src={pool.token1.logo} alt={pool.token1.symbol} className="w-8 h-8 rounded-full border-2 border-[#111B22]" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-semibold">
                                {pool.token0.symbol}/{pool.token1.symbol}
                              </p>
                              <p className="text-[#6B8A99] text-xs">{pool.feeFormatted}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="blue">{pool.dexName}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right text-white text-sm">{stats.tvlFormatted}</td>
                        <td className="px-6 py-4 text-right text-white text-sm">{stats.volumeFormatted}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[#10B981] text-sm font-semibold">{stats.aprFormatted}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPool(pool);
                              setShowAddModal(true);
                            }}
                          >
                            Add
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#111B22] border border-[#1B2A32] rounded-xl overflow-hidden">
          {isLoadingPositions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin" />
            </div>
          ) : positions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Droplets className="w-12 h-12 text-[#3D5A6A] mx-auto mb-3" />
              <p className="text-[#6B8A99] mb-4">No active positions</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedPool(null);
                  setShowAddModal(true);
                }}
              >
                Add Liquidity
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1B2A32]">
                    <th className="px-6 py-4 text-left text-[#6B8A99] text-xs font-medium">Position</th>
                    <th className="px-6 py-4 text-left text-[#6B8A99] text-xs font-medium">DEX</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">Value</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">Fees Earned</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">APR</th>
                    <th className="px-6 py-4 text-right text-[#6B8A99] text-xs font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2A32]">
                  {positions.map((position) => (
                    <tr key={position.id} className="hover:bg-[#0f1e2a] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <img src={position.token0.logo} alt={position.token0.symbol} className="w-8 h-8 rounded-full border-2 border-[#111B22]" />
                            <img src={position.token1.logo} alt={position.token1.symbol} className="w-8 h-8 rounded-full border-2 border-[#111B22]" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">
                              {position.token0.symbol}/{position.token1.symbol}
                            </p>
                            <p className="text-[#6B8A99] text-xs">{position.feeFormatted}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="blue">{position.dexName}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                        ${position.currentValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm">
                          <p className="text-[#10B981] font-semibold">
                            {parseFloat(position.feesEarned0).toFixed(4)} {position.token0.symbol}
                          </p>
                          <p className="text-[#10B981] text-xs">
                            {parseFloat(position.feesEarned1).toFixed(4)} {position.token1.symbol}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[#10B981] text-sm font-semibold">{position.apr.toFixed(2)}%</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPosition(position);
                            setShowManageModal(true);
                          }}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddLiquidityModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedPool(null);
        }}
        selectedPool={selectedPool}
        selectedDex={selectedDex}
      />
      
      <ManagePositionModal
        isOpen={showManageModal}
        onClose={() => {
          setShowManageModal(false);
          setSelectedPosition(null);
        }}
        position={selectedPosition}
      />
    </div>
  );
}
