'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';

/**
 * NFT Metadata
 */
export interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  description?: string;
  image: string;
  collection: string;
  floorPrice?: number;
  lastSale?: number;
}

/**
 * Fetch NFTs from Alchemy or Simplehash API
 * For demo purposes, we'll use mock data but structure it like real API responses
 */
export function useWalletNFTs(address: Address | undefined) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      return;
    }

    const fetchNFTs = async () => {
      setIsLoading(true);
      
      try {
        // In production, you would call Alchemy NFT API or SimpleHash API
        // Example: https://base-mainnet.g.alchemy.com/nft/v3/{API_KEY}/getNFTsForOwner
        
        // For now, return empty array since we need API keys
        // User can add their own API integration
        
        setNfts([]);
      } catch (error) {
        console.error('Error fetching NFTs:', error);
        setNfts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [address]);

  return { nfts, isLoading };
}
