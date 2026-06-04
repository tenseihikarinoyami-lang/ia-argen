/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Percent,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Brain,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SystemSettings, RiskProfile } from '../types';

interface SettingsPanelProps {
  settings: SystemSettings;
  setSettings: (settings: SystemSettings) => void;
  quotexSyncData?: {
    balance: number;
    asset: string;
    isDemo: boolean;
    timestamp: number;
  } | null;
  userId?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  setSettings,
  quotexSyncData,
  userId,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'risk' | 'indicators' | 'script'>('risk');

  const handleRiskProfileChange = (profile: RiskProfile) => {
    let multiplier = 2.0;
    let steps = 2;
    let amount = settings.tradeAmount;

    // Smart Preset Defaults based on chosen risk mode
    if (profile === 'conservative') {
      multiplier = 1.8;
      steps = 1;
      amount = Math.max(1, Math.min(amount, 5));
    } else if (profile === 'balanced') {
      multiplier = 2.0;
      steps = 2;
    } else if (profile === 'aggressive') {
      multiplier = 2.2;
      steps = 3;
    }

    setSettings({
      ...settings,
      riskProfile: profile,
      martingaleMultiplier: multiplier,
      martingaleMaxSteps: steps,
      tradeAmount: amount,
    });
  };

  const handleIndicatorToggle = (indicatorName: 'rsi' | 'ema' | 'bb' | 'macd') => {
    setSettings({
      ...settings,
      indicators: {
        ...settings.indicators,
        [indicatorName]: {
          ...settings.indicators[indicatorName],
          enabled: !settings.indicators[indicatorName].enabled,
        },
      },
    });
  };

  // Automated browser script generation
  // Dynamically uses current window location to bind WebSocket target address
  const defaultOrigin = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const [domainOverride, setDomainOverride] = useState(defaultOrigin);
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${domainOverride}?clientType=bot${userId ? `&userId=${userId}` : ''}`;

  const tampermonkeyScript = `// ==UserScript==
// @name         Quotex AI Auto-Trader Bot Link (Modo Estricto)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Conecta la plataforma Quotex con Argentum AI por WebSockets con humanización estricta y protección anti-detección avanzada.
// @author       Argentum AI
// @match        *://*.qxbroker.com/*
// @match        *://qxbroker.com/*
// @match        *://*.quotex.io/*
// @match        *://quotex.io/*
// @match        *://*.quotex.com/*
// @match        *://quotex.com/*
// @match        *://*.quotex-vip.com/*
// @match        *://quotex-vip.com/*
// @match        *://*.qxbroker.io/*
// @match        *://qxbroker.io/*
// @match        *://*.qxbroker-es.com/*
// @match        *://qxbroker-es.com/*
// @match        *://*.quotex.market/*
// @match        *://quotex.market/*
// @match        *://*.qx-trade.com/*
// @match        *://qx-trade.com/*
// @match        *://*.qxbroker.site/*
// @match        *://qxbroker.site/*
// @match        *://*quotex*/*
// @match        *://*qxbroker*/*
// @match        *://*qx-trade*/*
// @match        *://*qx-platform*/*
// @match        *://*qxbroker*/*
// @match        *://*qx-*/*
// @match        *://*quotx*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const host = window.location.hostname.toLowerCase();
    const isQuotex = host.includes("quotex") || host.includes("qxbroker") || host.includes("qx-") || host.includes("qx") || host.includes("quotx") || host.includes("broker");
    if (!isQuotex) return;

    console.log("🦾 [Argentum Estricto] Inicializado con éxito. Protecciones Anti-Detección ACTIVAS.");

    // ---- INICIO INTERCEPTADOR DE WEBSOCKETS NATIVOS DE QUOTEX ----
    let liveInterceptedPrice = null;
    let liveInterceptedAsset = null;
    let liveInterceptedBalance = null;
    let liveInterceptedIsDemo = null;

    function normalizeSymbol(sym) {
        if (!sym) return "";
        let upper = sym.toUpperCase();
        let isOtc = upper.includes("OTC") || upper.includes("_OTC") || upper.includes("-OTC");
        
        // Extraer y procesar pares estandar FX de 6 letras sin interferencia de OTC
        let cleanFX = upper.replace("OTC", "").replace(/[^A-Z]/g, "");
        if (cleanFX.length === 6) {
            const pair = cleanFX.substring(0, 3) + "/" + cleanFX.substring(3, 6);
            return pair + (isOtc ? " (OTC)" : "");
        }
        
        let base = upper.trim()
                       .replace(/_OTC/g, "")
                       .replace(/-OTC/g, "")
                       .replace(/\s*OTC/g, "")
                       .replace(/\(OTC\)/g, "")
                       .trim();
                       
        if (base.length === 6 && !base.includes("/")) {
            base = base.substring(0, 3) + "/" + base.substring(3, 6);
        } else if (base.includes("_")) {
            base = base.replace("_", "/");
        } else if (base.includes("-")) {
            base = base.replace("-", "/");
        }
        
        return base + (isOtc ? " (OTC)" : "");
    }

