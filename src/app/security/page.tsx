'use client';

import { useState } from 'react';
import { Shield, Search, CheckCircle, XCircle, AlertCircle, ExternalLink, Lock, Zap, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { SecurityScanResult } from '@/lib/security-scanner';

interface CheckResult { label: string; value: string; status: 'pass'|'fail'|'warn'|'info'; detail?: string; }
interface AnalysisResult {
  score: number; grade: string;
  token: { name:string; address:string; network:string; supply:string; holders:string; b20:boolean; };
  checks: CheckResult[];
}

function mapScanToAnalysisResult(result: SecurityScanResult, query: string): AnalysisResult {
  const score = result.securityScore;
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Warning' : 'Danger';

  return {
    score,
    grade,
    token: {
      name: query.trim().toLowerCase().startsWith('0x') ? 'Token Scan' : query.trim(),
      address: query.trim(),
      network: 'Base Mainnet',
      supply: result.totalSupply || result.lpTotalSupply || 'Unknown',
      holders: `${result.holderCount || 0}`,
      b20: true,
    },
    checks: [
      { label: 'Open Source', value: result.isOpenSource ? 'Yes' : 'Unknown', status: result.isOpenSource ? 'pass' : 'warn', detail: result.isOpenSource ? 'Contract metadata appears available' : 'No open-source indicator returned' },
      { label: 'Proxy Contract', value: result.isProxy ? 'Yes' : 'No', status: result.isProxy ? 'fail' : 'pass', detail: result.isProxy ? 'Upgradeability detected' : 'No proxy pattern detected' },
      { label: 'Mintable', value: result.isMintable ? 'Yes' : 'No', status: result.isMintable ? 'warn' : 'pass', detail: result.isMintable ? 'Token can mint additional supply' : 'No minting detected' },
      { label: 'Ownership Risk', value: result.canTakeBackOwnership ? 'High' : 'Low', status: result.canTakeBackOwnership ? 'fail' : 'pass', detail: result.canTakeBackOwnership ? 'Owner may reclaim control' : 'Control appears restricted' },
      { label: 'Honeypot', value: result.isHoneypot ? 'Detected' : 'Not Detected', status: result.isHoneypot ? 'fail' : 'pass', detail: result.isHoneypot ? 'Sell simulation failed' : 'No honeypot pattern found' },
      { label: 'Buy / Sell Tax', value: `${result.buyTax.toFixed(2)}% / ${result.sellTax.toFixed(2)}%`, status: result.buyTax > 5 || result.sellTax > 5 ? 'warn' : 'pass', detail: 'Fee impact from transfer taxes' },
      { label: 'Cool down / Pause', value: result.tradingCooldown || result.transferPausable ? 'Yes' : 'No', status: result.tradingCooldown || result.transferPausable ? 'warn' : 'pass', detail: 'Trading controls or pause hooks detected' },
      { label: 'Holder Distribution', value: result.holderCount > 1000 ? 'Healthy' : 'Moderate', status: result.holderCount > 1000 ? 'pass' : 'warn', detail: 'Holder concentration and distribution' },
    ],
  };
}

const RECENT_SCANS = [
  { symbol:'BRETT', score:88, grade:'Good',      b20:false, time:'5m'  },
  { symbol:'PUAN',  score:95, grade:'Excellent', b20:true,  time:'12m' },
  { symbol:'SCAM1', score:12, grade:'Danger',    b20:false, time:'1h'  },
  { symbol:'DEGEN', score:74, grade:'Good',      b20:false, time:'2h'  },
];

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#f59e0b' : '#ff4d6a';
  const r = 42; const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1B2A32" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score/100)}
          strokeLinecap="round" style={{transition:'stroke-dashoffset 1s ease'}} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white text-2xl font-bold">{score}</span>
        <span className="text-[10px] font-medium" style={{color}}>{grade}</span>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const [query, setQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

  const analyze = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!isValidAddress(trimmed)) {
      setErrorMessage('Please enter a valid Ethereum/Base contract address.');
      return;
    }

    setErrorMessage(null);
    setAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/security?address=${encodeURIComponent(trimmed)}`);
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Scan failed');
      }

      const mapped = mapScanToAnalysisResult(payload.result as SecurityScanResult, trimmed);
      setResult(mapped);
    } catch (error) {
      console.error('Security scan failed:', error);
      setResult({
        score: 0,
        grade: 'Danger',
        token: { name: 'Scan Error', address: trimmed, network: 'Base Mainnet', supply: 'Unknown', holders: '0', b20: true },
        checks: [{ label: 'Scan Status', value: 'Failed', status: 'fail', detail: error instanceof Error ? error.message : 'Unable to complete scan' }],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const statusIcon = (s: CheckResult['status']) => ({
    pass: <CheckCircle  className="w-4 h-4 text-[#10B981]" />,
    fail: <XCircle     className="w-4 h-4 text-[#ff4d6a]" />,
    warn: <AlertCircle className="w-4 h-4 text-[#f59e0b]" />,
    info: <AlertCircle className="w-4 h-4 text-[#2dd4bf]" />,
  }[s]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in space-y-5 sm:space-y-6">
      {/* Search */}
      <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/25 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[#2dd4bf]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Token Security Analysis</h2>
            <p className="text-[#3D5A6A] text-xs">Enter a contract address or token symbol</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D5A6A]" />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && analyze()}
              placeholder="0x... contract address"
              className="w-full bg-[#0A1520] border border-[#1B2A32] rounded-xl pl-9 pr-4 h-11 text-sm text-white placeholder-[#3D5A6A] focus:border-[#14B8A6]/50 focus:ring-1 focus:ring-[#14B8A6]/10 outline-none hover:border-[#253C48] transition-all" />
          </div>
          <Button onClick={analyze} loading={analyzing} icon={<Zap className="w-4 h-4" />} size="lg">Analyze</Button>
        </div>
        {errorMessage && <p className="text-[#ff4d6a] text-xs mt-2">{errorMessage}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { icon: Eye,    label:'Honeypot Detection', desc:'Buy/sell simulation'    },
            { icon: Lock,   label:'Liquidity Check',    desc:'Lock status and duration'},
            { icon: Shield, label:'Contract Security',  desc:'Mint, pause, backdoor'  },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-3 flex items-start gap-2">
              <Icon className="w-4 h-4 text-[#2dd4bf] shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-[#3D5A6A] text-[10px] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2">
          {!result && !analyzing && (
            <div className="bg-[#111B22] border border-dashed border-[#1B2A32] rounded-2xl p-8 sm:p-12 text-center">
              <Shield className="w-12 h-12 text-[#1B2A32] mx-auto mb-3" />
              <p className="text-[#3D5A6A] text-sm">Enter an address above to analyze</p>
            </div>
          )}
          {analyzing && (
            <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#14B8A6]/30 border-t-[#14B8A6] animate-spin" />
              <p className="text-white text-sm font-semibold">Analyzing...</p>
              <p className="text-[#3D5A6A] text-xs mt-1">Scanning contract code and transaction history</p>
            </div>
          )}
          {result && (
            <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 border-b border-[#1B2A32] bg-gradient-to-r from-[#0A1520] to-transparent">
                <ScoreRing score={result.score} grade={result.grade} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-white font-bold text-sm">{result.token.name}</h3>
                    {result.token.b20 && <Badge variant="blue">B20</Badge>}
                    <Badge variant={result.score>=80?'green':result.score>=60?'yellow':'red'}>{result.grade}</Badge>
                  </div>
                  <p className="text-[#3D5A6A] text-xs font-mono mb-2">{result.token.address}</p>
                  <div className="flex flex-wrap gap-3">
                    {[{l:'Network',v:result.token.network},{l:'Supply',v:result.token.supply},{l:'Holders',v:result.token.holders}].map(({l,v})=>(
                      <div key={l}><span className="text-[#3D5A6A] text-xs">{l}: </span><span className="text-white text-xs font-semibold">{v}</span></div>
                    ))}
                  </div>
                </div>
                <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="text-[#2dd4bf] hover:text-[#14B8A6] shrink-0"><ExternalLink className="w-4 h-4" /></a>
              </div>
              <div className="divide-y divide-[#1B2A32]">
                {result.checks.map((c,i) => (
                  <div key={i} className="flex items-start gap-3 px-4 sm:px-5 py-3 hover:bg-[#0f1e2a] transition-colors">
                    <div className="shrink-0">{statusIcon(c.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white text-sm font-medium">{c.label}</span>
                        <span className={clsx('text-xs font-semibold shrink-0',
                          c.status==='pass'?'text-[#10B981]':c.status==='fail'?'text-[#ff4d6a]':c.status==='warn'?'text-[#f59e0b]':'text-[#2dd4bf]'
                        )}>{c.value}</span>
                      </div>
                      {c.detail && <p className="text-[#3D5A6A] text-xs mt-0.5">{c.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 sm:px-5 py-3 bg-[#0A1520]/50 border-t border-[#1B2A32]">
                <p className="text-[#3D5A6A] text-xs text-center">Last updated: 2 min ago · For informational purposes only.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl p-5">
            <h3 className="text-white text-sm font-semibold mb-4">Recent Scans</h3>
            <div className="space-y-2">
              {RECENT_SCANS.map((s,i) => {
                const c = s.score>=80?'#10B981':s.score>=60?'#f59e0b':'#ff4d6a';
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#0A1520] border border-[#1B2A32] rounded-xl hover:border-[#253C48] transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{background:c+'20',color:c}}>{s.symbol[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-xs font-semibold">{s.symbol}</span>
                        {s.b20 && <Badge variant="blue">B20</Badge>}
                      </div>
                      <p className="text-[#3D5A6A] text-[10px]">{s.time} ago</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{color:c}}>{s.score}</p>
                      <p className="text-[10px]" style={{color:c}}>{s.grade}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl p-5">
            <h3 className="text-white text-sm font-semibold mb-3">Score Guide</h3>
            <div className="space-y-2">
              {[
                {range:'80-100',label:'Excellent',color:'#10B981',desc:'Looks safe'},
                {range:'60-79', label:'Good',      color:'#2dd4bf',desc:'Generally fine'},
                {range:'40-59', label:'Warning',   color:'#f59e0b',desc:'Proceed with care'},
                {range:'0-39',  label:'Danger',    color:'#ff4d6a',desc:'High risk'},
              ].map(g=>(
                <div key={g.range} className="flex items-center gap-3">
                  <div className="w-8 h-5 rounded text-[10px] font-bold flex items-center justify-center" style={{background:g.color+'20',color:g.color}}>{g.range.split('-')[0]}</div>
                  <div><span className="text-xs font-semibold" style={{color:g.color}}>{g.label}</span><span className="text-[#3D5A6A] text-xs"> — {g.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
