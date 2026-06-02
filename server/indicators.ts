/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candlestick } from "../src/types";

// Helper to calculate Simple Moving Average
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Calculate Exponential Moving Average
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  if (prices.length === 0) return [];
  
  const k = 2 / (period + 1);
  let prevEma = prices[0];
  ema.push(prevEma);
  
  for (let i = 1; i < prices.length; i++) {
    const curEma = prices[i] * k + prevEma * (1 - k);
    ema.push(curEma);
    prevEma = curEma;
  }
  return ema;
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMult: number = 2
): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const lastPrice = prices[prices.length - 1] || 0;
    return { upper: lastPrice, middle: lastPrice, lower: lastPrice };
  }
  
  const relevant = prices.slice(-period);
  const avg = relevant.reduce((sum, val) => sum + val, 0) / period;
  
  const variance = relevant.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    middle: avg,
    upper: avg + stdDevMult * stdDev,
    lower: avg - stdDevMult * stdDev,
  };
}

// Calculate Relative Strength Index (RSI)
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length <= period) return 50;
  
  let gains = 0;
  let losses = 0;
  
  // First RSI calculation based on changes
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Smooth RSI for the rest of prices
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Compute all indicators for a series of candlesticks
export function enrichCandlesticks(candles: Candlestick[]): Candlestick[] {
  const closes = candles.map(c => c.close);
  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  
  // High-performance proper C-style MACD calculation
  const ema12Series = calculateEMA(closes, 12);
  const ema26Series = calculateEMA(closes, 26);
  const macdSeries = candles.map((_, idx) => ema12Series[idx] - ema26Series[idx]);
  const macdSignalSeries = calculateEMA(macdSeries, 9);
  
  // Stochastic Oscillator (14, 3, 3)
  const rawKSeries: number[] = [];
  for (let idx = 0; idx < candles.length; idx++) {
    if (idx < 13) {
      rawKSeries.push(50);
      continue;
    }
    const subset = candles.slice(idx - 13, idx + 1);
    const subsetHighs = subset.map(c => c.high);
    const subsetLows = subset.map(c => c.low);
    const highestHigh = Math.max(...subsetHighs);
    const lowestLow = Math.min(...subsetLows);
    const currentClose = closes[idx];
    const range = highestHigh - lowestLow;
    const rawK = range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100;
    rawKSeries.push(rawK);
  }

  // Smooth %K with 3-period SMA
  const stochKSeries: number[] = [];
  for (let idx = 0; idx < rawKSeries.length; idx++) {
    const start = Math.max(0, idx - 2);
    const subset = rawKSeries.slice(start, idx + 1);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    stochKSeries.push(avg);
  }

  // Smooth %D with 3-period SMA of %K
  const stochDSeries: number[] = [];
  for (let idx = 0; idx < stochKSeries.length; idx++) {
    const start = Math.max(0, idx - 2);
    const subset = stochKSeries.slice(start, idx + 1);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    stochDSeries.push(avg);
  }

  // Calculate Bollinger Bands and RSI for each candle dynamically
  return candles.map((candle, idx) => {
    const subsetCloses = closes.slice(0, idx + 1);
    const rsi = calculateRSI(subsetCloses, 14);
    const bb = calculateBollingerBands(subsetCloses, 20, 2);
    
    const macdVal = macdSeries[idx];
    const macdSig = macdSignalSeries[idx];
    
    return {
      ...candle,
      ema9: ema9Series[idx],
      ema21: ema21Series[idx],
      rsi,
      bbMiddle: bb.middle,
      bbUpper: bb.upper,
      bbLower: bb.lower,
      macd: macdVal,
      macdSignal: macdSig,
      macdHist: macdVal - macdSig,
      stochK: stochKSeries[idx],
      stochD: stochDSeries[idx],
    };
  });
}
