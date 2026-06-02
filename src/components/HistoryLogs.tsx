/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Trade } from '../types';

interface HistoryLogsProps {
  trades: Trade[];
}

export const HistoryLogs: React.FC<HistoryLogsProps> = ({ trades }) => {
  // Stat calculations
  const total = trades.length;
  const wins = trades.filter((t) => t.status === 'WIN').length;
  const losses = trades.filter((t) => t.status === 'LOSS').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  
  const netEarnings = trades.reduce((sum, t) => {
    if (t.status === 'WIN' && t.profit) return sum + t.profit;
    if (t.status === 'LOSS') return sum - t.amount;
    return sum;
  }, 0);

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-md shadow-zinc-950/40">
      
      {/* Tab Header block */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-5">
        <div>
          <h3 className="font-sans font-bold text-sm text-zinc-50">Historial y Métricas de Operaciones</h3>
          <p className="text-[11px] text-zinc-400">Resultados en tiempo real recopilados del simulador e hilos activos de Quotex.</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
      </div>

      {/* High-Fidelity Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        
        {/* Total stats card */}
        <div className="bg-zinc-900/35 border border-zinc-900 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold tracking-wider">Operaciones</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-mono font-bold text-zinc-100">{total}</span>
            <span className="text-[10px] text-zinc-500 font-mono">Totales</span>
          </div>
        </div>

        {/* Win Rate Stats card */}
        <div className="bg-zinc-900/35 border border-zinc-900 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold tracking-wider">Efectividad</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-xl font-mono font-bold ${winRate >= 60 ? 'text-emerald-400' : 'text-zinc-300'}`}>{winRate}%</span>
            <span className="text-[10px] text-zinc-500 font-mono">Win Rate</span>
          </div>
        </div>

        {/* Win/Loss Split view card */}
        <div className="bg-zinc-900/35 border border-zinc-900 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold tracking-wider">Win / Loss Ratio</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono text-sm font-bold">
            <span className="text-emerald-400">{wins} W</span>
            <span className="text-zinc-650 mx-1">/</span>
            <span className="text-rose-400">{losses} L</span>
          </div>
        </div>

        {/* Net earnings stats card */}
        <div className="bg-zinc-900/35 border border-zinc-900 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold tracking-wider">Balance Neto</span>
          <div className="flex items-baseline gap-1.5 mt-1 font-mono">
            <span className={`text-lg font-bold ${netEarnings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {netEarnings >= 0 ? "+" : ""}${netEarnings.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-[10px] text-zinc-500">P&L</span>
          </div>
        </div>

      </div>

      {/* History table log list */}
      <div>
        <label className="text-[11px] font-bold text-zinc-400 block mb-3 uppercase font-mono tracking-wider">Listado de Operaciones</label>
        
        {trades.length === 0 ? (
          <div className="bg-zinc-900/10 border border-dashed border-zinc-850 rounded-xl p-8 text-center text-zinc-500 text-xs">
            <Briefcase className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
            <p className="font-medium">No se han registrado operaciones en esta sesión.</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Las operaciones automáticas o semiautomáticas iniciarán al activar los módulos.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
            {trades.map((trade) => {
              const isWin = trade.status === 'WIN';
              const isCall = trade.type === 'CALL';
              const formattedTime = new Date(trade.entryTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={trade.id}
                  className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Status icon badge */}
                    <div className="flex-shrink-0">
                      {trade.status === 'WIN' && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />}
                      {trade.status === 'LOSS' && <XCircle className="h-4.5 w-4.5 text-rose-400" />}
                      {trade.status === 'PENDING' && <Clock className="h-4.5 w-4.5 text-amber-400 animate-spin" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-100">{trade.symbol}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isCall ? 'bg-emerald-950/50 text-emerald-400' : 'bg-rose-950/50 text-rose-400'
                        }`}>
                          {trade.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-mono">
                        <span>Horario: {formattedTime}</span>
                        <span>•</span>
                        <span className="capitalize">{trade.mode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 font-mono">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-zinc-500">Monto:</span>
                      <span className="text-zinc-300 font-bold">${trade.amount}</span>
                    </div>
                    <div className="mt-0.5">
                      {trade.status === 'PENDING' ? (
                        <span className="text-amber-400 text-[10px] font-bold italic animate-pulse">Expirando... (60s)</span>
                      ) : (
                        <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : '-'}${isWin && trade.profit ? trade.profit.toFixed(2) : trade.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
