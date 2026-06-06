/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candlestick } from "../src/types";
import { enrichCandlesticks } from "./indicators";

interface MarketConfig {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number; // percentage of price variation
  trend: number; // bias per step
}

export class MarketSimulator {
  private candles: Record<string, Candlestick[]> = {};
  private configs: Record<string, MarketConfig> = {};
  private activeIntervals: Record<string, NodeJS.Timeout> = {};
  private tickCallback?: (symbol: string, currentPrice: number, candles: Candlestick[]) => void;
  private lastInjectedTime: Record<string, number> = {};
  private liveAssets: Set<string> = new Set();

  constructor() {
    this.configs = {
      "EUR/USD (OTC)": { symbol: "EUR/USD (OTC)", name: "Euro / US Dollar OTC", basePrice: 1.0850, volatility: 0.00018, trend: 0 },
      "GBP/USD (OTC)": { symbol: "GBP/USD (OTC)", name: "Great Britain Pound / US Dollar OTC", basePrice: 1.2640, volatility: 0.00020, trend: 0 },
      "EUR/GBP (OTC)": { symbol: "EUR/GBP (OTC)", name: "Euro / Great Britain Pound OTC", basePrice: 0.8560, volatility: 0.00015, trend: 0 },
      "USD/CAD (OTC)": { symbol: "USD/CAD (OTC)", name: "US Dollar / Canadian Dollar OTC", basePrice: 1.3650, volatility: 0.00022, trend: 0 },
      "USD/BRL (OTC)": { symbol: "USD/BRL (OTC)", name: "US Dollar / Brazil Real OTC", basePrice: 5.1520, volatility: 0.00085, trend: 0 },
      "AUD/USD (OTC)": { symbol: "AUD/USD (OTC)", name: "Australian Dollar / US Dollar OTC", basePrice: 0.6650, volatility: 0.00018, trend: 0 },
      "USD/JPY (OTC)": { symbol: "USD/JPY (OTC)", name: "US Dollar / Japanese Yen OTC", basePrice: 156.80, volatility: 0.025, trend: 0 },
      "EUR/JPY (OTC)": { symbol: "EUR/JPY (OTC)", name: "Euro / Japanese Yen OTC", basePrice: 169.50, volatility: 0.030, trend: 0 },
      "GBP/JPY (OTC)": { symbol: "GBP/JPY (OTC)", name: "Great Britain Pound / Japanese Yen OTC", basePrice: 198.20, volatility: 0.035, trend: 0 },
      "EUR/USD": { symbol: "EUR/USD", name: "Euro / US Dollar LIVE", basePrice: 1.0855, volatility: 0.00014, trend: 0 },
      "GBP/USD": { symbol: "GBP/USD", name: "Great Britain Pound / US Dollar LIVE", basePrice: 1.2645, volatility: 0.00016, trend: 0 },
      "USD/JPY": { symbol: "USD/JPY", name: "US Dollar / Japanese Yen LIVE", basePrice: 156.75, volatility: 0.022, trend: 0 },
      "BTC/USD": { symbol: "BTC/USD", name: "Bitcoin / US Dollar", basePrice: 67845.0, volatility: 12.5, trend: 0 },
      "ETH/USD": { symbol: "ETH/USD", name: "Ethereum / US Dollar", basePrice: 3480.0, volatility: 0.85, trend: 0 },
    };

    this.initializeHistory();
  }

  // Pre-seed some candles for realistic immediate charting
  private initializeHistory() {
    const now = Math.floor(Date.now() / 1000);
    const candleDuration = 60; // 1-minute historical candles

    for (const [symbol, config] of Object.entries(this.configs)) {
      const symbolCandles: Candlestick[] = [];
      let currentPrice = config.basePrice;

      // Seed 120 historical candles (2 hours)
      for (let i = 120; i >= 0; i--) {
        const time = now - (i * candleDuration);
        const open = currentPrice;
        
        // Random walk
        const change = (Math.random() - 0.5) * config.volatility * 4 + config.trend;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * config.volatility * 2;
        const low = Math.min(open, close) - Math.random() * config.volatility * 2;
        const volume = Math.floor(Math.random() * 800) + 200;

        symbolCandles.push({
          time,
          open,
          high,
          low,
          close,
          volume,
        });

        currentPrice = close;
      }

      this.candles[symbol] = enrichCandlesticks(symbolCandles);
    }
  }