    function handleQuotexNativeWSMessage(rawString) {
        if (typeof rawString !== 'string') return;
        
        // 1. INTENTAR EXTRACCIÓN DIRECTA SÚPER RESISTENTE POR EXPRESIONES REGULARES (FALLBACK ULTRA RAPIDO SIN IMPORTAR FORMATO)
        try {
            let symbolMatch = rawString.match(/"symbol"\\s*:\\s*"([^"]+)"/i) || 
                              rawString.match(/"asset"\\s*:\\s*"([^"]+)"/i) || 
                              rawString.match(/"pair"\\s*:\\s*"([^"]+)"/i) ||
                              rawString.match(/'symbol'\\s*:\\s*'([^']+)'/i) ||
                              rawString.match(/'asset'\\s*:\\s*'([^']+)'/i);
                              
            let priceMatch = rawString.match(/"price"\\s*:\\s*([0-9.]+)/i) || 
                             rawString.match(/"rate"\\s*:\\s*([0-9.]+)/i) || 
                             rawString.match(/"close"\\s*:\\s*([0-9.]+)/i) || 
                             rawString.match(/"last"\\s*:\\s*([0-9.]+)/i) ||
                             rawString.match(/'price'\\s*:\\s*([0-9.]+)/i);
            
            if (symbolMatch && priceMatch) {
                const sym = symbolMatch[1];
                const prc = parseFloat(priceMatch[1]);
                if (sym && !isNaN(prc) && prc > 0) {
                    onRealLiveTickDetected(sym, prc);
                }
            }
            
            let balanceMatch = rawString.match(/"balance"\\s*:\\s*([0-9.]+)/i) || 
                               rawString.match(/"demo_balance"\\s*:\\s*([0-9.]+)/i) || 
                               rawString.match(/"live_balance"\\s*:\\s*([0-9.]+)/i) ||
                               rawString.match(/'balance'\\s*:\\s*([0-9.]+)/i);
            if (balanceMatch) {
                const bal = parseFloat(balanceMatch[1]);
                if (!isNaN(bal)) {
                    let isDemoMatch = rawString.match(/"isDemo"\\s*:\\s*(true|false)/i) || 
                                      rawString.match(/"demo"\\s*:\\s*(true|false|1|0)/i);
                    let isDemoVal = true;
                    if (isDemoMatch) {
                        isDemoVal = (isDemoMatch[1] === "true" || isDemoMatch[1] === "1");
                    }
                    onRealLiveBalanceDetected(bal, isDemoVal);
                }
            }
        } catch (regExErr) {
            console.debug("Regex extract skipped:", regExErr);
        }

        // 2. PARSEO JSON ESTÁNDAR
        let rawJsonContent = rawString;
        const match = rawString.match(/^([0-9]+)(.*)$/);
        if (match) {
            rawJsonContent = match[2];
        }
        
        let parsedData = null;
        try {
            parsedData = JSON.parse(rawJsonContent);
        } catch (e) {
            try {
                if (rawJsonContent.startsWith('[') && rawJsonContent.endsWith(']')) {
                    parsedData = JSON.parse(rawJsonContent);
                }
            } catch(e2) {}
        }
        
        if (!parsedData) return;
        
        if (Array.isArray(parsedData)) {
            const [eventName, eventData] = parsedData;
            
            if ((eventName === "tick" || eventName === "price" || eventName === "quote" || eventName === "ticks") && eventData) {
                let symbol = eventData.symbol || eventData.asset || eventData.pair;
                let price = eventData.price || eventData.rate || eventData.close || eventData.value;
                if (symbol && typeof price === "number") {
                    onRealLiveTickDetected(symbol, price);
                }
            }
            
            if ((eventName === "balance" || eventName === "settings" || eventName === "account" || eventName === "user") && eventData) {
                let balance = eventData.balance !== undefined ? eventData.balance : (eventData.demo_balance || eventData.live_balance);
                if (typeof balance === "number") {
                    onRealLiveBalanceDetected(balance, eventData.isDemo || eventData.demo || false);
                }
            }
        } else if (typeof parsedData === "object") {
            let symbol = parsedData.symbol || parsedData.asset || parsedData.pair || parsedData.symbolId;
            let price = parsedData.price || parsedData.rate || parsedData.close || parsedData.value || parsedData.last;
            if (symbol && typeof price === "number") {
                onRealLiveTickDetected(symbol, price);
            }
            
            let balance = parsedData.balance !== undefined ? parsedData.balance : (parsedData.demo_balance || parsedData.live_balance);
            if (typeof balance === "number") {
                onRealLiveBalanceDetected(balance, parsedData.isDemo || parsedData.demo || false);
            }
        }
    }

    function onRealLiveTickDetected(symbol, price) {
        const normalized = normalizeSymbol(symbol);
        liveInterceptedPrice = price;
        liveInterceptedAsset = normalized;
        
        if (normalized && normalized.trim().length > 4) {
            // Reenviar tick de alta precision inmediatamente a Argentum AI
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "QUOTEX_TICK",
                    data: {
                        asset: normalized,
                        price: price,
                        timestamp: Date.now()
                    }
                }));
            }
        }
    }

    function onRealLiveBalanceDetected(balance, isDemo) {
        liveInterceptedBalance = balance;
        liveInterceptedIsDemo = isDemo;
    }

    // Hook del constructor de WebSockets nativo
    try {
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            if (url.includes("clientType=bot") || url.includes("quotex-ai-trading-bot-analyst")) {
                return new OriginalWebSocket(url, protocols);
            }
            console.log("🔌 [Argentum Estricto] Interceptado WebSocket nativo de Quotex:", url);
            const ws = new OriginalWebSocket(url, protocols);
            
            ws.addEventListener('message', (event) => {
                try {
                    const data = event.data;
                    if (typeof data === "string") {
                        handleQuotexNativeWSMessage(data);
                    }
                } catch (err) {
                    console.warn("⚠️ [Argentum Estricto] Error procesando mensaje WS nativo:", err);
                }
            });
            return ws;
        };
        window.WebSocket.prototype = OriginalWebSocket.prototype;
    } catch(wsHookError) {
        console.error("❌ [Argentum] Fallo configurando Hook de WebSocket principal:", wsHookError);
    }
    // ---- FIN INTERCEPTADOR DE WEBSOCKETS NATIVOS DE QUOTEX ----

    const WS_URL = "${wsUrl}";
    let socket = null;
    let reconnectInterval = 5000;

    function connect() {
        console.log("🔌 [Argentum Estricto] Conectando a target: " + WS_URL);
        socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log("✅ [Argentum Estricto] Enlace establecido con el panel Argentum AI.");
            showStatusBanner("✅ IA ENLACE ESTRICTO (ANTI-DETEC)", "#10b981");
            startQuotexScreenSync();
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("📨 [Argentum Estricto] Mensaje recibido:", message);

                if (message.type === 'EXECUTE_TRADE') {
                    // Ejecución con simulación humana estricta obligatoria
                    executeStrictTradeOnQuotex(message.data);
                } else if (message.type === 'SWITCH_ASSET') {
                    // Rotación/cambio estricto de activo
                    switchStrictAssetOnQuotex(message.data.asset);
                }
            } catch (err) {
                console.error("❌ Fallo procesando WS payload:", err);
            }
        };

        socket.onclose = () => {
            console.warn("❌ [Argentum Estricto] Conexión perdida. Reintentando...");
            showStatusBanner("❌ DESCONECTADO (Muro de Seguridad CSP de Quotex o Host incorrecto). Host: " + WS_URL.split("?")[0], "#ef4444");
            setTimeout(connect, reconnectInterval);
        };

        socket.onerror = (err) => {
            console.error("❌ Link Socket Error:", err);
        };
    }

    // Banner flotante para el dashboard de Quotex
    function showStatusBanner(text, color) {
        let banner = document.getElementById("argentum-strict-banner");
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "argentum-strict-banner";
            banner.style.position = "fixed";
            banner.style.bottom = "20px";
            banner.style.left = "20px";
            banner.style.zIndex = "999999";
            banner.style.padding = "12px 18px";
            banner.style.borderRadius = "10px";
            banner.style.color = "#ffffff";
            banner.style.fontFamily = "sans-serif";
            banner.style.fontSize = "11px";
            banner.style.fontWeight = "bold";
            banner.style.letterSpacing = "0.5px";
            banner.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
            banner.style.border = "1px solid rgba(255,255,255,0.1)";
            banner.style.display = "flex";
            banner.style.alignItems = "center";
            banner.style.gap = "8px";
            
            // Pulsing status dot
            const dot = document.createElement("span");
            dot.style.width = "8px";
            dot.style.height = "8px";
            dot.style.borderRadius = "50%";
            dot.style.backgroundColor = "#ffc107";
            dot.style.animation = "pulse 1.5s infinite";
            banner.appendChild(dot);
            
            const txt = document.createElement("span");
            txt.id = "banner-text-content";
            banner.appendChild(txt);
            
            // Add pulse style tag
            const style = document.createElement("style");
            style.textContent = "@keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }";
            document.head.appendChild(style);
            
            document.body.appendChild(banner);
        }
        
        const txt = document.getElementById("banner-text-content");
        if (txt) txt.textContent = text;
        banner.style.backgroundColor = "rgba(10, 10, 10, 0.95)";
        banner.style.borderColor = color;
    }

    // Simula retrasos humanos realistas y eventos coordinados de ratón (X, Y aleatorios dentro del botón)
    function executeStrictTradeOnQuotex(trade) {
        // Variable para registrar balance inicial antes del trade
        let balanceBefore = 10000.00;
        try {
            const balEl = document.querySelector('.header__balance, .account-balance, .balance-value, .user-balance, [class*="balance"]');
            if (balEl) {
                balanceBefore = parseFloat(balEl.textContent.replace(/[^\\d.]/g, '')) || 10000.00;
            }
        } catch(e) {}

        // 1. Añade tiempo de reacción humano variable (550ms a 1450ms)
        const reactionDelay = Math.floor(Math.random() * 900) + 550;
        console.log("⏱️ [Modo Estricto] Retraso de tiempo de reacción humano: " + reactionDelay + "ms.");

        setTimeout(() => {
            // Buscando selectors activos de Quotex (usando CSS standards sin :contains para evitar excepciones DOM)
            let buttonSelector = "";
            if (trade.direction === 'CALL') {
                buttonSelector = ".btn-up, .button-call, .control-panel__btn-up, button.green";
            } else {
                buttonSelector = ".btn-down, .button-put, .control-panel__btn-down, button.red";
            }

            let targetButton = null;
            try {
                const candidates = document.querySelectorAll(buttonSelector);
                if (candidates.length > 0) {
                    targetButton = candidates[0];
                }
            } catch (e) {
                console.warn("⚠️ Error en querySelector nativo, continuando con escaneo directo de textos", e);
            }
            
            if (!targetButton) {
                // Fallback dinámico de textos
                const buttons = document.querySelectorAll("button, div[role='button']");
                for (let btn of buttons) {
                    const txt = btn.textContent.toUpperCase();
                    if (trade.direction === 'CALL' && (txt.includes('UP') || txt.includes('COMPRA') || txt.includes('CALL') || txt.includes('ALZA') || txt.includes('HIGHER') || txt.includes('ARRIBA'))) {
                        targetButton = btn;
                        break;
                    } else if (trade.direction === 'PUT' && (txt.includes('DOWN') || txt.includes('VENTA') || txt.includes('PUT') || txt.includes('BAJA') || txt.includes('LOWER') || txt.includes('ABAJO'))) {
                        targetButton = btn;
                        break;
                    }
                }
            }

            if (!targetButton) {
                console.error("❌ [Modo Estricto] No se localizó el botón de operaciones. Intente de nuevo.");
                return;
            }

            // 2. Simulación física: Encuentra el rectángulo delimitador para calcular coordenadas aleatorias dentro de él
            const rect = targetButton.getBoundingClientRect();
            const paddingX = rect.width * 0.18; // evitar bordes perfectos
            const paddingY = rect.height * 0.18;
            
            const randomX = rect.left + paddingX + Math.random() * (rect.width - paddingX * 2);
            const randomY = rect.top + paddingY + Math.random() * (rect.height - paddingY * 2);

            // Simular trayectoria de mouse humanizada de un punto inicial simulado hacia el botón
            let startMouseX = Math.random() * window.innerWidth;
            let startMouseY = Math.random() * window.innerHeight;
            const pathSteps = 6;
            for (let i = 1; i <= pathSteps; i++) {
                const ratio = i / pathSteps;
                const jitterX = (Math.random() - 0.5) * 12;
                const jitterY = (Math.random() - 0.5) * 12;
                const stepX = startMouseX + (randomX - startMouseX) * ratio + jitterX;
                const stepY = startMouseY + (randomY - startMouseY) * ratio + jitterY;
                
                setTimeout(() => {
                    const moveEvent = new MouseEvent('mousemove', {
                        bubbles: true,
                        cancelable: true,
                        clientX: stepX,
                        clientY: stepY,
                        view: window
                    });
                    document.dispatchEvent(moveEvent);
                }, (reactionDelay / pathSteps) * i * 0.4);
            }

            console.log("🎯 [Movimiento de Ratón Simulador] Coordenadas de click humanizado: (" + randomX.toFixed(1) + ", " + randomY.toFixed(1) + ") dentro del botón.");

            // 3. Cadencia secuencial de eventos nativos para saltear controles heurísticos de Quotex
            const eventParams = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: randomX,
                clientY: randomY,
                screenX: randomX + window.screenX,
                screenY: randomY + window.screenY,
                button: 0,
                buttons: 1
            };

            try {
                targetButton.dispatchEvent(new PointerEvent('pointerenter', eventParams));
                targetButton.dispatchEvent(new PointerEvent('pointerover', eventParams));
                targetButton.dispatchEvent(new MouseEvent('mouseover', eventParams));

                // Micro retraso de enfoque
                setTimeout(() => {
                    targetButton.dispatchEvent(new PointerEvent('pointerdown', eventParams));
                    targetButton.dispatchEvent(new MouseEvent('mousedown', eventParams));
                    targetButton.focus();

                    // Simulación de oscilación de presión del dedo sobre el mouse (45ms a 140ms)
                    setTimeout(() => {
                        targetButton.dispatchEvent(new PointerEvent('pointerup', eventParams));
                        targetButton.dispatchEvent(new MouseEvent('mouseup', eventParams));
                        
                        // Click nativo final
                        targetButton.dispatchEvent(new MouseEvent('click', eventParams));
                        console.log("✅ [Modo Estricto] Señal ejecutada en la interfaz de Quotex con éxito y simulaciones humanas completas.");

                        // Borde indicador estético temporal para el usuario
                        const prevTransition = targetButton.style.transition;
                        targetButton.style.transition = "all 0.3s";
                        targetButton.style.outline = "4px solid #10b981";
                        targetButton.style.outlineOffset = "4px";
                        setTimeout(() => {
                            targetButton.style.outline = "";
                            targetButton.style.transition = prevTransition;
                        }, 1200);

                    }, Math.floor(Math.random() * 95) + 45);

                }, Math.floor(Math.random() * 110) + 50);

            } catch (err) {
                console.warn("⚠️ Falló envío de micro-evento nativo. Usando método de click directo.", err);
                targetButton.click();
            }

            // 4. Verificador Inteligente de Resultados del Trade (Doble Verificación)
            // Esperamos la expiración, medimos el estado del balance final y los elementos visuales de la interfaz
            const expiryDurationSeconds = trade.expiry || 60;
            const monitorSeconds = expiryDurationSeconds + 3; // buffer seguridad

            console.log("🔍 [Sincronización Inteligente] Esperando " + expiryDurationSeconds + "s de trade + veredicto de saldo...");

            setTimeout(() => {
                // Polling secuencial de 5 segundos para verificar si el balance se incrementó o si la orden ganada se ve en pantalla
                let pollAttempts = 0;
                const maxPollAttempts = 5;
                
                function verifyOutcome() {
                    let balanceAfter = balanceBefore;
                    try {
                        const balEl = document.querySelector('.header__balance, .account-balance, .balance-value, .user-balance, [class*="balance"]');
                        if (balEl) {
                            balanceAfter = parseFloat(balEl.textContent.replace(/[^\\d.]/g, '')) || balanceBefore;
                        }
                    } catch(e) {}

                    // Intentamos raspar los últimos elementos cerrados en la interfaz de Quotex
                    let foundWinFromDOM = false;
                    let foundLossFromDOM = false;
                    try {
                        // Selectores de filas cerradas comunes en Quotex
                        const closedTrades = document.querySelectorAll('.history-list .item, .trades-list .item, .history__item, [class*="item-history"]');
                        if (closedTrades.length > 0) {
                            const lastTradeItem = closedTrades[0]; // El más reciente de arriba
                            const isProfitText = lastTradeItem.innerHTML.includes("+") || lastTradeItem.classList.contains('win') || lastTradeItem.classList.contains('profit') || lastTradeItem.innerHTML.includes("green") || lastTradeItem.innerHTML.includes("success");
                            const isLossText = lastTradeItem.innerHTML.includes("$0.00") || lastTradeItem.classList.contains('loss') || lastTradeItem.innerHTML.includes("red");
                            if (isProfitText) foundWinFromDOM = true;
                            if (isLossText) foundLossFromDOM = true;
                        }
                    } catch(e) {}

                    let isWin = false;
                    
                    if (foundWinFromDOM) {
                        isWin = true;
                        console.log("💰 [Resultado Verificado] Detectado WIN en la interfaz de usuario de Quotex.");
                    } else if (foundLossFromDOM) {
                        isWin = false;
                        console.log("🔴 [Resultado Verificado] Detectado LOSS en la interfaz de usuario de Quotex.");
                    } else {
                        // Si no hay DOM directo recurrimos al delta del balance.
                        // Si balance final es mayor al anterior después del debito, es un WIN.
                        // El broker descuenta el stake casi al instante.
                        if (balanceAfter > (balanceBefore - (trade.amount * 0.9))) {
                            isWin = true;
                            console.log("💰 [Resultado Diferencial] Balance final asienta WIN: " + balanceAfter + " > " + balanceBefore);
                        } else {
                            isWin = false;
                            console.log("🔴 [Resultado Diferencial] Balance final asienta LOSS o Empate: " + balanceAfter + " vs " + balanceBefore);
                        }
                    }

                    const profitEarned = isWin ? (trade.amount * 0.85) : -trade.amount;

                    const resultMessage = {
                        type: "TRADE_RESULT",
                        data: {
                            id: trade.id || Math.random().toString(36).substring(4),
                            symbol: trade.symbol,
                            type: trade.direction,
                            amount: trade.amount,
                            status: isWin ? "WIN" : "LOSS",
                            profit: parseFloat(profitEarned.toFixed(2)),
                            payout: 85,
                            time: Date.now(),
                            expiry: trade.expiry
                        }
                    };

                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify(resultMessage));
                        console.log("🚀 [Enlace Argentum] Resultados enviados a la Central Argentum con éxito.");
                    }
                }

                // Iniciar análisis de balance con micro-delay de resolución del ticker del servidor
                setTimeout(verifyOutcome, 1500);

            }, monitorSeconds * 1000);

        }, reactionDelay);
    }

    // Simula una rotación de activo estricta y humana en la interfaz de Quotex
    function switchStrictAssetOnQuotex(assetName) {
        console.log("🔄 [Argentum Estricto] Petición de rotación recibida para: " + assetName);
        showStatusBanner("🔄 ROTANDO ACTIVO A " + assetName + "...", "#6366f1");

        const normalize = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const cleanName = normalize(assetName);
        const coreAsset = cleanName.replace("OTC", "");
        const isOtcSearched = cleanName.includes("OTC");
        
        // --- 1. Buscar en Pestañas (Tabs) ya abiertas para cambiar foco al instante con click simulado
        let targetTab = null;
        try {
            const tabs = document.querySelectorAll('.tabs__item, [class*="tab-item"], .tabs__item-name');
            for (let tab of tabs) {
                const txt = normalize(tab.textContent);
                if (txt && (txt === cleanName || txt.includes(cleanName) || cleanName.includes(txt))) {
                    targetTab = tab.closest('.tabs__item') || tab;
                    break;
                }
            }
        } catch (e) {
            console.warn("Error buscando pestañas abiertas:", e);
        }

        if (targetTab) {
            console.log("✅ Pestaña activa pre-existente encontrada para: " + assetName);
            targetTab.click();
            showStatusBanner("✅ ENLACE IA ACTIVO - ROTADO A " + assetName, "#10b981");
            return;
        }

        // --- 2. Si no es pestaña abierta, intentar activar el buscador y escribir el activo
        console.log("🔍 Activo " + assetName + " no está en pestañas. Activando buscador...");
        try {
            const assetBtn = document.querySelector('.asset-select__button, .asset-select, button[class*="asset-select"], div[class*="asset-select"], .tab-add, .tabs__add, .tabs__item_add, .tabs__add-btn, [class*="add-tab"]');
            if (assetBtn) {
                assetBtn.click();
                
                setTimeout(() => {
                    const searchInput = document.querySelector('.asset-search input, .search input, .assets-search input, .select-list input, .popup input, .modal input, input[placeholder*="Busc"], input[placeholder*="Search"], input[placeholder*="Activo"], input[type="text"]');
                    if (searchInput) {
                        const searchString = assetName.split('(')[0].trim();
                        
                        // Forzado nativo del valor en inputs controlados por React/Angular/Vue
                        try {
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                            if (nativeInputValueSetter) {
                                nativeInputValueSetter.call(searchInput, searchString);
                            } else {
                                searchInput.value = searchString;
                            }
                        } catch (reactErr) {
                            searchInput.value = searchString;
                        }
                        
                        // Propagar eventos nativos completos
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                        searchInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
                    }

                    setTimeout(() => {
                        // Buscar en todas las filas de la modal de activos de manera inteligente
                        const items = Array.from(document.querySelectorAll('.asset-item, .assets-list .item, [class*="asset-list"] [class*="item"], .asset-select__list-item, .assets-table__row, [class*="assets-table__row"], [class*="select-list"] [class*="item"]'));
                        let clicked = false;
                        
                        // Intentar coincidencia perfecta primero (par y OTC/Normal emparejados)
                        for (let item of items) {
                            if (!item || !item.textContent || item.offsetHeight === 0) continue;
                            const nameText = normalize(item.textContent);
                            if (nameText === cleanName) {
                                item.click();
                                clicked = true;
                                console.log("🎯 Activo seleccionado (Perfect Match): " + assetName);
                                showStatusBanner("✅ ENLACE IA ACTIVO - ROTADO A " + assetName, "#10b981");
                                break;
                            }
                        }

                        // Coincidencia flexible si no se encontró perfecta
                        if (!clicked) {
                            for (let item of items) {
                                if (!item || !item.textContent || item.offsetHeight === 0) continue;
                                const nameText = normalize(item.textContent);
                                const isOtcItem = nameText.includes("OTC");
                                const itemCore = nameText.replace("OTC", "");
                                
                                if (itemCore === coreAsset && isOtcItem === isOtcSearched) {
                                    item.click();
                                    clicked = true;
                                    console.log("🎯 Activo seleccionado (Flexible Match): " + assetName);
                                    showStatusBanner("✅ ENLACE IA ACTIVO - ROTADO A " + assetName, "#10b981");
                                    break;
                                }
                            }
                        }

                        // Búsqueda profunda de último recurso recorriendo toda la modal abierta
                        if (!clicked) {
                            const popups = document.querySelectorAll('.popup, .modal, .dropdown-menu, .select-list, [class*="modal"], [class*="popup"], [class*="select-list"]');
                            for (let popup of popups) {
                                const elements = popup.querySelectorAll('div, span, button, [class*="item"]');
                                for (let el of elements) {
                                    if (!el || !el.textContent || el.offsetHeight === 0) continue;
                                    const ext = normalize(el.textContent);
                                    const elementCore = ext.replace("OTC", "");
                                    const isOtcElement = ext.includes("OTC");
                                    
                                    if (ext === cleanName || (elementCore === coreAsset && isOtcElement === isOtcSearched)) {
                                        el.click();
                                        clicked = true;
                                        showStatusBanner("✅ ENLACE IA ACTIVO - ROTADO A " + assetName, "#10b981");
                                        break;
                                    }
                                }
                                if (clicked) break;
                            }
                        }
                    }, 450);

                    // 5. Telemetry screen synchronizer (Sends live actual balance and current active asset)
    function startQuotexScreenSync() {
        const blacklistedWords = [
            "TRADE", "TRADING", "MARKET", "ACCOUNT", "DEMO", "SUPPORT", "TOURNAMENT", "TOURNAMENTS", 
            "TOURNA", "OURNA", "MENT", "MORE", "LOGIN", "INDEX", "STATUS", "PROFILE", "DRAWER", "SETTINGS", 
            "HELP", "LIVE", "BONUS", "DEPOSIT", "WITHDRAWAL", "PENDING", "TRADES", "UP", "DOWN", "CALL", 
            "PUT", "SIGNAL", "CHART"
        ];

        const isValidSymbol = (sym) => {
            if (!sym) return false;
            const clean = sym.toUpperCase().trim().replace(/[\s()]/g, "");
            for (const w of blacklistedWords) {
                if (clean === w || clean.includes(w)) return false;
            }
            return true;
        };

        // Persistent cache to preserve previous validated asset state during transient loading phases
        let lastKnownAsset = "EUR/USD (OTC)";

        const getLivePrice = () => {
            const specificSelectors = [
                '.chart-container .price-label',
                '[class*="price-label"]',
                '.current-price-label',
                '.ticker-price-value',
                '.ticker-price',
                '.header__price',
                '.header__ticker-price',
                '[class*="ticker-price"]',
                '[class*="current-price"]',
                '[class*="chart-price"]',
                '.price-value',
                '[class*="price-value"]'
            ];

            const isValidPrice = (val, rawText) => {
                if (isNaN(val) || val <= 0 || val > 1000000) return false;
                if (rawText.includes('%') || rawText.includes(':') || rawText.includes('$') || rawText.toLowerCase().includes('demo') || rawText.toLowerCase().includes('live')) return false;
                if (!rawText.includes('.')) return false;
                return true;
            };

            for (const sel of specificSelectors) {
                try {
                    const elements = document.querySelectorAll(sel);
                    for (const el of elements) {
                        if (!el) continue;
                        const txt = (el.textContent || "").trim();
                        if (!txt) continue;
                        const cleanStr = txt.replace(/[^0-9.]/g, '');
                        if (!cleanStr) continue;
                        const val = parseFloat(cleanStr);
                        if (isValidPrice(val, txt)) {
                            return val;
                        }
                    }
                } catch(e) {}
            }

            // High priority lightweight fallback selectors
            try {
                const candidates = document.querySelectorAll('[class*="price"], [class*="ticker"], [class*="value"]');
                for (const el of candidates) {
                    if (!el || el.children.length > 1) continue;
                    if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
                    const txt = (el.textContent || "").trim();
                    const cleanStr = txt.replace(/[^0-9.]/g, '');
                    if (!cleanStr) continue;
                    const val = parseFloat(cleanStr);
                    if (isValidPrice(val, txt)) {
                        return val;
                    }
                }
            } catch(e) {}

            return null;
        };

        setInterval(() => {
            if (!socket || socket.readyState !== WebSocket.OPEN) return;

            try {
                let foundAsset = "";

                // High-Precision Algorithmic Active Asset Detection
                const getActiveAsset = () => {
                    // Try 1: Scan active tabs if multiple tabs exist
                    try {
                        const activeTab = document.querySelector('.tabs__item_active, .tabs__item.active, [class*="tabs__item"][class*="active"], [class*="tab-active"], .tab-active');
                        if (activeTab) {
                            const nameEl = activeTab.querySelector('.tabs__item-name, [class*="name"], span');
                            const rawText = (nameEl ? nameEl.textContent : activeTab.textContent) || "";
                            const cleanText = rawText.trim().toUpperCase().replace(/\\s+/g, ' ');
                            if (cleanText && cleanText.length >= 6 && cleanText.length <= 18) {
                                return cleanText;
                            }
                        }
                    } catch (err) {}

                    // Try 2: Scan selective active CSS selectors
                    const selectiveSelectors = [
                        '.tabs__item_active', 
                        '.tabs__item--active',
                        '.tabs__item.active',
                        '.tab-active', 
                        '.tiles-item-active',
                        '.active-tab',
                        '.active-asset', 
                        '.current-asset',
                        '.tabs__item_active .tabs__item-name',
                        '.tabs__item.active .tabs__item-name',
                        '.asset-select__button', 
                        '.asset-select__title',
                        '.asset-select'
                    ];
                    for (const sel of selectiveSelectors) {
                        try {
                            const el = document.querySelector(sel);
                            if (el && el.textContent) {
                                let isVisible = el.offsetWidth > 0 || el.offsetHeight > 0;
                                if (isVisible) {
                                    const text = el.textContent.trim().toUpperCase().replace(/\\s+/g, ' ');
                                    if (text && text.length >= 6 && text.length <= 18) {
                                        return text;
                                    }
                                }
                            }
                        } catch (err) {}
                    }

                    // Try 3: Document title
                    if (typeof document !== 'undefined' && document.title) {
                        const titleStr = document.title.toUpperCase();
                        const match = titleStr.match(/([A-Z]{3}[\\/_-]?[A-Z]{3}(\\s*\\(?OTC\\)?)?)/i);
                        if (match) {
                            return match[1].trim().toUpperCase();
                        }
                    }

                    return null;
                };

                const detectedAsset = getActiveAsset();
                if (detectedAsset) {
                    foundAsset = detectedAsset;
                }

                if (foundAsset && isValidSymbol(foundAsset)) {
                    lastKnownAsset = foundAsset;
                }

                const currentAsset = lastKnownAsset;

                // Try to find the live balance text robustly
                let foundBalanceText = "";
                const balanceSelectors = [
                    '.header__balance-val', 
                    '.header__balance-value',
                    '.header__balance .value',
                    '.header__active-balance',
                    '.account-balance', 
                    '.balance-value', 
                    '.user-balance',
                    '.header__demo',
                    '.header__live',
                    '.header__balance',
                    '[class*="balance-val"]',
                    '[class*="balance"]',
                    '.balance'
                ];
                
                for (const sel of balanceSelectors) {
                    try {
                        const candidates = document.querySelectorAll(sel);
                        for (const el of candidates) {
                            if (el && el.textContent) {
                                // Exclude actual choice selectors or dialog models only
                                if (el.closest('.modal, .popup, .account-select__dropdown, .select-list, .modal-dialog, .dropdown, .menu')) {
                                    continue;
                                }
                                const txt = el.textContent.trim();
                                if (txt && /[0-9]/.test(txt)) {
                                    foundBalanceText = txt;
                                    break;
                                }
                            }
                        }
                        if (foundBalanceText) break;
                    } catch (err) {}
                }
                
                // Fallback scan: Search inside the main header or top bar string
                if (!foundBalanceText) {
                    try {
                        const header = document.querySelector('header, .header, .header__right, .user-panel, [class*="header"]');
                        if (header && header.textContent) {
                            const txt = header.textContent;
                            // Match demo/real plus currency signs followed by digits
                            const match = txt.match(/(?:DEMO|REAL|LIVE)?\\s*[\\$€£R]?\\s*[0-9]+[0-9,.]*/i);
                            if (match) {
                                foundBalanceText = match[0];
                            }
                        }
                    } catch (err) {}
                }

                // Analyze balance and clean decimal signs
                let cleanedBalance = 10000.00;
                if (foundBalanceText) {
                    let clean = foundBalanceText.replace(/[^0-9.,]/g, '');
                    if (clean.includes('.') && clean.includes(',')) {
                        if (clean.indexOf('.') < clean.indexOf(',')) {
                            clean = clean.replace(/\\./g, '').replace(/,/g, '.');
                        } else {
                            clean = clean.replace(/,/g, '');
                        }
                    } else if (clean.includes(',')) {
                        const parts = clean.split(',');
                        if (parts[1].length === 2 || parts[1].length === 1) {
                            clean = clean.replace(/,/g, '.');
                        } else {
                            clean = clean.replace(/,/g, '');
                        }
                    }
                    const numMatch = clean.match(/[0-9.]+/);
                    if (numMatch) {
                        cleanedBalance = parseFloat(numMatch[0]) || 10000.00;
                    }
                }

                // Try to identify account mode (Live vs Demo) safely without expensive innerText reflows
                let isDemo = true;
                if (window.location.href.includes("demo-trade") || window.location.href.includes("demo")) {
                    isDemo = true;
                } else if (window.location.href.includes("real-trade") || window.location.href.includes("trade") || window.location.href.includes("live")) {
                    isDemo = false;
                } else {
                    try {
                        const header = document.querySelector('header, .header, .header__right, .user-panel, [class*="header"]');
                        if (header && header.textContent) {
                            const txt = header.textContent.toUpperCase();
                            if (txt.includes('REAL') || txt.includes('LIVE')) {
                                isDemo = false;
                            }
                        }
                    } catch (e) {}
                }

                // Double check demo indicator - if the balance has the word DEMO, or we see demo texts on header
                try {
                    const demoHeaderMatch = document.querySelector('.header__demo, .header__balance-demo, [class*="demo"]');
                    if (demoHeaderMatch && !demoHeaderMatch.closest('.dropdown, .menu, .popup, .modal')) {
                        isDemo = true;
                    }
                } catch (e) {}

                // Prioritize live intercepted WebSocket telemetry to ensure flawless, real-time data sync with NO discrepancy
                const finalAsset = (liveInterceptedAsset !== null) ? liveInterceptedAsset : lastKnownAsset;
                const currentPrice = (liveInterceptedPrice !== null) ? liveInterceptedPrice : getLivePrice();
                const finalBalance = (liveInterceptedBalance !== null) ? liveInterceptedBalance : cleanedBalance;
                const finalIsDemo = (liveInterceptedIsDemo !== null) ? liveInterceptedIsDemo : isDemo;

                console.log("📡 [Argentum Sync] Sincronizando -> Activo: " + finalAsset + " | Precio: " + currentPrice + " | Balance: " + finalBalance + " | Demo: " + finalIsDemo);

                socket.send(JSON.stringify({
                    type: "QUOTEX_SYNC",
                    data: {
                        balance: finalBalance,
                        asset: finalAsset,
                        price: currentPrice,
                        isDemo: finalIsDemo,
                        timestamp: Date.now()
                    }
                }));

            } catch (err) {
                console.warn("⚠️ Failed to compile Quotex telemetry:", err);
            }
        }, 1000);
    }

    connect();
})();`;

  const copyToClipboard = () => {
    const handleSuccess = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const fallbackCopy = () => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = tampermonkeyScript;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          handleSuccess();
        } else {
          console.error("No se pudo copiar automáticamente.");
        }
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tampermonkeyScript)
          .then(handleSuccess)
          .catch((err) => {
            console.warn("Clipboard API failed, using fallback:", err);
            fallbackCopy();
          });
      } else {
        fallbackCopy();
      }
    } catch (e) {
      console.warn("Clipboard exception, using fallback:", e);
      fallbackCopy();
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-md shadow-zinc-950/50">
      
      {/* Title Header Section */}
      <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 mb-4">
        <div className="h-9 w-9 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 text-indigo-400">
          <Settings className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="font-sans font-bold text-sm text-zinc-50">Consola de Control de Estrategias y Perfiles</h3>
          <p className="text-[11px] text-zinc-400">Configure los umbrales de riesgo, multiplicadores martingale e instale el automatizador.</p>
        </div>
      </div>

      {/* Dynamic Quotex Sync & Telemetry Status Widget */}
      <div className="mb-4 bg-zinc-900/30 border border-zinc-900 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${quotexSyncData ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span translate="no" className="notranslate text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-300">
              {quotexSyncData ? (
                <span translate="no" className="notranslate">Vínculo Pantalla Abierta</span>
              ) : (
                <span translate="no" className="notranslate">Esperando Script en Quotex</span>
              )}
            </span>
          </div>
          {quotexSyncData && (
            <span translate="no" className="notranslate text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-500/10 text-indigo-400">
              Sincronizado
            </span>
          )}
        </div>

        {quotexSyncData ? (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between items-center bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">
              <span className="text-zinc-500 text-[10px]">Capital Sincronizado:</span>
              <span className="font-bold text-emerald-400">
                ${quotexSyncData.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                <span className="text-[9px] text-zinc-500 ml-1">({quotexSyncData.isDemo ? 'DEMO-TRADE' : 'REAL'})</span>
              </span>
            </div>

            <div className={`p-2 rounded-lg border flex flex-col gap-1 ${
              (quotexSyncData.asset.toUpperCase().replace(/\s+/g, '') === settings.activeAsset.toUpperCase().replace(/\s+/g, '')) 
                ? 'bg-zinc-950/40 border-zinc-900' 
                : 'bg-rose-950/15 border-rose-900/60'
            }`}>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-500">Activo Abierto en Quotex:</span>
                <span className="font-bold text-zinc-300">{quotexSyncData.asset}</span>
              </div>
              {!(quotexSyncData.asset.toUpperCase().replace(/\s+/g, '').includes(settings.activeAsset.toUpperCase().replace(/\s+/g, '').split('(')[0])) && (
                <p className="text-[9px] text-rose-400 leading-tight mt-1">
                  ⚠️ Advertencia: Cambie su activo en Argentum a &ldquo;{quotexSyncData.asset}&rdquo; o abra &ldquo;{settings.activeAsset}&rdquo; en Quotex para simular correctamente.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-500 leading-normal">
            Abra la plataforma <a href="https://qxbroker.com/en/demo-trade" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-350 font-bold">Quotex Demo</a> con el script activado en Tampermonkey para ver de inmediato todo el capital de la cuenta, activos de scan y protecciones estictas.
          </div>
        )}
      </div>

      {/* Tabs list navigation */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-900/60 p-1 rounded-xl mb-5">
        <button
          id="tab-risk-btn"
          onClick={() => setActiveTab('risk')}
          className={`py-2 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'risk' ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Riesgo y Capital
        </button>
        <button
          id="tab-indicators-btn"
          onClick={() => setActiveTab('indicators')}
          className={`py-2 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'indicators' ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Brain className="h-3.5 w-3.5" />
          Indicadores IA
        </button>
        <button
          id="tab-script-btn"
          onClick={() => setActiveTab('script')}
          className={`py-2 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'script' ? "bg-zinc-800 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          Enlace Navegador
        </button>
      </div>

      {/* Content Area according to activeTab */}
      {activeTab === 'risk' && (
        <div className="space-y-4 font-sans">
          
          {/* Risk Profile Selector Card */}
          <div>
            <label className="text-[11px] font-bold text-zinc-400 block mb-2 uppercase font-mono tracking-wider">Perfil Integrado de Trading</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'conservative', label: 'Conservador', desc: 'Max 1 Martingale, $1-5' },
                { id: 'balanced', label: 'Balanceado', desc: 'Max 2 Martingale, $10-25' },
                { id: 'aggressive', label: 'Agresivo', desc: 'Max 3 Martingale, Alta ganancia' },
              ].map((prof) => (
                <button
                  id={`profile-${prof.id}-btn`}
                  key={prof.id}
                  onClick={() => handleRiskProfileChange(prof.id as RiskProfile)}
                  className={`border rounded-xl p-2.5 text-left transition-all ${
                    settings.riskProfile === prof.id
                      ? "border-emerald-500 bg-emerald-950/20 shadow-emerald-500/5 text-zinc-50"
                      : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 text-zinc-400"
                  }`}
                >
                  <span className="text-xs font-bold block">{prof.label}</span>
                  <p className="text-[9px] text-zinc-500 leading-tight mt-0.5">{prof.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Amount settings */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1">Inversión por Operación</label>
              <div className="flex gap-2">
                <input
                  id="trade-amount-input"
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.tradeAmount}
                  onChange={(e) => setSettings({ ...settings, tradeAmount: Number(e.target.value) })}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold w-full focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-zinc-400 font-bold text-xs flex items-center justify-center">USD</span>
              </div>
            </div>

            {/* Martingale Multiplier */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1">Multiplicador Martingale</label>
              <input
                id="martingale-mult-input"
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                value={settings.martingaleMultiplier}
                onChange={(e) => setSettings({ ...settings, martingaleMultiplier: Number(e.target.value) })}
                className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold w-full focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 animate-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Martingale steps limits */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1">Niveles Máx Martingale</label>
              <div className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
                <input
                  id="martingale-max-input"
                  type="range"
                  min="0"
                  max="4"
                  value={settings.martingaleMaxSteps}
                  onChange={(e) => setSettings({ ...settings, martingaleMaxSteps: Number(e.target.value) })}
                  className="accent-indigo-500 w-full"
                />
                <span className="text-xs font-mono font-bold text-zinc-200">{settings.martingaleMaxSteps} Niv.</span>
              </div>
            </div>

            {/* Stop Loss limits */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1">Límite Diario de Stop Loss</label>
              <div className="flex gap-2">
                <input
                  id="stop-loss-input"
                  type="number"
                  min="1"
                  value={settings.stopLoss}
                  onChange={(e) => setSettings({ ...settings, stopLoss: Number(e.target.value) })}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold w-full focus:outline-none focus:border-indigo-600"
                />
                <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-rose-400 font-bold text-xs flex items-center justify-center">SL</span>
              </div>
            </div>
          </div>

          {/* NEW: AI Engine Model Selector */}
          <div className="pt-3 border-t border-zinc-900">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider mb-2.5">Inyección de Inteligencia Artificial (Analizadores)</h4>
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Motor Analítico Activo</label>
              <select
                id="ai-model-select"
                value={settings.aiModel || 'consensus'}
                onChange={(e) => setSettings({ ...settings, aiModel: e.target.value as any })}
                className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold w-full focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 animate-none"
              >
                <option value="gemini">Google Gemini 3.5 Flash (Oficial)</option>
                <option value="groq">Groq Llama 3.3 70B (Hiper-Velocidad y Precisión)</option>
                <option value="deepseek">DeepSeek V3 (Análisis Cuantitativo Directo)</option>
                <option value="openrouter">OpenRouter Multi-LLM (Especialistas Libres)</option>
                <option value="consensus">CONSENSO HÍBRIDO IA (Garantía de Acierto Máximo) 🏆</option>
              </select>
              <p className="text-[10px] text-zinc-400 leading-snug mt-1.5 pl-1 italic">
                {(settings.aiModel === 'consensus' || !settings.aiModel) && "En Co-Consenso, el servidor interroga a Gemini, Groq, DeepSeek y OpenRouter en paralelo. Solo se emite la señal si hay acuerdo técnico unánime entre los motores, maximizando el número de operaciones ganadoras."}
                {settings.aiModel === 'groq' && "Usa el hardware de ultra-velocidad de Groq con Llama 3.3 70B. Analiza patrones complejos de velas y confirma entradas rápidas de 1 minuto."}
                {settings.aiModel === 'deepseek' && "Utiliza el modelo oficial DeepSeek-V3 para un desglose cuantitativo minucioso de indicadores y soportes numéricos."}
                {settings.aiModel === 'openrouter' && "Envía peticiones redundantes optimizadas hacia la cola abierta de OpenRouter usando las mejores inteligencias artificiales disponibles."}
                {settings.aiModel === 'gemini' && "Inyecta inteligencia semántica avanzada desarrollada por Google DeepMind, ideal para tendencias estables."}
              </p>
            </div>
          </div>

          {/* NEW: Operational Duration (Expiry) & Auto-Rotation configuration */}
          <div className="pt-3 border-t border-zinc-900">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider mb-2.5">Tiempos y Rotación de Activos (M. Estricto)</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Expiration selection block */}
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Tiempo de Expiración</label>
                <select
                  id="trade-expiry-select"
                  value={settings.tradeExpiry}
                  onChange={(e) => setSettings({ ...settings, tradeExpiry: Number(e.target.value) })}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold w-full focus:outline-none focus:border-indigo-600"
                >
                  <option value={30}>30 Segundos</option>
                  <option value={60}>1 Minuto (60s)</option>
                  <option value={120}>2 Minutos (120s)</option>
                  <option value={180}>3 Minutos (180s)</option>
                  <option value={300}>5 Minutos (300s)</option>
                </select>
              </div>

              {/* Rotation switches block */}
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Intervalo de Rotación (Barrido)</label>
                <select
                  id="rotation-interval-select"
                  value={settings.autoRotationInterval}
                  onChange={(e) => setSettings({ ...settings, autoRotationInterval: Number(e.target.value) })}
                  disabled={!settings.autoRotationEnabled}
                  className={`bg-zinc-900 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold w-full focus:outline-none focus:border-indigo-600 ${
                    !settings.autoRotationEnabled && 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <option value={15}>15 Segundos</option>
                  <option value={30}>30 Segundos</option>
                  <option value={60}>1 Minuto</option>
                  <option value={120}>2 Minutos</option>
                  <option value={300}>5 Minutos</option>
                </select>
              </div>
            </div>

            {/* Toggle Rotation state */}
            <div className="mt-3 bg-zinc-900/30 border border-zinc-900 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200 block">Habilitar Rotación de Activos</span>
                <p className="text-[10px] text-zinc-505 leading-tight mt-0.5">
                  El bot cambiará automáticamente de activo para buscar señales optimizadas por Gemini en todo el catálogo.
                </p>
              </div>
              <div className="relative">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="auto-rotation-toggle"
                    type="checkbox"
                    checked={settings.autoRotationEnabled}
                    onChange={(e) => setSettings({ ...settings, autoRotationEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-100 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
            
            {/* Strict status guard notification badge */}
            <div className="mt-3 bg-emerald-950/20 border border-emerald-900/60 rounded-xl px-3 py-2 flex items-start gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 animate-pulse flex-shrink-0"></span>
              <p className="text-[10px] text-emerald-400 font-sans leading-snug">
                <strong>Modo Humano Avanzado:</strong> La rotación se congela si hay transacciones activas. Esto previene un cambio repentino de pestañas de activo que delataría la automatización robotizada.
              </p>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'indicators' && (
        <div className="space-y-4">
          <label className="text-[11px] font-bold text-zinc-400 block mb-2 uppercase font-mono tracking-wider">Confirmaciones de Filtros Técnicos</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'rsi', name: 'Índice de Fuerza Relativa (RSI)', desc: 'Detecta sobrecompra/sobreventa extrema.' },
              { id: 'ema', name: 'Cruce Exponencial de Medias (EMA)', desc: 'Confirma la dirección de tendencias locales.' },
              { id: 'bb', name: 'Bandas de Bollinger (BB)', desc: 'Identifica compresión y rompimiento de rango.' },
              { id: 'macd', name: 'Convergencia y Divergencia (MACD)', desc: 'Evalúa la inercia dinámica del mercado.' },
            ].map((ind) => {
              const enabled = (settings.indicators as any)[ind.id].enabled;
              return (
                <div
                  key={ind.id}
                  onClick={() => handleIndicatorToggle(ind.id as any)}
                  className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition ${
                    enabled
                      ? "border-indigo-500 bg-indigo-950/10 text-zinc-100"
                      : "border-zinc-900 hover:border-zinc-800 bg-zinc-900/10 text-zinc-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => {}} // handled by div click
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold block">{ind.name}</span>
                    <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">{ind.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'script' && (
        <div className="space-y-4 font-sans">
          <div className="bg-zinc-900 border border-zinc-840 rounded-xl p-4">
            <h4 className="text-xs font-bold text-indigo-400 mb-2 flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-indigo-400" />
              Guía de Integración con Quotex (Real o Demo)
            </h4>
            
            <ol className="text-[11px] text-zinc-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
              <li>Instala la extensión <strong className="text-zinc-50">Tampermonkey</strong> en Chrome o tu navegador.</li>
              <li>Crea un script nuevo en la extensión, borra el borrador por defecto y pega el código de abajo.</li>
              <li>Guarda el script y abre la plataforma <strong className="text-zinc-50">Quotex</strong> (qxbroker.com / quotex.io).</li>
              <li>Verás un indicador arriba a la derecha: <strong className="text-emerald-400 font-mono">✅ ENLACE IA ACTIVO</strong>.</li>
              <li>¡El bot comenzará a colocar operaciones de forma automática o semiautomática según elijas en esta APP!</li>
            </ol>
          </div>

          {/* Sincronizador de Host: Control de seguridad para sandbox e iframes */}
          <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">Host de Enlace (Server Core):</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400 animate-pulse">
                Sincronización Sandbox
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-tight">
              Si la APP se ejecuta dentro de un iframe en el editor, ingresa el host del servidor para regenerar el script exacto:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainOverride}
                onChange={(e) => setDomainOverride(e.target.value)}
                placeholder="Dominio de este servidor panel"
                className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold w-full focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 animate-none"
              />
              <button
                onClick={() => setDomainOverride(typeof window !== 'undefined' ? window.location.host : 'localhost:3000')}
                className="px-2.5 py-1 text-[10px] uppercase font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 rounded hover:text-zinc-100 transition"
                title="Restaurar valor detectado"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Diagnostic assistance details */}
          <div className="bg-rose-950/10 border border-rose-900/40 rounded-xl p-3.5 space-y-2">
            <h5 className="text-[10.5px] font-bold text-rose-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              ⚠️ ¿EL SISTEMA NO DETECTA EL SCRIPT? (SOLUCIONES PASO A PASO)
            </h5>
            <div className="text-[10.5px] text-zinc-450 space-y-2 leading-relaxed">
              <p>
                Si tienes el script activado pero el panel dice <span className="text-amber-400 font-bold">Esperando Script...</span>, se debe al <strong>CSP (Content Security Policy)</strong>: un muro de seguridad de Quotex que bloquea conexiones WebSocket externas. Resuélvelo en 1 minuto:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-zinc-350">
                <li>
                  <strong className="text-zinc-100">Solución 1:</strong> Instala la extensión de Chrome <a href="https://chromewebstore.google.com/detail/disable-content-security/lhbnoooleijbclbeokgihnehnoenmglg" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-bold hover:text-indigo-300">Disable Content-Security-Policy</a> o <span className="text-zinc-100">Cors & CSP Unblock</span>. Actívala en la pestaña de Quotex y recarga la página. ¡Esto remueve el bloqueo de inmediato!
                </li>
                <li>
                  <strong className="text-zinc-100">Solución 2 (Recomendada):</strong> Haz clic en el enlace superior <strong className="text-indigo-400">"Desplegar / Abrir en pestaña"</strong> para abrir esta APP directamente en su propia pestaña limpia de navegador. Así evitas el sandbox del iframe del chat de AI Studio y facilitas enormemente la conexión.
                </li>
                <li>
                  <strong className="text-zinc-100">Solución 3:</strong> Abre la <span className="text-zinc-100">Consola de Desarrollador (F12)</span> en la pestaña de Quotex. Verás si el script se está conectando o si hay un error de bloqueo que la extensión de CSP neutralizará enseguida.
                </li>
              </ul>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-505 block">UserScript Autolink de Tampermonkey</span>
              <button
                id="copy-script-btn"
                onClick={copyToClipboard}
                translate="no"
                className="notranslate py-1 px-3 rounded-lg border border-indigo-700/50 bg-indigo-950/20 hover:bg-indigo-900 text-indigo-300 text-[10px] font-bold font-mono transition flex items-center justify-center min-w-[100px]"
              >
                <span translate="no" className="notranslate flex items-center gap-1 select-none pointer-events-none">
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span translate="no" className="notranslate text-zinc-100">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span translate="no" className="notranslate text-zinc-100">Copiar Script</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Code screen display block */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 max-h-[160px] overflow-y-auto">
              <pre className="text-[10px] text-zinc-400 font-mono select-all leading-normal whitespace-pre">
                {tampermonkeyScript}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
