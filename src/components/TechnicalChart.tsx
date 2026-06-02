/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Area,
} from 'recharts';
import { AreaChart, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { Candlestick } from '../types';

interface TechnicalChartProps {
  candles: Candlestick[];
  symbol: string;
  activePrice: number;
}

export const TechnicalChart: React.FC<TechnicalChartProps> = ({
  candles,
  symbol,
  activePrice,
}) => {
  const [showBB, setShowBB] = useState(true);
  const [showEMAs, setShowEMAs] = useState(true);

  if (!candles || candles.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl h-[400px] flex flex-col items-center justify-center p-6 text-zinc-500">
        <AreaChart className="h-10 w-10 animate-pulse mb-3" />
        <p className="text-sm font-medium">Sincronizando feed de mercado en tiempo real...</p>
      </div>
    );
  }

  // Find the min and max values to dynamically scale the Y-axis so the chart doesn't flatten out
  const last30 = candles.slice(-40);
  const prices = last30.flatMap((c) => [
    c.open,
    c.high,
    c.low,
    c.close,
    showBB && c.bbUpper ? c.bbUpper : c.close,
    showBB && c.bbLower ? c.bbLower : c.close,
  ].filter(v => v !== undefined && !isNaN(v)));

  const minVal = Math.min(...prices);
  const maxVal = Math.max(...prices);
  const padding = (maxVal - minVal) * 0.08 || 0.001;

  // Last closed candle info
  const lastCandle = last30[last30.length - 1];
  const isUpClose = lastCandle.close >= lastCandle.open;
  const changeValue = lastCandle.close - lastCandle.open;

  // Dynamic decimal formatting based on magnitude (e.g. BTC vs EUR/USD vs JPY vs USD/PHP)
  const getDecimalCount = (val: number) => {
    if (!val || isNaN(val)) return 4;
    const absVal = Math.abs(val);
    if (absVal > 10000) return 0; // BTC
    if (absVal > 1000) return 1;  // ETH, Gold
    if (absVal > 100) return 2;   // JPY
    if (absVal > 20) return 3;    // USD/PHP, etc.
    return 4;                     // EUR/USD, GBP/USD, etc
  };

  const d = getDecimalCount(activePrice || lastCandle?.close || 1);

  // Custom tooltips to show technical outputs
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as Candlestick;
      const formattedTime = new Date(data.time * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="text-zinc-400 font-bold mb-1 border-b border-zinc-800 pb-1">VELETA {formattedTime}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-zinc-500">Apertura:</span>
            <span className="text-zinc-300 font-medium">{data.open.toFixed(d)}</span>
            <span className="text-zinc-500">Máximo:</span>
            <span className="text-emerald-400 font-medium">{data.high.toFixed(d)}</span>
            <span className="text-zinc-500">Mínimo:</span>
            <span className="text-rose-400 font-medium">{data.low.toFixed(d)}</span>
            <span className="text-zinc-500">Cierre:</span>
            <span className="text-zinc-300 font-medium">{data.close.toFixed(d)}</span>
            
            {showEMAs && (
              <>
                <span className="text-rose-500/80">EMA (9):</span>
                <span className="text-rose-400 font-medium">{data.ema9?.toFixed(d) || 'N/A'}</span>
                <span className="text-sky-500/80">EMA (21):</span>
                <span className="text-sky-400 font-medium">{data.ema21?.toFixed(d) || 'N/A'}</span>
              </>
            )}
            {showBB && (
              <>
                <span className="text-indigo-500/80">BB Upper:</span>
                <span className="text-indigo-400 font-medium">{data.bbUpper?.toFixed(d) || 'N/A'}</span>
                <span className="text-indigo-500/80">BB Lower:</span>
                <span className="text-indigo-400 font-medium">{data.bbLower?.toFixed(d) || 'N/A'}</span>
              </>
            )}
            <span className="text-zinc-500">Volumen:</span>
            <span className="text-zinc-300 font-medium">{data.volume} ops</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 flex flex-col h-full shadow-lg">
      
      {/* Chart Headers with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-base text-zinc-50">{symbol}</h3>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
              isUpClose ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
            }`}>
              {isUpClose ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isUpClose ? '+' : ''}{changeValue.toFixed(d)}
            </span>
          </div>
          <p className="text-xs text-zinc-400">Grafica técnica e indicadores para binarias en tiempo real</p>
        </div>

        {/* Toggle Layer buttons */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-bb-btn"
            onClick={() => setShowBB(!showBB)}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              showBB
                ? "bg-indigo-950/30 border-indigo-700/50 text-indigo-300"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-400"
            }`}
          >
            {showBB ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3.5 w-3.5" />}
            Bandas B (20,2)
          </button>
          <button
            id="toggle-ema-btn"
            onClick={() => setShowEMAs(!showEMAs)}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              showEMAs
                ? "bg-rose-950/35 border-rose-800/50 text-rose-300"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-400"
            }`}
          >
            {showEMAs ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3.5 w-3.5" />}
            EMAs (9/21)
          </button>
        </div>
      </div>

      {/* Main Chart viewport */}
      <div className="flex-1 min-h-[300px] w-full relative">
        <ResponsiveContainer width="100%" height={320} key={`${symbol}-${showBB}-${showEMAs}`}>
          <ComposedChart data={last30} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t) => {
                const date = new Date(t * 1000);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }}
              stroke="#52525b"
              tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#3f3f46' }}
            />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              orientation="right"
              stroke="#52525b"
              tickFormatter={(v) => v.toFixed(d)}
              tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#3f3f46' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Bollinger Band Shading */}
            <Area
              type="monotone"
              dataKey="bbUpper"
              stroke="transparent"
              fill={showBB ? "rgba(99, 102, 241, 0.05)" : "transparent"}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="bbLower"
              stroke="transparent"
              fill="transparent"
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="bbMiddle"
              stroke={showBB ? "#6366f1" : "transparent"}
              strokeWidth={showBB ? 1.2 : 0}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
            />

            {/* EMA lines */}
            <Line
              type="monotone"
              dataKey="ema9"
              stroke={showEMAs ? "#f43f5e" : "transparent"}
              strokeWidth={showEMAs ? 1.8 : 0}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="ema21"
              stroke={showEMAs ? "#3b82f6" : "transparent"}
              strokeWidth={showEMAs ? 1.8 : 0}
              dot={false}
              activeDot={false}
            />

            {/* Candlestick visual blocks (represented as line connect + high-low bar) */}
            {/* High/Low wick bars */}
            <Bar
              dataKey="high"
              fill="#27272a"
              opacity={0.3}
              maxBarSize={2}
              activeDot={false}
            />
            {/* Candle body close point line (gives smooth, ultra reactive view) */}
            <Line
              type="monotone"
              dataKey="close"
              stroke={isUpClose ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={true}
              activeDot={{ r: 4 }}
            />

            {/* Dynamic Real-time horizontal line highlighting current price */}
            <ReferenceLine
              y={activePrice}
              stroke={isUpClose ? '#059669' : '#dc2626'}
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Live floating HUD bar */}
        <div className="absolute top-2 left-2 bg-zinc-950/95 border border-zinc-800 rounded-lg p-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[9px] sm:text-[10px] font-mono z-10 shadow-lg max-w-[calc(100%-16px)] mr-2">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-zinc-500">EMA9:</span>
            <span className="text-rose-400 font-bold">
              {lastCandle?.ema9?.toFixed(d) || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
            <span className="text-zinc-500">EMA21:</span>
            <span className="text-sky-400 font-bold">
              {lastCandle?.ema21?.toFixed(d) || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-zinc-500">RSI:</span>
            <span className="text-indigo-400 font-bold">
              {lastCandle?.rsi?.toFixed(1) || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
            <span className="text-zinc-500">Stoch_K/D:</span>
            <span className="text-yellow-400 font-bold">
              {lastCandle?.stochK?.toFixed(0) || 'N/A'}
            </span>
            <span className="text-zinc-500">/</span>
            <span className="text-orange-400 font-bold">
              {lastCandle?.stochD?.toFixed(0) || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            <span className="text-zinc-500">MACD:</span>
            <span className="text-purple-400 font-bold">
              {lastCandle?.macd?.toFixed(5) || 'N/A'}
            </span>
          </div>
        </div>

        {/* Large Floating live price banner on the right coordinate */}
        <div className="absolute right-1 top-[45%] bg-zinc-900 border border-zinc-700/80 rounded-l-md px-2 py-1 flex items-center justify-center font-mono text-xs font-bold text-zinc-100 z-10 border-r-0 transform shadow px-3">
          <span className="animate-pulse mr-1">●</span>
          {activePrice.toFixed(d)}
        </div>
      </div>
    </div>
  );
};