  // Retrieve current assets list
  public getAssetsInfo() {
    return Object.values(this.configs).map(c => {
      const history = this.candles[c.symbol];
      const last = history[history.length - 1];
      const prev = history[history.length - 15] || history[0];
      const change24h = ((last.close - prev.close) / prev.close) * 100;
      
      return {
        symbol: c.symbol,
        name: c.name,
        price: last.close,
        change24h,
        payoutRate: c.symbol.includes("OTC") ? 88 + Math.floor(Math.random() * 4) : 75 + Math.floor(Math.random() * 6),
      };
    });
  }

  // Register and initialize any new asset on the fly
  public ensureAsset(symbol: string, initialPrice?: number) {
    if (this.configs[symbol]) {
      const currentConfig = this.configs[symbol];
      if (initialPrice !== undefined) {
        const history = this.candles[symbol];
        if (history && history.length > 0) {
          const lastClose = history[history.length - 1].close;
          const diffPct = Math.abs(lastClose - initialPrice) / initialPrice;
          
          // If the difference is greater than 0.1%, align & reseed to ensure absolute flawless alignment
          if (diffPct > 0.001) {
            console.log(`📡 Aligning asset ${symbol} basePrice change from ${lastClose.toFixed(4)} to ${initialPrice.toFixed(4)}`);
            currentConfig.basePrice = initialPrice;
            this.reseedHistory(symbol, initialPrice);
          }
        } else {
          currentConfig.basePrice = initialPrice;
          this.reseedHistory(symbol, initialPrice);
        }
      }
      return;
    }

    console.log(`📡 Dynamically registering and seeding new active asset: ${symbol} with price ${initialPrice || 'default'}`);
    
    // Guess reasonable values based on name
    let basePrice = initialPrice !== undefined ? initialPrice : 1.0;
    if (initialPrice === undefined) {
      if (symbol.includes("JPY")) basePrice = 155.0;
      else if (symbol.includes("BTC")) basePrice = 68000.0;
      else if (symbol.includes("ETH")) basePrice = 3500.0;
      else if (symbol.includes("BRL")) basePrice = 5.25;
      else if (symbol.includes("INR")) basePrice = 83.50;
      else if (symbol.includes("CAD")) basePrice = 1.36;
      else if (symbol.includes("GBP")) basePrice = 1.26;
      else if (symbol.includes("MXN")) basePrice = 17.50;
      else if (symbol.includes("PHP")) basePrice = 58.00;
      else if (symbol.includes("COP")) basePrice = 3900.00;
      else if (symbol.includes("IDR")) basePrice = 16200.00;
      else if (symbol.includes("VND")) basePrice = 25400.00;
      else if (symbol.includes("ARS")) basePrice = 900.00;
      else if (symbol.includes("RUB")) basePrice = 90.00;
      else if (symbol.includes("GOLD") || symbol.includes("XAU")) basePrice = 2330.00;
      else if (symbol.includes("SILVER") || symbol.includes("XAG")) basePrice = 29.50;
    }

    const config: MarketConfig = {
      symbol,
      name: `${symbol} Active Sincronizado`,
      basePrice,
      volatility: basePrice * 0.00015,
      trend: 0
    };

    this.configs[symbol] = config;
    this.reseedHistory(symbol, basePrice);
  }

