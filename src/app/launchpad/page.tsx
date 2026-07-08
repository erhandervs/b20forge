/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import {
  Rocket, CheckCircle2, Info, ExternalLink,
  Upload, Shield, Zap, Copy, ChevronRight, AlertCircle, X, Droplets, Plus,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useFactoryService, useLiquidityService } from '@/hooks/useB20SDK';
import { B20_POLICY_TYPES, B20_VARIANTS, BERYL_STATUS, type B20TokenConfig } from '@/lib/b20-config';
import { persistDeployedToken } from '@/lib/deployed-tokens';
import { useIsActivated, useActivationFee } from '@/lib/activation-registry';

type Variant = 'asset' | 'governance';
type Step = 1 | 2 | 3 | 4;

interface TokenForm {
  name: string; symbol: string; description: string;
  decimals: string; totalSupply: string; variant: Variant;
  mintable: boolean; burnable: boolean; pausable: boolean;
  permit: boolean; supplyCap: boolean; supplyCapAmount: string;
  policyType: 'none' | 'allowlist' | 'blocklist';
  allowlistAddresses: string; // addresses separated by newlines
  blocklistAddresses: string; // addresses separated by newlines
  website: string; twitter: string; telegram: string;
  logo: File | null; // Logo file is now required
}

const INITIAL: TokenForm = {
  name: '', symbol: '', description: '', decimals: '18', totalSupply: '1000000000',
  variant: 'governance', mintable: false, burnable: true, pausable: false,
  permit: true, supplyCap: false, supplyCapAmount: '',
  policyType: 'none', allowlistAddresses: '', blocklistAddresses: '',
  website: '', twitter: '', telegram: '', logo: null,
};

const B20_FEATURES = [
  { label: 'Fully ERC-20 Compatible', desc: 'Works with all wallets and DEXes',   icon: '✓', color: 'green'  },
  { label: 'ERC-2612 Permit',         desc: 'Signature-based gasless approvals',  icon: '✓', color: 'green'  },
  { label: 'Role-based Access',       desc: 'Granular mint/burn permissions',     icon: '✓', color: 'blue'   },
  { label: 'Policy Registry',         desc: 'Allow/Block list management',        icon: '✓', color: 'blue'   },
  { label: 'Supply Cap',              desc: 'Maximum supply ceiling',             icon: '✓', color: 'purple' },
  { label: 'Native Precompile',       desc: 'Rust code embedded in chain',        icon: '✓', color: 'orange' },
  { label: 'Transfer Memos',          desc: 'On-chain transaction notes',         icon: '✓', color: 'gray'   },
  { label: 'Contract URI',            desc: 'ERC-7572 metadata standard',         icon: '✓', color: 'gray'   },
];

const STEPS = [
  { id: 1, label: 'Token Info'   },
  { id: 2, label: 'Features'     },
  { id: 3, label: 'Social'       },
  { id: 4, label: 'Preview'      },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              current === s.id
                ? 'bg-[#0052ff] border-[#0052ff] text-white shadow-lg shadow-blue-500/25'
                : current > s.id
                ? 'bg-[#10B981] border-[#10B981] text-white'
                : 'bg-transparent border-[#2a3348] text-[#4a5568]'
            )}>
              {current > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
            </div>
            <span className={clsx('text-[10px] font-medium mt-1 whitespace-nowrap',
              current === s.id ? 'text-[#2dd4bf]' : current > s.id ? 'text-[#10B981]' : 'text-[#4a5568]'
            )}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={clsx('flex-1 h-0.5 mx-2 rounded transition-all mb-4',
              current > s.id ? 'bg-[#10B981]' : 'bg-[#1e2535]'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, desc }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; desc?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#0f1117] border border-[#1e2535] rounded-xl hover:border-[#2a3348] transition-colors">
      <div>
        <p className="text-[#e8eaf0] text-sm font-medium">{label}</p>
        {desc && <p className="text-[#4a5568] text-xs mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'w-11 h-6 rounded-full border-2 transition-all duration-200 relative shrink-0 ml-4',
          checked ? 'bg-[#0052ff] border-[#0052ff]' : 'bg-transparent border-[#2a3348]'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200',
          checked ? 'left-5 bg-white' : 'left-0.5 bg-[#4a5568]'
        )} />
      </button>
    </div>
  );
}

