/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Radio, Cpu, ShieldAlert, Sparkles, TrendingUp, HelpCircle, LogOut, User } from 'lucide-react';
import { OperationMode, SystemSettings } from '../types';

interface HeaderProps {
  settings: SystemSettings;
  setSettings: (settings: SystemSettings) => void;
  balance: number;
  botConnected: boolean;
  activeBots: number;
  userEmail?: string;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  setSettings,
  balance,
  botConnected,
  activeBots,
  userEmail,
  onSignOut,
}) => {
  const currentMode = settings.mode;

  const modeDetails = {
    manual: {
      name: "Modo Manual (Monitoreo)",
      desc: "Solo analiza y envía señales sonoras/visuales. La ejecución la haces tú.",
      color: "border-emerald-500/30 text-emerald-400 bg-emerald-950/20",
    },
    semiautomatic: {
      name: "Modo Semiautomático",
      desc: "Envía alertas y pide confirmación rápida con 10s para colocar la orden.",
      color: "border-amber-500/30 text-amber-400 bg-amber-950/20",
    },
    automatic: {
      name: "Modo Automático IA (Total)",
      desc: "Monitorea constantemente, detecta patrones y ejecuta órdenes al instante sin intervención.",
      color: "border-rose-500/30 text-rose-400 bg-rose-950/20",
    },
  };

  const handleModeChange = (mode: OperationMode) => {
    setSettings({
      ...settings,
      mode,
    });
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Logo & Platform Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Cpu className="h-5 w-5 text-zinc-50" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-lg text-zinc-50 tracking-tight">Argentum AI</h1>
              <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono font-bold">Quotex Sniper</span>
            </div>
            <p className="text-xs text-zinc-400">Plataforma Avanzada de Análisis y Operaciones Automáticas</p>
          </div>
        </div>

        {/* Operational Modes Grid Selector */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            id="mode-manual-btn"
            onClick={() => handleModeChange('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentMode === 'manual'
                ? "bg-zinc-800 text-emerald-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Manual
          </button>
          <button
            id="mode-semi-btn"
            onClick={() => handleModeChange('semiautomatic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentMode === 'semiautomatic'
                ? "bg-zinc-800 text-amber-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Semiautomático
          </button>
          <button
            id="mode-auto-btn"
            onClick={() => handleModeChange('automatic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentMode === 'automatic'
                ? "bg-zinc-800 text-rose-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Automático (IA)
          </button>
        </div>

        {/* Live Metrics: Connect Status & Account Balance */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Script / Extension Websocket status */}
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-800">
            <Radio className={`h-4 w-4 animate-pulse ${botConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 font-medium">Extensión Navegador:</span>
                <span className={`text-[11px] font-bold uppercase ${botConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {botConnected ? 'CONECTADO' : 'DESCONECTADO'}
                </span>
              </div>
              <p className="text-[9px] text-zinc-500">
                {botConnected ? `${activeBots} Tab(s) Quotex Autolink` : 'Sin script websocket activo'}
              </p>
            </div>
          </div>

          {/* Wallet simulated/real */}
          <div className="bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800 min-w-[130px]">
            <span className="text-[10px] text-zinc-400 block font-medium uppercase font-mono tracking-wider">BALANCE</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-emerald-400">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900 px-1 rounded font-bold font-mono">USD</span>
            </div>
          </div>

          {/* User Session and Logout controls */}
          {userEmail && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5">
              <div className="bg-zinc-800/80 p-1.5 rounded-lg text-emerald-400">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-[8px] text-zinc-500 font-mono block leading-none font-bold">SESIÓN</span>
                <span className="text-[11px] font-mono text-zinc-300 font-bold max-w-[110px] truncate block" title={userEmail}>
                  {userEmail}
                </span>
              </div>
              {onSignOut && (
                <button
                  id="sign-out-btn"
                  onClick={onSignOut}
                  title="Cerrar sesión"
                  className="p-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors ml-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode Desc Notification Ribbons */}
      <div className="max-w-7xl mx-auto mt-2">
        <div className={`border p-2 rounded-lg text-[11px] flex items-center justify-between gap-2 transition-all ${modeDetails[currentMode].color}`}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              <strong>{modeDetails[currentMode].name}:</strong> {modeDetails[currentMode].desc}
            </span>
          </div>
          {currentMode === 'automatic' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-zinc-950 font-bold tracking-widest font-mono">LIVE AUTO-TRADE ACTIVE</span>
          )}
        </div>
      </div>
    </header>
  );
};
