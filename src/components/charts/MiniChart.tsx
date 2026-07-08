'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Generate realistic chart data
 * Fixed: More stable data generation, less random jumps
 */
function generateData(points = 20, trend: 'up' | 'down' | 'volatile' = 'up', base = 100) {
  const data = [];
  let val = base;
  
  // Use smaller, more realistic changes
  const volatility = trend === 'volatile' ? 0.03 : 0.01; // 1-3% changes
  const bias = trend === 'up' ? 0.002 : trend === 'down' ? -0.002 : 0; // Slight bias
  
  for (let i = 0; i < points; i++) {
    // Random walk with bias
    const randomChange = (Math.random() - 0.5) * volatility;
    const change = randomChange + bias;
    
    val = val * (1 + change);
    
    // Ensure value doesn't go negative or too extreme
    val = Math.max(base * 0.7, Math.min(base * 1.5, val));
    
    data.push({ v: parseFloat(val.toFixed(4)), i });
  }
  
  return data;
}

interface MiniChartProps {
  positive?: boolean;
  trend?: 'up' | 'down' | 'volatile';
  height?: number;
  data?: { v: number; i?: number }[];
}

export function MiniChart({ positive = true, trend = 'up', height = 40, data }: MiniChartProps) {
  const chartData = data ?? generateData(20, trend);
  const color = positive ? '#10B981' : '#ff4d6a';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`mini-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#mini-${color.slice(1)})`}
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface FullChartProps {
  data: { time: string; value: number }[];
  color?: string;
  height?: number;
  showAxes?: boolean;
  showTooltip?: boolean;
}

export function FullChart({
  data,
  color = '#0052ff',
  height = 200,
  showAxes = false,
  showTooltip = true,
}: FullChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`full-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxes && (
          <>
            <XAxis
              dataKey="time"
              tick={{ fill: '#6B8A99', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6B8A99', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={55}
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={v => {
                const val = typeof v === 'number' ? v : Number(v) || 0;
                if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
                if (val >= 1) return `$${val.toFixed(0)}`;
                return `$${val.toFixed(4)}`;
              }}
            />
          </>
        )}
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: '#0A1520',
              border: '1px solid #253C48',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#E2EAF0',
              padding: '6px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
            formatter={(v) => {
              const val = typeof v === 'number' ? v : Number(v) || 0;
              if (val >= 1000) {
                return [`$${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 'Price'];
              } else if (val >= 1) {
                return [`$${val.toFixed(2)}`, 'Price'];
              } else {
                return [`$${val.toFixed(6)}`, 'Price'];
              }
            }}
            labelFormatter={(label) => label}
            labelStyle={{ color: '#6B8A99', fontSize: '11px', marginBottom: '2px' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#full-${color.slice(1)})`}
          dot={false}
          activeDot={{ r: 5, fill: color, stroke: '#111B22', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Generate volume chart data based on real price with realistic fluctuation
export function generateChartData(points = 30, currentPrice = 4000, volatility = 0.08) {
  const now = Date.now();
  const data = [];

  const isHourly = points <= 24;
  const timeStep = isHourly ? 3600000 : 86400000;
  const startPrice = Math.max(0.000001, currentPrice * (1 - volatility * 0.8));
  const trendStep = (currentPrice - startPrice) / Math.max(1, points - 1);

  for (let i = 0; i < points; i++) {
    const wave = Math.sin((i + 1) / 3) * currentPrice * volatility * 0.35;
    const drift = i * trendStep;
    let val = startPrice + drift + wave;

    if (i === points - 1) {
      val = currentPrice;
    }

    const date = new Date(now - (points - i - 1) * timeStep);
    const timeLabel = isHourly
      ? date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    data.push({
      time: timeLabel,
      value: Math.max(0, Math.round(val * 1000000) / 1000000),
    });
  }

  return data;
}
