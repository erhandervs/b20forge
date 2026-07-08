/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useMemo } from 'react';
import { Droplets, Plus, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#071114] to-[#041018]">
      <div className="w-full max-w-md bg-[#0b1220] border border-[#1b2a32] rounded-2xl p-8 text-center shadow-lg overflow-hidden">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-[#071826] border border-[#15333d] flex items-center justify-center text-[#2dd4bf] text-xl">💧</div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">caming soon</h1>
        <p className="text-[#9fb1bd] text-sm sm:text-base mb-6">Likidite özellikleri üzerinde çalışıyoruz — yakında burada olacak.</p>
        <div className="mt-4">
          <a href="#" className="inline-block px-4 py-2 bg-[#123343] hover:bg-[#164e56] text-[#cfeef1] rounded-md text-sm">Bildirimler için takip et</a>
        </div>
      </div>
    </div>
  );
}
