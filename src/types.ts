/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Candlestick {
  time: number; // timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Technical indicators calculated server-side or helper client-side
  rsi?: number;
  ema9?: number;
  ema21?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
  stochK?: number;
  stochD?: number;
}

export type TradeType = 'CALL' | 'PUT';

export type TradeStatus = 'PENDING' | 'WIN' | 'LOSS';

export type OperationMode = 'manual' | 'semiautomatic' | 'automatic';

export interface Trade {
  id: string;
  userId?: string;
  symbol: string;
  type: TradeType;
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: number; // timestamp
  exitTime?: number; // timestamp
  expiry: number; // duration in seconds
  status: TradeStatus;
  payout: number; // e.g. 85 for 85%
  profit?: number;
  aiReasoning?: string;
  mode: OperationMode;
  isMartingale?: boolean;
  martingaleStep?: number;
}

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';

export interface SystemSettings {
  assets: string[];
  activeAsset: string;
  tradeAmount: number;
  tradeExpiry: number; // in seconds (e.g. 60, 120, 300, etc.)
  autoRotationEnabled: boolean;
  autoRotationInterval: number; // in seconds (e.g., 30, 60, 120, etc.)
  usePercentageAmount: boolean;
  percentageOfBalance: number;
  riskProfile: RiskProfile;
  takeProfit: number; // Daily goal in currency
  stopLoss: number; // Daily max loss in currency
  martingaleEnabled: boolean;
  martingaleMultiplier: number;
  martingaleMaxSteps: number;
  mode: OperationMode;
  aiModel?: 'gemini' | 'groq' | 'deepseek' | 'openrouter' | 'consensus';
  maxConcurrentTradesEnabled?: boolean;
  maxConcurrentTrades?: number;
  indicators: {
    rsi: { enabled: boolean; period: number; overbought: number; oversold: number };
    ema: { enabled: boolean; fastPeriod: number; slowPeriod: number };
    bb: { enabled: boolean; period: number; stdDev: number };
    macd: { enabled: boolean; fast: number; slow: number; signal: number };
  };
}

export interface AIAnalysis {
  verdict: TradeType | 'NEUTRAL';
  confidence: number; // 0 - 100
  reasoning: string;
  indicatorsSummary: string;
  supportLevel: number;
  resistanceLevel: number;
  recommendedExpiry: number; // in seconds
  timestamp: number;
}

export interface WebSocketClientMessage {
  type: 'CONNECT_QUOTEX' | 'QUOTEX_TICK' | 'TRADE_RESULT' | 'PING';
  data?: any;
}

export interface WebSocketServerMessage {
  type: 'AI_SIGNAL' | 'EXECUTE_TRADE' | 'SERVER_STATUS' | 'PONG';
  data?: any;
}
