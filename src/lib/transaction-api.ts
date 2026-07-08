'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';

/**
 * Transaction Activity
 */
export interface Transaction {
  hash: string;
  timestamp: number;
  type: 'swap' | 'send' | 'receive' | 'approve' | 'liquidity_add' | 'liquidity_remove';
  status: 'success' | 'failed' | 'pending';
  fromToken?: string;
  toToken?: string;
  amount?: string;
  value: number;
  gasUsed?: string;
  to?: string;
  from?: string;
}

/**
 * Fetch transaction history from Base blockchain
 */
export function useTransactionHistory(address: Address | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      
      try {
        // Fetch transactions from Basescan API
        const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '';
        
        // Fetch normal transactions
        const normalTxUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${BASESCAN_API_KEY}`;
        
        // Fetch ERC20 token transfers
        const tokenTxUrl = `https://api.basescan.org/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${BASESCAN_API_KEY}`;
        
        const [normalRes, tokenRes] = await Promise.all([
          fetch(normalTxUrl).then(r => r.json()).catch(() => ({ result: [] })),
          fetch(tokenTxUrl).then(r => r.json()).catch(() => ({ result: [] })),
        ]);
        
        const allTxs: Transaction[] = [];
        
        // Process normal transactions
        if (normalRes.result && Array.isArray(normalRes.result)) {
          normalRes.result.forEach((tx: Record<string, string>) => {
            const isSend = tx.from.toLowerCase() === address.toLowerCase();
            const valueInEth = parseFloat(tx.value) / 1e18;
            
            allTxs.push({
              hash: tx.hash,
              timestamp: parseInt(tx.timeStamp) * 1000,
              type: isSend ? 'send' : 'receive',
              status: tx.isError === '0' ? 'success' : 'failed',
              amount: valueInEth.toFixed(6),
              value: valueInEth,
              gasUsed: tx.gasUsed,
              to: tx.to,
              from: tx.from,
              fromToken: 'ETH',
              toToken: 'ETH',
            });
          });
        }
        
        // Process token transactions
        if (tokenRes.result && Array.isArray(tokenRes.result)) {
          tokenRes.result.forEach((tx: Record<string, string>) => {
            const isSend = tx.from.toLowerCase() === address.toLowerCase();
            const amount = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
            
            // Detect transaction type based on method
            let type: Transaction['type'] = isSend ? 'send' : 'receive';
            if (tx.functionName && tx.functionName.includes('swap')) {
              type = 'swap';
            } else if (tx.functionName && tx.functionName.includes('approve')) {
              type = 'approve';
            } else if (tx.functionName && (tx.functionName.includes('addLiquidity') || tx.functionName.includes('mint'))) {
              type = 'liquidity_add';
            } else if (tx.functionName && (tx.functionName.includes('removeLiquidity') || tx.functionName.includes('burn'))) {
              type = 'liquidity_remove';
            }
            
            allTxs.push({
              hash: tx.hash,
              timestamp: parseInt(tx.timeStamp) * 1000,
              type,
              status: 'success',
              amount: amount.toFixed(6),
              value: amount,
              gasUsed: tx.gasUsed,
              to: tx.to,
              from: tx.from,
              fromToken: tx.tokenSymbol,
              toToken: tx.tokenSymbol,
            });
          });
        }
        
        // Sort by timestamp descending
        allTxs.sort((a, b) => b.timestamp - a.timestamp);
        
        // Take top 20
        setTransactions(allTxs.slice(0, 20));
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  return { transactions, isLoading };
}