  // Reseed history with clean values matching a startPrice to align the start of charts perfectly
  private reseedHistory(symbol: string, startPrice: number) {
    const config = this.configs[symbol] || { volatility: startPrice * 0.00015, trend: 0 };
    const now = Math.floor(Date.now() / 1000);
    const candleDuration = 60;
    const symbolCandles: Candlestick[] = [];
    let currentPrice = startPrice;

    for (let i = 120; i >= 0; i--) {
      const time = now - (i * candleDuration);
      const open = currentPrice;
      const change = (Math.random() - 0.5) * config.volatility * 4 + config.trend;
      const close = currentPrice + change;
      const high = Math.max(open, close) + Math.random() * config.volatility * 2;
      const low = Math.min(open, close) - Math.random() * config.volatility * 2;
      const volume = Math.floor(Math.random() * 800) + 200;

      symbolCandles.push({
        time,
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
    }

    this.candles[symbol] = enrichCandlesticks(symbolCandles);
  }

  // Inject real price ticks directly from the Quotex active tab browser extension
  public injectPrice(symbol: string, price: number) {
    this.lastInjectedTime[symbol] = Date.now();
    this.liveAssets.add(symbol);
    this.ensureAsset(symbol, price);
    
    if (this.configs[symbol]) {
      this.configs[symbol].basePrice = price;
    }

    const history = this.candles[symbol];
    if (!history || history.length === 0) return;

    const lastCandle = history[history.length - 1];
    const now = Math.floor(Date.now() / 1000);
    const isNewCandleOffset = now - lastCandle.time >= 60; // 1-minute period

    if (isNewCandleOffset) {
      const newCandle: Candlestick = {
        time: Math.floor(now / 60) * 60,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, price),
        low: Math.min(lastCandle.close, price),
        close: price,
        volume: 5,
      };
      history.push(newCandle);
      if (history.length > 200) history.shift();
    } else {
      lastCandle.close = price;
      if (price > lastCandle.high) lastCandle.high = price;
      if (price < lastCandle.low) lastCandle.low = price;
      lastCandle.volume += 1;
    }

    this.candles[symbol] = enrichCandlesticks(history);

    // Broadcast update immediately to GUIs
    if (this.tickCallback) {
      this.tickCallback(symbol, price, this.candles[symbol]);
    }
  }

  // Get historical candles
  public getHistory(symbol: string): Candlestick[] {
    this.ensureAsset(symbol);
    return this.candles[symbol] || [];
  }

  // Check if asset is receiving live data
  public isLiveAsset(symbol: string): boolean {
    return this.liveAssets.has(symbol);
  }

  // Get list of currently live synced assets
  public getLiveAssets(): string[] {
    return Array.from(this.liveAssets);
  }

  // Get synchronization status summary
  public getSyncStatus() {
    const allSymbols = Object.keys(this.configs);
    const live = this.getLiveAssets();
    const simulated = allSymbols.filter(s => !this.liveAssets.has(s));
    return {
      liveAssets: live,
      simulatedAssets: simulated,
      totalAssets: allSymbols.length
    };
  }

  // Generate a tick update (run every 1 second)
  // Calls onTick with updated candles and the active socket broadcast frame
  public startTickLoop(onTick: (symbol: string, currentPrice: number, candles: Candlestick[]) => void) {
    this.tickCallback = onTick;
    const tickInterval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);

      // Clear stale live assets (older than 60s)
      const staleTimeout = 60000;
      for (const symbol of this.liveAssets) {
        const lastTime = this.lastInjectedTime[symbol];
        if (lastTime && (Date.now() - lastTime) > staleTimeout) {
          this.liveAssets.delete(symbol);
        }
      }

      for (const symbol of Object.keys(this.configs)) {
        // Skip simulation completely if it is currently a live asset
        if (this.liveAssets.has(symbol)) {
          continue;
        }

        const config = this.configs[symbol];
        const history = this.candles[symbol];
        if (!history || history.length === 0) continue;

        const lastCandle = history[history.length - 1];
        const isNewCandleOffset = now - lastCandle.time >= 60; // 1-minute period

        // Random price motion
        const priceSpread = (Math.random() - 0.5) * config.volatility * 0.9 + (config.trend * 0.1);
        const nextPrice = lastCandle.close + priceSpread;

        if (isNewCandleOffset) {
          // Open new interval candle
          const newCandle: Candlestick = {
            time: Math.floor(now / 60) * 60, // rounded to minute
            open: lastCandle.close,
            high: Math.max(lastCandle.close, nextPrice),
            low: Math.min(lastCandle.close, nextPrice),
            close: nextPrice,
            volume: 5,
          };
          history.push(newCandle);
          if (history.length > 200) history.shift(); // retain max memory
        } else {
          // Update active candlestick
          lastCandle.close = nextPrice;
          if (nextPrice > lastCandle.high) lastCandle.high = nextPrice;
          if (nextPrice < lastCandle.low) lastCandle.low = nextPrice;
          lastCandle.volume += Math.floor(Math.random() * 3);
        }

        // Re-enrich with latest computations
        this.candles[symbol] = enrichCandlesticks(history);
        onTick(symbol, nextPrice, this.candles[symbol]);
      }
    }, 1000);

    return () => clearInterval(tickInterval);
  }
}
