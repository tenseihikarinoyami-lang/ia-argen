/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AIAnalysis, OperationMode, TradeType } from '../types';

interface AISniperProps {
  symbol: string;
  analysis: AIAnalysis | null;
  onRunAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
  mode: OperationMode;
  onExecuteTrade: (type: TradeType, expirySeconds: number, reasoning: string) => void;
}

export const AISniper: React.FC<AISniperProps> = ({
  symbol,
  analysis,
  onRunAnalysis,
  isAnalyzing,
  mode,
  onExecuteTrade,
}) => {
  const [activeSignal, setActiveSignal] = useState<AIAnalysis | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Monitor incoming signals
  useEffect(() => {
    if (analysis && analysis.verdict !== 'NEUTRAL') {
      setActiveSignal(analysis);
      
      // Play synthetic notification sound based on signal direction
      playSignalSound(analysis.verdict);

      // Start countdown timer for execution in Semiautomatic mode
      if (mode === 'semiautomatic') {
        setCountdown(10);
      } else if (mode === 'automatic') {
        // In fully automatic mode, execute instantly if confidence is strong like an experienced expert trader (85%+)
        const expertThreshold = 85;
        if (analysis.confidence >= expertThreshold) {
          onExecuteTrade(analysis.verdict, analysis.recommendedExpiry, analysis.reasoning);
        } else {
          console.log(`[Filtro Experto] Señal de confianza (${analysis.confidence}%) descartada. Requerido mínimo: ${expertThreshold}%`);
        }
      }
    }
  }, [analysis, mode]);

  // Handle semiauto countdown ticker
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && activeSignal && mode === 'semiautomatic') {
      // Countdown expired without choice, clear active prompt
      setActiveSignal(null);
    }
  }, [countdown, activeSignal, mode]);

  // Synthetic sound generator using Web Audio API
  const playSignalSound = (type: TradeType) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Play a nice double-beep sequence
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (type === 'CALL') {
        // High ascending double-beep for Buy/Call
        playBeep(880, ctx.currentTime, 0.15);
        playBeep(1200, ctx.currentTime + 0.12, 0.25);
      } else {
        // Deep descending tone for Sell/Put
        playBeep(440, ctx.currentTime, 0.15);
        playBeep(320, ctx.currentTime + 0.12, 0.25);
      }
    } catch (e) {
      console.warn("Sound play block error", e);
    }
  };

  const handleSemiConfirm = () => {
    if (activeSignal) {
      onExecuteTrade(activeSignal.verdict as TradeType, activeSignal.recommendedExpiry, activeSignal.reasoning);
      setActiveSignal(null);
      setCountdown(0);
    }
  };

  const handleSemiReject = () => {
    setActiveSignal(null);
    setCountdown(0);
  };

  // Verdict design properties
  const verdictMap = {
    CALL: {
      label: "COMPRA (CALL)",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20 shadow-emerald-500/10",
      icon: <TrendingUp className="h-8 w-8 text-emerald-400" />,
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    },
    PUT: {
      label: "VENTA (PUT)",
      color: "text-rose-400 border-rose-500/30 bg-rose-950/20 shadow-rose-500/10",
      icon: <TrendingDown className="h-8 w-8 text-rose-400" />,
      glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    },
    NEUTRAL: {
      label: "ESPERAR (NEUTRAL)",
      color: "text-zinc-400 border-zinc-800 bg-zinc-900/30 shadow-none",
      icon: <Clock className="h-8 w-8 text-zinc-500" />,
      glow: "",
    },
  };

  const currentVerdict = analysis ? analysis.verdict : 'NEUTRAL';
  const design = verdictMap[currentVerdict as keyof typeof verdictMap] || verdictMap.NEUTRAL;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Semi-Automatic/Automatic Signal Action Alert Dialog overlay */}
      <AnimatePresence>
        {activeSignal && mode === 'semiautomatic' && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className={`border rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-500/50 bg-zinc-950`}
            style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(245,158,11,0.15)' }}
          >
            {/* Ambient indicator strip */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${activeSignal.verdict === 'CALL' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></div>
            
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${activeSignal.verdict === 'CALL' ? 'bg-emerald-950 border border-emerald-500/30' : 'bg-rose-950 border border-rose-500/30'}`}>
                {activeSignal.verdict === 'CALL' ? <TrendingUp className="h-6 w-6 text-emerald-400" /> : <TrendingDown className="h-6 w-6 text-rose-400" />}
              </div>
              <div>
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">Confirmación Requerida</span>
                <h4 className="text-zinc-50 font-bold text-sm">
                  ¿Colocar orden <span className={activeSignal.verdict === 'CALL' ? 'text-emerald-400' : 'text-rose-400'}>{activeSignal.verdict}</span> en {symbol}?
                </h4>
                <p className="text-[11px] text-zinc-400">Expiración recomendada: {activeSignal.recommendedExpiry}s | Confianza: {activeSignal.confidence}%</p>
              </div>
            </div>

            {/* Timers & Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Countdown badge circle */}
              <div className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-300 font-mono font-bold text-sm">
                {countdown}s
              </div>
              <button
                id="semi-reject-btn"
                onClick={handleSemiReject}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium transition"
              >
                Ignorar
              </button>
              <button
                id="semi-confirm-btn"
                onClick={handleSemiConfirm}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:translate-y-0.5 transition duration-150 flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                Operar Ahora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Signal Display Panel */}
      <div className={`bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-lg relative ${design.glow} transition-all duration-300`}>
        
        {/* Floating Sound Toggle */}
        <button
          id="toggle-mute-btn"
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-300 p-2 hover:bg-zinc-900 rounded-lg transition"
          title={isMuted ? "Activar Alertas de Audio" : "Silenciar Alertas"}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-zinc-600" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
        </button>

        {/* Header Indicator Scan title */}
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
          <Sparkles className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Filtro de Señal de Alta Precisión por IA</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Signal Dial */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-zinc-900 pb-5 lg:pb-0 lg:pr-6">
            <span className="text-[10px] text-zinc-400 font-bold tracking-wider mb-2">VERDICT PRINCIPAL</span>
            
            <div className={`h-28 w-28 rounded-full border flex flex-col items-center justify-center p-3 text-center mb-3 transition-colors duration-300 ${design.color}`}>
              {design.icon}
              <span className="text-[10px] text-zinc-500 uppercase font-mono mt-1 font-bold">Confianza</span>
              <span className="text-xl font-bold font-mono tracking-tight text-zinc-100">{analysis ? analysis.confidence : 0}%</span>
            </div>
            
            <h4 className="text-sm font-sans font-bold tracking-wide text-zinc-200 uppercase mb-1">
              {design.label}
            </h4>
            <p className="text-[10px] text-zinc-500">
              {analysis ? `Detectado a las ${new Date(analysis.timestamp).toLocaleTimeString()}` : 'Analizador en espera'}
            </p>
          </div>

          {/* AI Reasoning Details */}
          <div className="lg:col-span-8 space-y-4">
            <div>
              <span className="text-[10px] text-indigo-400 font-bold block mb-1">RAZONAMIENTO TÉCNICO DE LA IA:</span>
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-900 min-h-[90px] flex items-start gap-2.5">
                <Lightbulb className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {analysis?.reasoning || "Haz clic en el botón de análisis para procesar los indicadores de velas de 1M y generar señales de entrada de alta probabilidad optimizadas con Inteligencia Artificial."}
                </p>
              </div>
            </div>

            {/* Calculated Targets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">Soporte Estimado</span>
                <span className="text-xs font-mono font-bold text-zinc-300">{analysis ? analysis.supportLevel.toFixed(4) : "Cargando..."}</span>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">Resistencia Estimada</span>
                <span className="text-xs font-mono font-bold text-zinc-300">{analysis ? analysis.resistanceLevel.toFixed(4) : "Cargando..."}</span>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">Expiración Óptima</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{analysis ? `${analysis.recommendedExpiry}s (1 Min)` : "Cargando..."}</span>
              </div>
            </div>

            {/* AI Summary Indicator bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">Diagnóstico de Indicadores Custom:</span>
                  <p className="text-[11px] text-zinc-300 italic">{analysis?.indicatorsSummary || "Osciladores inactivos"}</p>
                </div>
              </div>

              {/* Run Force Analysis Prompt trigger button */}
              <button
                id="run-analysis-btn"
                onClick={onRunAnalysis}
                disabled={isAnalyzing}
                className={`py-2 px-5 rounded-xl text-xs font-bold font-sans tracking-wide transition shadow-lg flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-zinc-50 shadow-indigo-600/10 active:translate-y-0.5 ${
                  isAnalyzing ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isAnalyzing ? "Analizando Mercado con Gemini..." : "Forzar Análisis IA"}
              </button>
            </div>
            
          </div>
        </div>

      </div>

    </div>
  );
};
