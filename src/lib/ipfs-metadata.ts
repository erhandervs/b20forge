/**
 * IPFS Metadata Upload for ERC-7572
 * Handles token logo and metadata upload to IPFS
 * 
 * @see https://eips.ethereum.org/EIPS/eip-7572
 */

export interface TokenMetadata {
  name: string;
  description: string;
  image: string; // IPFS URL
  external_url?: string;
  attributes?: {
    trait_type: string;
    value: string | number;
  }[];
  // ERC-7572 specific
  decimals: number;
  symbol: string;
  // Social links
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  // Additional info
  totalSupply?: string;
  variant?: 'governance' | 'asset';
  features?: string[];
}

/**
 * Upload image to IPFS via Pinata
 */
export async function uploadImageToPinata(
  file: File,
  apiKey?: string,
  apiSecret?: string
): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
  try {
    const pinataApiKey = apiKey || process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const pinataSecretKey = apiSecret || process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      throw new Error('Pinata API credentials not configured');
    }

    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      ipfsHash: data.IpfsHash,
    };
  } catch (error) {
    console.error('IPFS image upload failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Upload metadata JSON to IPFS via Pinata
 */
export async function uploadMetadataToPinata(
  metadata: TokenMetadata,
  apiKey?: string,
  apiSecret?: string
): Promise<{ success: boolean; ipfsHash?: string; ipfsUrl?: string; error?: string }> {
  try {
    const pinataApiKey = apiKey || process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const pinataSecretKey = apiSecret || process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      throw new Error('Pinata API credentials not configured');
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: JSON.stringify({
        pinataMetadata: {
          name: `${metadata.symbol}_metadata.json`,
        },
        pinataOptions: {
          cidVersion: 1,
        },
        pinataContent: metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinata metadata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    const ipfsUrl = `ipfs://${ipfsHash}`;
    
    return {
      success: true,
      ipfsHash,
      ipfsUrl,
    };
  } catch (error) {
    console.error('IPFS metadata upload failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Upload both logo and metadata to IPFS
 * Returns ERC-7572 compliant contract URI
 */
export async function uploadTokenMetadata(
  logoFile: File,
  tokenData: {
    name: string;
    symbol: string;
    description: string;
    decimals: number;
    totalSupply: string;
    variant: 'governance' | 'asset';
    features: string[];
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  }
): Promise<{
  success: boolean;
  contractUri?: string;
  logoIpfsUrl?: string;
  metadataIpfsUrl?: string;
  error?: string;
}> {
  try {
    // Step 1: Upload logo image
    const logoResult = await uploadImageToPinata(logoFile);
    
    if (!logoResult.success || !logoResult.ipfsHash) {
      throw new Error(logoResult.error || 'Logo upload failed');
    }

    const logoIpfsUrl = `ipfs://${logoResult.ipfsHash}`;

    // Step 2: Create metadata object
    const metadata: TokenMetadata = {
      name: tokenData.name,
      description: tokenData.description,
      image: logoIpfsUrl,
      decimals: tokenData.decimals,
      symbol: tokenData.symbol,
      totalSupply: tokenData.totalSupply,
      variant: tokenData.variant,
      features: tokenData.features,
      external_url: tokenData.website,
      website: tokenData.website,
      twitter: tokenData.twitter,
      telegram: tokenData.telegram,
      discord: tokenData.discord,
      attributes: [
        {
          trait_type: 'Variant',
          value: tokenData.variant,
        },
        {
          trait_type: 'Total Supply',
          value: tokenData.totalSupply,
        },
        {
          trait_type: 'Decimals',
          value: tokenData.decimals,
        },
      ],
    };

    // Step 3: Upload metadata JSON
    const metadataResult = await uploadMetadataToPinata(metadata);
    
    if (!metadataResult.success || !metadataResult.ipfsUrl) {
      throw new Error(metadataResult.error || 'Metadata upload failed');
    }

    return {
      success: true,
      contractUri: metadataResult.ipfsUrl,
      logoIpfsUrl,
      metadataIpfsUrl: metadataResult.ipfsUrl,
    };
  } catch (error) {
    console.error('Token metadata upload failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Alternative: Upload to Web3.Storage (free, no API key required)
 */
export async function uploadToWeb3Storage(): Promise<{ success: boolean; cid?: string; error?: string }> {
  try {
    // Web3.Storage client initialization
    // This requires @web3-storage/w3up-client package
    
    // For now, return not implemented
    throw new Error('Web3.Storage integration not implemented yet. Use Pinata instead.');
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get IPFS gateway URL from IPFS URI
 */
export function getIpfsGatewayUrl(ipfsUri: string, gateway = 'https://gateway.pinata.cloud'): string {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }
  
  const hash = ipfsUri.replace('ipfs://', '');
  return `${gateway}/ipfs/${hash}`;
}

/**
 * Validate if file is a valid image
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PNG, JPEG, WebP, or SVG.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.',
    };
  }

  return { valid: true };
}