/* ─── Add Liquidity Modal for deployed token ─── */
function AddLiquidityModalDeployed({ tokenSymbol, tokenAddress, onClose }: { tokenSymbol: string; tokenAddress: string; onClose: () => void }) {
  const [amountToken, setAmountToken] = useState('');
  const [amountUSDC, setAmountUSDC] = useState('');
  const [fee, setFee] = useState('0.30%');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const liquidityService = useLiquidityService();
  
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);
  
  const submit = async () => {
    if (!isConnected || !address || !liquidityService || !amountToken || !amountUSDC) {
      setError('Connect your wallet and enter both amounts to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await liquidityService.addLiquidity('aerodrome-v2', {
        token0: tokenAddress as `0x${string}`,
        token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount0: amountToken,
        amount1: amountUSDC,
        decimals0: 18,
        decimals1: 6,
        userAddress: address,
        slippageBps: 50,
      });

      if (!result.success) {
        throw new Error(result.error || 'Liquidity addition failed.');
      }

      setDone(true);
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Liquidity addition failed.');
    } finally {
      setLoading(false);
    }
  };
  
  const usdToken = amountToken ? `≈ $${(+amountToken * 0.1).toFixed(2)}` : '';
  const usdUSDC = amountUSDC ? `≈ $${(+amountUSDC).toFixed(2)}` : '';
  const total = amountToken && amountUSDC ? `$${((+amountToken * 0.1) + (+amountUSDC)).toFixed(2)}` : '—';
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-6" style={{ height: '100dvh' }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#111B22] border border-[#1B2A32] rounded-xl shadow-2xl flex flex-col" style={{ maxHeight: '90dvh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1B2A32] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-[#14B8A6]" />
            <h2 className="text-white font-bold text-sm">Add Liquidity on Aerodrome</h2>
            <Badge variant="gray">{tokenSymbol}/USDC</Badge>
          </div>
          <button onClick={onClose} className="text-[#3D5A6A] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <div>
            <p className="text-[#6B8A99] text-xs font-medium uppercase tracking-wider mb-2">Fee Tier</p>
            <div className="grid grid-cols-4 gap-2">
              {['0.01%', '0.05%', '0.30%', '1.00%'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setFee(f)}
                  className={clsx(
                    'py-2 rounded-lg text-xs font-bold border transition-all',
                    fee === f 
                      ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-[#2dd4bf]' 
                      : 'bg-[#0A1520] border-[#1B2A32] text-[#6B8A99] hover:border-[#253C48]'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-bold">{tokenSymbol}</span>
                <span className="text-[#6B8A99] text-[10px]">Bal: 0</span>
              </div>
              <input 
                type="text" 
                placeholder="0.00" 
                value={amountToken} 
                onChange={e => setAmountToken(e.target.value)}
                className="w-full bg-transparent text-white text-2xl font-bold outline-none"
              />
              <p className="text-[#3D5A6A] text-xs mt-1">{usdToken}</p>
            </div>
            
            <div className="flex justify-center">
              <div className="p-2 bg-[#0A1520] border border-[#1B2A32] rounded-lg">
                <Plus className="w-4 h-4 text-[#6B8A99]" />
              </div>
            </div>
            
            <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-bold">USDC</span>
                <span className="text-[#6B8A99] text-[10px]">Bal: 2,460</span>
              </div>
              <input 
                type="text" 
                placeholder="0.00" 
                value={amountUSDC} 
                onChange={e => setAmountUSDC(e.target.value)}
                className="w-full bg-transparent text-white text-2xl font-bold outline-none"
              />
              <p className="text-[#3D5A6A] text-xs mt-1">{usdUSDC}</p>
            </div>
          </div>
          
          <div className="bg-[#162535] border border-[#253C48] rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#6B8A99]">Total Value</span>
              <span className="text-white font-bold">{total}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6B8A99]">Exchange Rate</span>
              <span className="text-white">1 {tokenSymbol} = 0.1 USDC</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6B8A99]">Pool Share</span>
              <span className="text-white">~100%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6B8A99]">Est. APR</span>
              <span className="text-[#2dd4bf] font-bold">—</span>
            </div>
          </div>
          
          <div className="flex gap-2 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-xl p-3">
            <Info className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <p className="text-[#14B8A6] text-xs">
              This will create a new liquidity pool on Aerodrome for {tokenSymbol}/USDC pair.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#1B2A32] flex-shrink-0">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-[#14B8A6]/15 border border-[#14B8A6]/40 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />
              <span className="text-[#2dd4bf] font-bold text-sm">Liquidity Added!</span>
            </div>
          ) : (
            <Button 
              onClick={submit} 
              variant="primary" 
              className="w-full"
              disabled={!amountToken || !amountUSDC || loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adding Liquidity...</span>
                </div>
              ) : 'Add Liquidity'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LaunchpadPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<TokenForm>(INITIAL);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showLiquidityModal, setShowLiquidityModal] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const { address, isConnected, chain } = useAccount();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const factoryService = useFactoryService();
  const { isActivated, isLoading: activationLoading, error: activationError } = useIsActivated();
  const { fee: activationFee, isLoading: feeLoading } = useActivationFee();
  const isBaseMainnet = chain?.id === base.id;
  const launchpadEnabled = isBaseMainnet && BERYL_STATUS.MAINNET_ACTIVE;

  const set = (k: keyof TokenForm, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const deploy = async () => {
    if (!isConnected || !address || !factoryService) {
      setDeployError('Connect your wallet first to deploy a token.');
      return;
    }

    if (!isBaseMainnet) {
      setDeployError('Switch your wallet to Base Mainnet before deploying.');
      return;
    }

    if (!launchpadEnabled) {
      setDeployError('Base mainnet B20 launchpad is not available on the connected network.');
      return;
    }

    setDeploying(true);
    setDeployError(null);

    try {
      const config: B20TokenConfig = {
        name: form.name,
        symbol: form.symbol,
        decimals: Number(form.decimals),
        totalSupply: BigInt(Math.floor(Number(form.totalSupply))),
        variant: form.variant === 'asset' ? B20_VARIANTS.ASSET : B20_VARIANTS.GOVERNANCE,
        mintable: form.mintable,
        burnable: form.burnable,
        pausable: form.pausable,
        permit: form.permit,
        supplyCap: form.supplyCap,
        supplyCapAmount: form.supplyCap ? BigInt(Math.floor(Number(form.supplyCapAmount || '0'))) : undefined,
        policyType: form.policyType === 'allowlist'
          ? B20_POLICY_TYPES.ALLOWLIST
          : form.policyType === 'blocklist'
            ? B20_POLICY_TYPES.BLOCKLIST
            : B20_POLICY_TYPES.NONE,
        allowlistAddresses: form.allowlistAddresses.split(/\n|,/).map(v => v.trim()).filter(Boolean),
        blocklistAddresses: form.blocklistAddresses.split(/\n|,/).map(v => v.trim()).filter(Boolean),
        website: form.website,
        twitter: form.twitter,
        telegram: form.telegram,
      };

      const result = await factoryService.deployToken({
        config,
        userAddress: address,
        logoFile: form.logo ?? undefined,
      });

      if (!result.success || !result.tokenAddress) {
        throw new Error(result.error || 'Deployment failed.');
      }

      const tokenRecord = {
        address: result.tokenAddress,
        name: form.name,
        symbol: form.symbol,
        decimals: Number(form.decimals),
        totalSupply: String(BigInt(Math.floor(Number(form.totalSupply)))),
        chainId: 8453,
        creator: address,
        description: form.description,
        website: form.website,
        twitter: form.twitter,
        telegram: form.telegram,
        variant: form.variant,
        deployedAt: Date.now(),
        metadataUri: result.metadataUri,
      };

      persistDeployedToken(tokenRecord);
      setDeployed(result.tokenAddress);
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : 'Deployment failed.');
    } finally {
      setDeploying(false);
    }
  };

  const fmtSupply = (s: string) => {
    const n = parseFloat(s);
    if (isNaN(n)) return '0';
    if (n >= 1e9) return `${(n/1e9).toFixed(0)}B`;
    if (n >= 1e6) return `${(n/1e6).toFixed(0)}M`;
    if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`;
    return n.toString();
  };

  if (deployed) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-fade-in">
        <div className="bg-[#131720] border border-[#10B981]/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
          <h2 className="text-[#e8eaf0] text-2xl font-bold mb-2">Token Successfully Deployed!</h2>
          <p className="text-[#8892a4] text-sm mb-6">
            <strong className="text-[#e8eaf0]">{form.name} ({form.symbol})</strong> has been deployed on Base Mainnet with the B20 standard.
          </p>
          <div className="bg-[#0f1117] border border-[#1e2535] rounded-xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#8892a4] text-xs">Contract Address</span>
              <div className="flex items-center gap-2">
                <span className="text-[#e8eaf0] text-xs font-mono">{deployed.slice(0,10)}...{deployed.slice(-8)}</span>
                <button onClick={() => navigator.clipboard.writeText(deployed)} className="text-[#2dd4bf] hover:text-[#0052ff]">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8892a4] text-xs">Network</span>
              <Badge variant="blue" dot>Base Mainnet</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8892a4] text-xs">Standard</span>
              <Badge variant="purple">B20 Beryl</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8892a4] text-xs">Total Supply</span>
              <span className="text-[#e8eaf0] text-xs font-semibold">{fmtSupply(form.totalSupply)} {form.symbol}</span>
            </div>
          </div>
          {deployError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-left text-xs text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deployError}</span>
            </div>
          )}

          <div className="flex gap-3">
            <a href={`https://basescan.org/address/${deployed}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button fullWidth variant="secondary" icon={<ExternalLink className="w-4 h-4" />}>
                View on Basescan
              </Button>
            </a>
            <Button fullWidth icon={<Droplets className="w-4 h-4" />} onClick={() => setShowLiquidityModal(true)}>
              Add Liquidity on Aerodrome
            </Button>
          </div>
          <button onClick={() => { setDeployed(null); setForm(INITIAL); setStep(1); setLogoPreview(null); }}
            className="mt-4 text-[#4a5568] text-xs hover:text-[#8892a4] transition-colors">
            Deploy another token →
          </button>
        </div>
        
        {/* Liquidity Modal */}
        {showLiquidityModal && (
          <AddLiquidityModalDeployed 
            tokenSymbol={form.symbol}
            tokenAddress={deployed}
            onClose={() => setShowLiquidityModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: B20 info */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-gradient-to-br from-[#0052ff]/15 to-[#131720] border border-[#0052ff]/25 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0052ff]/20 border border-[#0052ff]/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#2dd4bf]" />
                </div>
                <div>
                  <p className="text-[#e8eaf0] text-xs font-semibold">Mainnet Readiness</p>
                  <p className="text-[#4a5568] text-[10px]">Base activation status</p>
                </div>
              </div>
              <div className={clsx('px-2.5 py-1 rounded-full text-[10px] font-semibold',
                activationLoading ? 'bg-[#f5a623]/10 text-[#f5a623]' : launchpadEnabled ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#ef4444]/10 text-[#ef4444]'
              )}>
                {activationLoading ? 'Checking…' : launchpadEnabled ? 'Ready' : 'Blocked'}
              </div>
            </div>
            {!activationLoading && !isBaseMainnet && (
              <div className="mb-3 rounded-xl border border-[#f5a623]/20 bg-[#f5a623]/10 p-3 text-xs text-[#f5a623]">
                <p className="font-semibold mb-1">Switch to Base Mainnet.</p>
                <p>Deploy is only available on Base Mainnet. Use the button below to switch networks.</p>
              </div>
            )}
            {!activationLoading && isBaseMainnet && launchpadEnabled && (
              <div className="mb-3 rounded-xl border border-[#10B981]/20 bg-[#10B981]/10 p-3 text-xs text-[#10B981]">
                <p className="font-semibold mb-1">B20 mainnet launchpad is live.</p>
                <p>Deployment is now enabled on Base Mainnet.</p>
              </div>
            )}
            {!activationLoading && isBaseMainnet && !launchpadEnabled && (
              <div className="mb-3 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-xs text-[#ef4444]">
                <p className="font-semibold mb-1">B20 mainnet launchpad is unavailable.</p>
                <p>Deployment stays disabled until the Base activation status is available.</p>
              </div>
            )}
            {activationError && (
              <div className="mb-3 rounded-xl border border-[#f5a623]/20 bg-[#f5a623]/10 p-3 text-xs text-[#f5a623]">
                <p className="font-semibold mb-1">Registry check failed.</p>
                <p>{activationError.message || 'Unable to verify activation status.'}</p>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-[#8892a4] mb-2">
              <span>Activation fee</span>
              <span>{feeLoading ? 'Checking…' : `${activationFee.toString()} wei`}</span>
            </div>
            {!isBaseMainnet && (
              <button
                type="button"
                onClick={() => switchChain?.({ chainId: base.id })}
                disabled={!switchChain || switchPending}
                className="mt-2 w-full rounded-xl border border-[#0052ff]/30 bg-[#0052ff]/10 px-3 py-2 text-xs font-semibold text-[#2dd4bf] transition-all hover:bg-[#0052ff]/20 disabled:opacity-50"
              >
                {switchPending ? 'Switching…' : 'Switch to Base Mainnet'}
              </button>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#0052ff]/20 border border-[#0052ff]/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#2dd4bf]" />
              </div>
              <div>
                <h3 className="text-[#e8eaf0] text-sm font-bold">B20 Token Standard</h3>
                <p className="text-[#4a5568] text-xs">Base Beryl Upgrade</p>
              </div>
            </div>
            <p className="text-[#8892a4] text-xs leading-relaxed mb-4">
              B20 is Base&apos;s native token standard powered by Rust precompiles embedded directly into the chain—making it faster, cheaper, and more secure than traditional ERC-20 smart contracts while maintaining full compatibility.
            </p>
            <div className="space-y-1.5">
              {B20_FEATURES.map(f => (
                <div key={f.label} className="flex items-start gap-2">
                  <span className={clsx('text-xs font-bold shrink-0 mt-0.5',
                    f.color === 'green' ? 'text-[#10B981]' :
                    f.color === 'blue' ? 'text-[#2dd4bf]' :
                    f.color === 'purple' ? 'text-[#a855f7]' :
                    f.color === 'orange' ? 'text-[#f5a623]' : 'text-[#4a5568]'
                  )}>✓</span>
                  <div>
                    <span className="text-[#e8eaf0] text-xs font-medium">{f.label}</span>
                    <span className="text-[#4a5568] text-xs"> — {f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <a href="https://docs.base.org/base-chain/specs/upgrades/beryl/b20"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#2dd4bf] text-xs font-medium mt-4 hover:text-[#0052ff] transition-colors">
              Technical Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Variant cards */}
          <div className="space-y-2">
            <p className="text-[#4a5568] text-xs font-semibold uppercase tracking-wider">Token Variant</p>
            {[
              { id: 'governance', label: 'Governance', desc: 'For DAO, protocol and utility tokens. Standard ERC-20 + permit + roles + policy.', uses: ['DAO Token', 'Utility Token', 'Protocol Token'] },
              { id: 'asset',      label: 'Asset',      desc: 'For stablecoins and RWAs. Includes rebasing, configurable decimals, and transfer memos.',  uses: ['Stablecoin', 'RWA', 'Equity Token'] },
            ].map(v => (
              <button key={v.id}
                onClick={() => set('variant', v.id as Variant)}
                className={clsx('w-full text-left p-4 rounded-xl border transition-all',
                  form.variant === v.id
                    ? 'bg-[#0052ff]/8 border-[#0052ff]/40'
                    : 'bg-[#0f1117] border-[#1e2535] hover:border-[#2a3348]'
                )}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[#e8eaf0] text-sm font-semibold">{v.label}</span>
                  {form.variant === v.id && <CheckCircle2 className="w-4 h-4 text-[#0052ff]" />}
                </div>
                <p className="text-[#8892a4] text-xs leading-relaxed mb-2">{v.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {v.uses.map(u => <Badge key={u} variant="gray">{u}</Badge>)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Form */}
        <div className="xl:col-span-2">
          <div className="bg-[#131720] border border-[#1e2535] rounded-2xl p-6">
            <StepIndicator current={step} />

            {/* Step 1: Token Info */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-[#e8eaf0] font-semibold text-base">Token Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Token Name" placeholder="e.g. My Awesome Token"
                    value={form.name} onChange={e => set('name', e.target.value)}
                    hint="Full token name" />
                  <Input label="Token Symbol" placeholder="e.g. MAT"
                    value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())}
                    hint="3-6 characters recommended" />
                </div>
                <div>
                  <label className="text-[#8892a4] text-xs font-medium uppercase tracking-wider block mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Briefly describe your token..."
                    rows={3}
                    className="w-full bg-[#0f1117] border border-[#1e2535] rounded-xl px-4 py-3 text-sm text-[#e8eaf0] placeholder-[#4a5568] focus:border-[#0052ff]/60 focus:ring-1 focus:ring-[#0052ff]/15 outline-none hover:border-[#2a3348] transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#8892a4] text-xs font-medium uppercase tracking-wider block mb-1.5">Decimals</label>
                    <div className="flex gap-2">
                      {['6', '8', '18'].map(d => (
                        <button key={d} onClick={() => set('decimals', d)}
                          className={clsx('flex-1 py-2 rounded-xl text-xs font-semibold border transition-all',
                            form.decimals === d
                              ? 'bg-[#0052ff]/15 border-[#0052ff]/40 text-[#2dd4bf]'
                              : 'bg-[#0f1117] border-[#1e2535] text-[#8892a4] hover:border-[#2a3348]'
                          )}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <Input label="Total Supply" placeholder="1000000000"
                    type="number" value={form.totalSupply}
                    onChange={e => set('totalSupply', e.target.value)}
                    hint={`= ${fmtSupply(form.totalSupply)} tokens`} />
                </div>
                <div>
                  <label className="text-[#8892a4] text-xs font-medium uppercase tracking-wider block mb-1.5">
                    Token Logo <span className="text-[#f87171]">*</span>
                  </label>
                  <label className={clsx(
                    "flex flex-col items-center justify-center h-24 bg-[#0f1117] border border-dashed rounded-xl cursor-pointer transition-all group",
                    logoPreview ? 'border-[#10B981]/40' : 'border-[#1e2535] hover:border-[#0052ff]/40'
                  )}>
                    {logoPreview ? (
                      <div className="relative">
                        <img src={logoPreview} alt="logo" className="w-16 h-16 rounded-xl object-cover" />
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.preventDefault(); 
                            setLogoPreview(null); 
                            set('logo', null); 
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-[#f87171] rounded-full flex items-center justify-center text-white hover:bg-[#ef4444] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-[#4a5568] group-hover:text-[#2dd4bf] transition-colors mb-1" />
                        <span className="text-[#4a5568] text-xs group-hover:text-[#8892a4] transition-colors">Upload PNG, JPG or SVG</span>
                        <span className="text-[#f87171] text-[10px] mt-1">Required</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setLogoPreview(URL.createObjectURL(f));
                          set('logo', f);
                        }
                      }} />
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Features */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-[#e8eaf0] font-semibold text-base">Token Features</h3>
                <div className="bg-[#0f1117] border border-[#f5a623]/20 rounded-xl p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-[#f5a623] shrink-0 mt-0.5" />
                  <p className="text-[#8892a4] text-xs">
                    These settings cannot be changed after deployment. Choose carefully.
                  </p>
                </div>
                <div className="opacity-50 pointer-events-none">
                  <Toggle checked={false} onChange={() => {}}
                    label="Mintable" desc="Permission to mint new tokens (Disabled for security)" />
                </div>
                <Toggle checked={form.burnable} onChange={v => set('burnable', v)}
                  label="Burnable" desc="Permission to burn tokens (role-based)" />
                <div className="opacity-50 pointer-events-none">
                  <Toggle checked={false} onChange={() => {}}
                    label="Pausable" desc="Pause all transfers in an emergency (Disabled for security)" />
                </div>
                <Toggle checked={form.permit} onChange={v => set('permit', v)}
                  label="ERC-2612 Permit" desc="Signature-based, gasless approvals" />
                <Toggle checked={form.supplyCap} onChange={v => set('supplyCap', v)}
                  label="Supply Cap" desc="Maximum token supply limit" />
                {form.supplyCap && (
                  <Input label="Maximum Supply" placeholder="e.g. 2000000000"
                    type="number" value={form.supplyCapAmount}
                    onChange={e => set('supplyCapAmount', e.target.value)} />
                )}
                <div>
                  <label className="text-[#8892a4] text-xs font-medium uppercase tracking-wider block mb-2">
                    Transfer Policy
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none',      label: 'Open',      desc: 'No restrictions'   },
                      { id: 'allowlist', label: 'Allowlist', desc: 'Permitted only'     },
                      { id: 'blocklist', label: 'Blocklist', desc: 'Blacklist addresses' },
                    ].map(p => (
                      <button key={p.id} onClick={() => set('policyType', p.id)}
                        className={clsx('p-3 rounded-xl border text-left transition-all',
                          form.policyType === p.id
                            ? 'bg-[#0052ff]/8 border-[#0052ff]/40'
                            : 'bg-[#0f1117] border-[#1e2535] hover:border-[#2a3348]'
                        )}>
                        <p className="text-[#e8eaf0] text-xs font-semibold">{p.label}</p>
                        <p className="text-[#4a5568] text-[10px] mt-0.5">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Allowlist Addresses */}
                {form.policyType === 'allowlist' && (
                  <div>
                    <label className="text-[#8892a4] text-xs font-medium uppercase tracking-wider block mb-1.5">
                      Allowed Addresses <span className="text-[#10B981]">(Enabled)</span>
                    </label>
                    <textarea
                      value={form.allowlistAddresses}
                      onChange={e => set('allowlistAddresses', e.target.value)}
                      placeholder="0x1234...&#10;0x5678...&#10;0xabcd...&#10;&#10;Enter one address per line"
                      rows={5}
                      className="w-full bg-[#0f1117] border border-[#10B981]/30 rounded-xl px-4 py-3 text-sm text-[#e8eaf0] placeholder-[#4a5568] focus:border-[#10B981]/60 focus:ring-1 focus:ring-[#10B981]/15 outline-none hover:border-[#10B981]/40 transition-all resize-none font-mono"
                    />
                    <p className="text-[#4a5568] text-xs mt-1">Only these addresses will be able to transfer tokens</p>
                  </div>
                )}
                
                {/* Blocklist Addresses */}
                {form.policyType === 'blocklist' && (
                  <div>
                    <label className="text-[#8892a4] text-xs font-medium uppercase tracking-wider block mb-1.5">
                      Blocked Addresses <span className="text-[#f87171]">(Enabled)</span>
                    </label>
                    <textarea
                      value={form.blocklistAddresses}
                      onChange={e => set('blocklistAddresses', e.target.value)}
                      placeholder="0x1234...&#10;0x5678...&#10;0xabcd...&#10;&#10;Enter one address per line"
                      rows={5}
                      className="w-full bg-[#0f1117] border border-[#f87171]/30 rounded-xl px-4 py-3 text-sm text-[#e8eaf0] placeholder-[#4a5568] focus:border-[#f87171]/60 focus:ring-1 focus:ring-[#f87171]/15 outline-none hover:border-[#f87171]/40 transition-all resize-none font-mono"
                    />
                    <p className="text-[#4a5568] text-xs mt-1">These addresses will be prevented from transferring tokens</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Social */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-[#e8eaf0] font-semibold text-base">Social & Metadata</h3>
                <Input label="Website" placeholder="https://mytoken.com"
                  value={form.website} onChange={e => set('website', e.target.value)} />
                <Input label="Twitter / X" placeholder="https://x.com/mytoken"
                  value={form.twitter} onChange={e => set('twitter', e.target.value)} />
                <Input label="Telegram" placeholder="https://t.me/mytoken"
                  value={form.telegram} onChange={e => set('telegram', e.target.value)} />
                <div className="bg-[#0f1117] border border-[#1e2535] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-[#2dd4bf]" />
                    <span className="text-[#e8eaf0] text-xs font-semibold">Contract URI (ERC-7572)</span>
                  </div>
                  <p className="text-[#8892a4] text-xs">
                    Social links are stored on-chain in ERC-7572 format and automatically shown on all supporting platforms.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Preview */}
            {step === 4 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-[#e8eaf0] font-semibold text-base">Deploy Preview</h3>
                <div className="bg-[#0f1117] border border-[#1e2535] rounded-xl divide-y divide-[#1e2535]">
                  {[
                    { label: 'Token Name',        value: form.name || '—' },
                    { label: 'Symbol',            value: form.symbol || '—' },
                    { label: 'Logo',              value: form.logo ? '✓ Uploaded' : '✗ Missing' },
                    { label: 'Variant',           value: form.variant === 'asset' ? 'Asset (Rebasing)' : 'Governance' },
                    { label: 'Decimals',          value: form.decimals },
                    { label: 'Total Supply',      value: `${fmtSupply(form.totalSupply)} ${form.symbol}` },
                    { label: 'Mintable',          value: form.mintable ? '✓ Enabled' : '✗ Disabled' },
                    { label: 'Burnable',          value: form.burnable ? '✓ Enabled' : '✗ Disabled' },
                    { label: 'Pausable',          value: form.pausable ? '✓ Enabled' : '✗ Disabled' },
                    { label: 'ERC-2612 Permit',   value: form.permit   ? '✓ Enabled' : '✗ Disabled' },
                    { label: 'Transfer Policy',   value: form.policyType === 'none' ? 'Open' : form.policyType === 'allowlist' ? 'Allowlist' : 'Blocklist' },
                    ...(form.policyType === 'allowlist' ? [{ label: 'Allowed Addresses', value: form.allowlistAddresses ? `${form.allowlistAddresses.split('\n').filter(a => a.trim()).length} addresses` : 'None' }] : []),
                    ...(form.policyType === 'blocklist' ? [{ label: 'Blocked Addresses', value: form.blocklistAddresses ? `${form.blocklistAddresses.split('\n').filter(a => a.trim()).length} addresses` : 'None' }] : []),
                    { label: 'Network',           value: 'Base Mainnet (8453)' },
                    { label: 'Standard',          value: 'B20 Beryl' },
                    { label: 'Estimated Gas',     value: '~$0.05' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[#8892a4] text-xs">{r.label}</span>
                      <span className={clsx('text-xs font-semibold',
                        r.value.startsWith('✓') ? 'text-[#10B981]' :
                        r.value.startsWith('✗') ? 'text-[#4a5568]' : 'text-[#e8eaf0]'
                      )}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 bg-[#10B981]/8 border border-[#10B981]/20 rounded-xl p-3">
                  <Shield className="w-4 h-4 text-[#10B981] shrink-0" />
                  <p className="text-[#8892a4] text-xs">
                    Your B20 token is deployed directly through Base&apos;s built-in factory. Zero third-party contract risk.
                  </p>
                </div>
                <Button fullWidth size="lg" onClick={deploy} loading={deploying}
                  icon={<Rocket className="w-4 h-4" />}
                  disabled={!launchpadEnabled || activationLoading || deploying}>
                  {deploying ? 'Deploying...' : !launchpadEnabled ? 'Waiting for Mainnet Activation' : 'Deploy to Base Mainnet'}
                </Button>
              </div>
            )}

            {/* Nav buttons */}
            {step < 4 && (
              <div className="flex gap-3 mt-6 pt-5 border-t border-[#1e2535]">
                {step > 1 && (
                  <Button variant="secondary" onClick={() => setStep(s => (s - 1) as Step)}>
                    ← Back
                  </Button>
                )}
                <Button fullWidth onClick={() => setStep(s => (s + 1) as Step)}
                  iconRight={<ChevronRight className="w-4 h-4" />}
                  disabled={step === 1 && (!form.name || !form.symbol || !form.logo)}>
                  {step === 3 ? 'Preview' : 'Continue'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
