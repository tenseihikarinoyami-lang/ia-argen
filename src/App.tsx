/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { TechnicalChart } from './components/TechnicalChart';
import { AISniper } from './components/AISniper';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryLogs } from './components/HistoryLogs';
import {
  SystemSettings,
  Candlestick,
  Trade,
  AIAnalysis,
  TradeType,
} from './types';
import {
  X,
  Loader2
} from 'lucide-react';

const isValidSymbol = (sym: string): boolean => {
  if (!sym) return false;
  const upper = sym.toUpperCase().trim().split("(")[0].trim().replace("/", "");
  const knownAssets = [
    'EURUSD', 'GBPUSD', 'EURGBP', 'USDCAD', 'USDBRL', 'AUDUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'NZDUSD', 'AUDCAD', 'GBPCHF', 'GOLD', 'BTCUSD', 'ETHUSD', 'NZDJPY', 'USDARS', 'USDMXN'
  ];
  if (knownAssets.includes(upper)) return true;
  
  // Check if standard 6-character FX pair with valid currencies
  if (upper.length === 6) {
    const base = upper.substring(0, 3);
    const quote = upper.substring(3, 6);
    const validCurrencies = [
      "EUR", "USD", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "BRL", "MXN", "BTC", "ETH", "LTC", "XRP", 
      "TRY", "INR", "IDR", "ARS", "MYR", "VND", "PHP", "THB", "KZT", "COP", "CLP", "PEN", "CNY", "RUB", "SGD", "ZAR"
    ];
    return validCurrencies.includes(base) && validCurrencies.includes(quote);
  }
  return false;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Configs & Parameter thresholds
  const [settings, setSettings] = useState<SystemSettings>({
    assets: [
      'EUR/USD (OTC)', 'GBP/USD (OTC)', 'EUR/GBP (OTC)', 'USD/CAD (OTC)', 'USD/BRL (OTC)',
      'AUD/USD (OTC)', 'USD/JPY (OTC)', 'EUR/JPY (OTC)', 'GBP/JPY (OTC)', 'NZD/USD (OTC)',
      'AUD/CAD (OTC)', 'GBP/CHF (OTC)', 'Gold (OTC)',
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD', 'BTC/USD', 'ETH/USD'
    ],
    activeAsset: 'EUR/USD (OTC)',
    tradeAmount: 1,
    tradeExpiry: 60,
    autoRotationEnabled: false,
    autoRotationInterval: 60,
    usePercentageAmount: false,
    percentageOfBalance: 2,
    riskProfile: 'balanced',
    takeProfit: 100,
    stopLoss: 50,
    martingaleEnabled: true,
    martingaleMultiplier: 2.0,
    martingaleMaxSteps: 2,
    mode: 'semiautomatic',
    aiModel: 'consensus',
    indicators: {
      rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
      ema: { enabled: true, fastPeriod: 9, slowPeriod: 21 },
      bb: { enabled: true, period: 20, stdDev: 2 },
      macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
    },
  });

  // State arrays
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [activePrice, setActivePrice] = useState<number>(0);
  const [balance, setBalance] = useState<number>(1000.0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [botConnected, setBotConnected] = useState<boolean>(false);
  const [activeBotsCount, setActiveBotsCount] = useState<number>(0);
  const [quotexSyncData, setQuotexSyncData] = useState<{ balance: number; asset: string; isDemo: boolean; timestamp: number } | null>(null);
  const [lastTradeTimes, setLastTradeTimes] = useState<Record<string, number>>({});
  
  // Flash toast banners
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const socketConnectedRef = useRef<boolean>(false);
  const currentAssetRef = useRef<string>(settings.activeAsset);
  const candlesRef = useRef<Candlestick[]>([]);
  const tradesRef = useRef<Trade[]>([]);
  const settingsRef = useRef<SystemSettings>(settings);

  // Keep references synced perfectly to prevent stale state captures in intervals
  settingsRef.current = settings;
  candlesRef.current = candles;
  tradesRef.current = trades;

  // React on Authentication State transitions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Test database connection right after login
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            // First time login: Seed isolated UserProfile model to database
            const initialDoc = {
              userId: currentUser.uid,
              email: currentUser.email || 'anon@quotex-ai.com',
              createdAt: serverTimestamp(),
              balance: 1000.0,
              settings: settings,
            };
            await setDoc(docRef, initialDoc);
            console.log('Seeded new UserProfile on Firestore.');
          }
        } catch (err) {
          console.error("Test connection / init failed:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync profile and trades from Firestore in real-time when authenticated
  useEffect(() => {
    if (!user) return;

    // Real-time synchronization of settings & balance from Firestore UserProfile
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.settings) {
          const rawAssets = data.settings.assets || [];
          const sanitizedAssets = rawAssets.filter((asset: string) => isValidSymbol(asset));
          
          const isDirty = sanitizedAssets.length !== rawAssets.length || 
            !sanitizedAssets.includes(data.settings.activeAsset);
            
          const sanitizedSettings = {
            ...data.settings,
            tradeAmount: data.settings.tradeAmount === 10 ? 1 : (data.settings.tradeAmount ?? 1),
            assets: sanitizedAssets,
            activeAsset: sanitizedAssets.includes(data.settings.activeAsset)
              ? data.settings.activeAsset
              : (sanitizedAssets[0] || 'EUR/USD (OTC)')
          };
          
          setSettings(sanitizedSettings);
          
          if (isDirty) {
            updateDoc(userDocRef, {
              settings: sanitizedSettings,
              updatedAt: serverTimestamp()
            }).catch(e => console.error("Error laundering database record:", e));
          }
        }
        if (data.balance !== undefined) {
          setBalance(data.balance);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Real-time synchronization of trades list
    const tradesCollectionRef = collection(db, 'users', user.uid, 'trades');
    const tradesQuery = query(tradesCollectionRef, orderBy('entryTime', 'desc'));
    
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const loadedTrades: Trade[] = [];
      snapshot.forEach((doc) => {
        loadedTrades.push(doc.data() as Trade);
      });
      setTrades(loadedTrades);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/trades`);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeTrades();
    };
  }, [user]);

  // Intercept settings changes to persist on Firestore directly
  const saveIndicatorSettings = async (newSettings: SystemSettings) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        settings: newSettings,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    // Automatically sanitize and remove any invalid assets that might have leaked into the state
    const sanitizedAssets = newSettings.assets.filter(asset => isValidSymbol(asset));
    
    const sanitizedSettings = {
      ...newSettings,
      assets: sanitizedAssets,
      // If the currently active asset is invalid, fall back to the first valid asset in the list
      activeAsset: sanitizedAssets.includes(newSettings.activeAsset) 
        ? newSettings.activeAsset 
        : (sanitizedAssets[0] || 'EUR/USD (OTC)')
    };

    setSettings(sanitizedSettings);
    saveIndicatorSettings(sanitizedSettings);
  };

  const handleUpdateBalance = async (newBalance: number) => {
    if (!user) return;
    try {
      setBalance(newBalance);
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Synchronize dynamic asset changes across reference guards and broadcast to Quotex UserScripts
  useEffect(() => {
    currentAssetRef.current = settings.activeAsset;
    fetchHistory(settings.activeAsset);
    setAiAnalysis(null); // clear old predictions on asset change

    // Broadcast SWITCH_ASSET to Quotex browser extension
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "SWITCH_ASSET",
        data: {
          asset: settings.activeAsset
        }
      }));
    }
  }, [settings.activeAsset]);

  // Initial historic candles feed seed
  const fetchHistory = async (symbol: string) => {
    try {
      const response = await fetch(`/api/market/history/${encodeURIComponent(symbol)}`);
      if (response.ok) {
        const historyData = await response.json();
        setCandles(historyData);
        if (historyData.length > 0) {
          setActivePrice(historyData[historyData.length - 1].close);
        }
      }
    } catch (error) {
      console.error("Failed to seed initial candles:", error);
    }
  };

  // Connect Local WebSocket server for realtime ticks & automation link (Isolated per logged-in user)
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}?clientType=gui&userId=${user.uid}`;
    let isDestroyed = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    function connectWS() {
      if (isDestroyed) return;
      console.log(`Connecting isolated WS channel for UID: ${user?.uid}`);
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDestroyed) {
          ws.close();
          return;
        }
        console.log("WebSocket linked cleanly.");
        socketConnectedRef.current = true;
      };

      ws.onmessage = (event) => {
        if (isDestroyed) return;
        try {
          const payload = JSON.parse(event.data);
          
          // Manage live market symbol price ticks
          if (payload.type === 'AI_SIGNAL') {
            const data = payload.data;
            if (data.symbol === currentAssetRef.current) {
              setCandles(data.candles);
              setActivePrice(data.price);
            }
          }

          // Handle automation link connections report
          if (payload.type === 'SERVER_STATUS') {
            setBotConnected(payload.data.botConnected);
            setActiveBotsCount(payload.data.activeBots || 0);
          }

          // Capture finished outcome callbacks from custom client scripts
          if (payload.type === 'TRADE_RESULT') {
            const result = payload.data;
            resolveRealtimeTrade(result);
          }

          // Capture telemetry synchronizer data from the Quotex active tab
          if (payload.type === 'QUOTEX_SYNC') {
            setQuotexSyncData(payload.data);
            if (payload.data.candles && Array.isArray(payload.data.candles) && payload.data.candles.length > 0) {
              setCandles(payload.data.candles);
            }
            if (payload.data.balance !== undefined && payload.data.balance > 0) {
              handleUpdateBalance(payload.data.balance);
            }
            if (payload.data.price !== undefined && payload.data.price > 0 && payload.data.asset === currentAssetRef.current) {
              setActivePrice(payload.data.price);
            }
            // Dynamic real-time asset synchronization to eliminate client-side mismatches!
            if (payload.data.asset && payload.data.asset !== currentAssetRef.current) {
              const syncedAsset = payload.data.asset;
              if (isValidSymbol(syncedAsset)) {
                const currentSettings = settingsRef.current;
                const listContains = currentSettings.assets.includes(syncedAsset);
                handleUpdateSettings({
                  ...currentSettings,
                  assets: listContains ? currentSettings.assets : [...currentSettings.assets, syncedAsset],
                  activeAsset: syncedAsset
                });
                setToast(`Sincronizado: Quotex abrió ${syncedAsset}`, 'info');
              }
            }
          }

          // Handle raw price ticks from Quotex browser
          if (payload.type === 'QUOTEX_TICK') {
            const { asset, price } = payload.data || {};
            if (asset === currentAssetRef.current && typeof price === 'number' && price > 0) {
              setActivePrice(price);
            }
          }

        } catch (error) {
          console.error("Error processing websocket payload:", error);
        }
      };

      ws.onclose = () => {
        if (isDestroyed) return;
        console.warn("WS disconnected. Attempting reconnect...");
        socketConnectedRef.current = false;
        reconnectTimeout = setTimeout(connectWS, 4000);
      };

      ws.onerror = (err) => {
        // Prevent unhandled error exceptions in iframe runtime
        console.debug("WS error ignored during transient offline drops:", err);
      };
    }

    connectWS();

    return () => {
      isDestroyed = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  // Periodic status monitoring hook
  useEffect(() => {
    if (!user) return;
    const updateStatus = async () => {
      try {
        const res = await fetch('/api/quotex/status');
        if (res.ok) {
          const status = await res.json();
          setBotConnected(status.botConnected);
          setActiveBotsCount(status.activeBots || 0);
        }
      } catch (err) {
        console.debug("Failed checking status:", err);
      }
    };
    updateStatus(); // run once immediately
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Dispatch live Technical AI Analysis request to chosen AI engine
  const triggerAIAnalysis = async () => {
    const currentCandles = candlesRef.current;
    if (isAnalyzing || currentCandles.length === 0) return;
    setIsAnalyzing(true);

    const modelNames: Record<string, string> = {
      gemini: "Google Gemini 3.5",
      groq: "Groq Llama 3.3",
      deepseek: "DeepSeek V3",
      openrouter: "OpenRouter Multi-LLM",
      consensus: "CONSENSO HÍBRIDO IA 🏆"
    };
    const currentSettings = settingsRef.current;
    const activeModelName = modelNames[currentSettings.aiModel || "consensus"] || "Motor Inteligente";
    setToast(`Iniciando escaneo técnico con ${activeModelName}...`, 'info');

    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: currentSettings.activeAsset,
          candles: currentCandles,
          riskProfile: currentSettings.riskProfile,
          settings: currentSettings,
        }),
      });

      if (res.ok) {
        const result = (await res.json()) as AIAnalysis;
        setAiAnalysis(result);
        
        if (result.verdict !== 'NEUTRAL') {
          setToast(`Señal ${result.verdict} detectada en ${currentSettings.activeAsset} con ${result.confidence}% de confianza`, 'success');
          
          // Automatic binary entry trigger in fully automatic mode
          if (currentSettings.mode === 'automatic') {
            const assetTrades = tradesRef.current.filter(t => t.symbol === currentSettings.activeAsset);
            const lastTradeTime = assetTrades.length > 0 ? Math.max(...assetTrades.map(t => typeof t.entryTime === 'number' ? t.entryTime : new Date(t.entryTime).getTime())) : 0;
            const diffSeconds = (Date.now() - lastTradeTime) / 1000;
            
            if (diffSeconds < 45) {
              console.log(`⏳ [Cooldown] Omitiendo entrada automática en ${currentSettings.activeAsset} (${diffSeconds.toFixed(1)}s transcurrido).`);
            } else {
              executeOperation(result.verdict as TradeType, currentSettings.tradeExpiry || 60, result.reasoning || '');
            }
          }
        } else {
          setToast("Mercado inestable o lateralizado. Recomendación: ESPERAR", 'info');
        }
      } else {
        setToast("La consulta al motor analítico falló temporalmente.", "error");
      }
    } catch (err) {
      console.error(err);
      setToast("Error al procesar la señal en el servidor local.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run periodic automated background scanners in fully automatic mode
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (settings.mode === 'automatic') {
      // Trigger deep evaluation check every 15 seconds automatically
      interval = setInterval(() => {
        if (candlesRef.current.length > 0) {
          triggerAIAnalysis();
        }
      }, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings.mode, settings.activeAsset]);

  // Run periodic asset auto-rotation safely based on user requirements
  useEffect(() => {
    let rotationInterval: NodeJS.Timeout | null = null;

    if (settings.autoRotationEnabled && settings.assets.length > 0) {
      console.log(`⏱️ [Auto-Rotación] Planificador iniciado. Cada ${settings.autoRotationInterval}s.`);
      rotationInterval = setInterval(() => {
        // Strict guard check: DO NOT change asset if any active/pending trades exist!
        const hasPendingTrades = tradesRef.current.some(t => t.status === 'PENDING');
        if (hasPendingTrades) {
          console.warn("⏳ [Auto-Rotación] Operación PENDIENTE activa. Postponiendo cambio de activo para protección.");
          setToast("Rotación de activo demorada: Operación en progreso", "info");
          return;
        }

        const currentSettings = settingsRef.current;
        const currentIndex = currentSettings.assets.indexOf(currentSettings.activeAsset);
        const nextIndex = (currentIndex + 1) % currentSettings.assets.length;
        const nextAsset = currentSettings.assets[nextIndex];
        
        setToast(`Rotación automática: Escaneando ${nextAsset}`, "info");
        handleUpdateSettings({
          ...currentSettings,
          activeAsset: nextAsset,
        });
      }, settings.autoRotationInterval * 1000);
    }

    return () => {
      if (rotationInterval) {
        clearInterval(rotationInterval);
      }
    };
  }, [settings.autoRotationEnabled, settings.autoRotationInterval, settings.assets]);

  // Execute and record operations
  const executeOperation = async (type: TradeType, expirySeconds: number, reasoning: string) => {
    if (!user) return;
    const amount = settings.tradeAmount;
    
    // Check local risk bounds
    if (balance < amount) {
      setToast("Fondos insuficientes para completar la inversión de estrategia.", "error");
      return;
    }

    // Limit active operations to maximum 3 pending trades per asset (experienced trader preservation)
    const activeTradesForThisAsset = trades.filter(t => t.symbol === settings.activeAsset && t.status === 'PENDING');
    if (activeTradesForThisAsset.length >= 3) {
      setToast(`Límite de riesgo: Ya existen 3 operaciones activas simultáneas en ${settings.activeAsset}`, 'error');
      return;
    }

    const finalExpiry = settings.tradeExpiry || expirySeconds || 60;
    const tradeId = Math.random().toString(36).substring(4);
    
    const newTrade: Trade = {
      id: tradeId,
      userId: user.uid,
      symbol: settings.activeAsset,
      type,
      amount,
      entryPrice: activePrice,
      entryTime: Date.now(),
      expiry: finalExpiry,
      status: 'PENDING',
      payout: 85, // typical OTC payout multiplier
      mode: settings.mode,
      aiReasoning: reasoning || '',
    };

    try {
      // Deduct balance and record trade atomically to firestore collections
      const userDocRef = doc(db, 'users', user.uid);
      const tradeDocRef = doc(db, 'users', user.uid, 'trades', tradeId);
      
      await setDoc(tradeDocRef, newTrade);
      await updateDoc(userDocRef, {
        balance: balance - amount,
        updatedAt: serverTimestamp(),
      });

      setLastTradeTimes(prev => ({
        ...prev,
        [settings.activeAsset]: Date.now()
      }));

      setToast(`Orden ${type} enviada con éxito ($${amount}) con expiración de ${finalExpiry}s`, 'success');

      // Trigger physical extension browser automatic execution click!
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "EXECUTE_TRADE",
          data: {
            id: tradeId,
            symbol: settings.activeAsset,
            direction: type,
            amount,
            expiry: finalExpiry,
          }
        }));
      }

      // Launch simulated fast resolution only if extension bot is not linked
      if (!botConnected) {
        setTimeout(() => {
          resolveSimulatedTrade(tradeId);
        }, 12000);
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/trades/${tradeId}`);
    }
  };

  // Handle outcome resolutions for simulation demo flows
  const resolveSimulatedTrade = async (id: string) => {
    if (!user) return;
    const tradeIndex = trades.findIndex((t) => t.id === id);
    if (tradeIndex === -1 || trades[tradeIndex].status !== 'PENDING') return;

    const trade = trades[tradeIndex];
    // Generate realistic outcomes favoring optimized signals (e.g. 78% win limit on simulator)
    const isWin = Math.random() < 0.78;
    const profitRate = trade.payout / 100;
    const profit = isWin ? trade.amount * profitRate : 0;
    
    const exitPrice = isWin 
      ? (trade.type === 'CALL' ? trade.entryPrice + 0.0003 : trade.entryPrice - 0.0003)
      : (trade.type === 'CALL' ? trade.entryPrice - 0.0002 : trade.entryPrice + 0.0002);

    try {
      const tradeDocRef = doc(db, 'users', user.uid, 'trades', id);
      const userDocRef = doc(db, 'users', user.uid);

      const updatePayload: any = {
        status: isWin ? 'WIN' : 'LOSS',
        exitPrice,
        exitTime: Date.now(),
      };
      if (isWin) {
        updatePayload.profit = parseFloat(profit.toFixed(2));
      }

      await updateDoc(tradeDocRef, updatePayload);

      if (isWin) {
        const addedBalance = trade.amount + parseFloat(profit.toFixed(2));
        await updateDoc(userDocRef, {
          balance: balance + addedBalance,
          updatedAt: serverTimestamp(),
        });
        setToast(`¡Operación Ganadora! +$${profit.toFixed(2)} [${trade.symbol}]`, 'success');
      } else {
        if (settings.martingaleEnabled) {
          setToast(`Orden perdida. Siguiente recomendación: Martingale 1 grado.`, 'info');
        } else {
          setToast(`Operación perdedora en ${trade.symbol}`, 'error');
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/trades/${id}`);
    }
  };

  // Handle live Quotex transaction resolution returned from real UserScript loop
  const resolveRealtimeTrade = async (result: any) => {
    if (!user) return;
    const existingIndex = trades.findIndex((t) => t.id === result.id);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);

      if (existingIndex !== -1) {
        const matchedTrade = trades[existingIndex];
        if (matchedTrade.status !== 'PENDING') return; // already resolved
        
        const exitPrice = result.status === 'WIN' 
          ? (matchedTrade.type === 'CALL' ? matchedTrade.entryPrice + 0.0003 : matchedTrade.entryPrice - 0.0003)
          : (matchedTrade.type === 'CALL' ? matchedTrade.entryPrice - 0.0002 : matchedTrade.entryPrice + 0.0002);

        const tradeDocRef = doc(db, 'users', user.uid, 'trades', result.id);
        const updatePayload: any = {
          status: result.status,
          exitPrice,
          exitTime: Date.now(),
        };
        if (result.status === 'WIN' && result.profit !== undefined) {
          updatePayload.profit = result.profit;
        }
        await updateDoc(tradeDocRef, updatePayload);

        if (result.status === 'WIN') {
          const addedBalance = matchedTrade.amount + result.profit;
          await updateDoc(userDocRef, {
            balance: balance + addedBalance,
            updatedAt: serverTimestamp(),
          });
          setToast(`¡OPERACIÓN GANADA EN QUOTEX! +$${result.profit}`, 'success');
        } else {
          setToast(`Operación terminada en pérdida en Quotex`, 'error');
        }

      } else {
        // Fallback trade placement directly in Firestore
        const exitPrice = result.status === 'WIN' 
          ? (activePrice + 0.0003) 
          : (activePrice - 0.0002);

        const newRealTrade: Trade = {
          id: result.id,
          userId: user.uid,
          symbol: result.symbol || settings.activeAsset || 'EUR/USD (OTC)',
          type: result.type || 'CALL',
          amount: result.amount || settings.tradeAmount || 1,
          entryPrice: activePrice || 1.0,
          exitPrice,
          exitTime: Date.now(),
          status: result.status || 'LOSS',
          entryTime: result.time || Date.now(),
          payout: result.payout || 85,
          mode: settings.mode,
          expiry: result.expiry || 60,
        };

        if (result.status === 'WIN' && result.profit !== undefined) {
          newRealTrade.profit = result.profit;
        }

        const tradeDocRef = doc(db, 'users', user.uid, 'trades', result.id);
        await setDoc(tradeDocRef, newRealTrade);

        if (result.status === 'WIN') {
          await updateDoc(userDocRef, {
            balance: balance + result.profit,
            updatedAt: serverTimestamp(),
          });
          setToast(`¡OPERACIÓN REAL GANADA EN QUOTEX! +$${result.profit}`, 'success');
        } else {
          setToast(`Operación terminada en pérdida en Quotex`, 'error');
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/trades/${result.id}`);
    }
  };

  const setToast = (text: string, type: 'success' | 'info' | 'error') => {
    setToastMessage({ text, type });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setToast('Sesión cerrada de forma segura', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Toast close helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Authentication loading spinners
  if (authLoading) {
    return (
      <div id="loading-state-wrapper" className="min-h-screen bg-black flex items-center justify-center font-mono">
        <div className="text-center">
          <Loader2 className="h-6 w-6 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Verificando Acceso Seguro...</p>
        </div>
      </div>
    );
  }

  // Handle Authentication login gates
  if (!user) {
    return <LoginScreen onLoginSuccess={() => setToast('Sesión iniciada con éxito', 'success')} />;
  }

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 selection:bg-indigo-600 selection:text-white">
      
      {/* Floating Status Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-2xl ${
            toastMessage.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' :
            toastMessage.type === 'error' ? 'bg-rose-950 border-rose-500 text-rose-300' :
            'bg-zinc-900 border-indigo-500/50 text-indigo-300'
          }`}
          style={{ minWidth: '320px' }}>
            <span className="h-2 w-2 rounded-full bg-current animate-ping"></span>
            <p className="text-xs font-medium flex-1">{toastMessage.text}</p>
            <button id="close-toast-btn" onClick={() => setToastMessage(null)} className="hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Shared Platform Header */}
      <Header
        settings={settings}
        setSettings={handleUpdateSettings}
        balance={balance}
        botConnected={botConnected}
        activeBots={activeBotsCount}
        userEmail={user.email || undefined}
        onSignOut={handleSignOut}
      />

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-6 font-sans">
        
        {/* Assets tabs selector list */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-zinc-900 pb-4">
          <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono mr-3">Activos Disponibles:</span>
          {settings.assets.map((asset) => {
            const isActive = settings.activeAsset === asset;
            return (
              <button
                id={`asset-${asset.replace(/\s+/g, '-').replace(/[()]/g, '')}-btn`}
                key={asset}
                onClick={() => handleUpdateSettings({ ...settings, activeAsset: asset })}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                  isActive 
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold shadow-md"
                    : "border-zinc-800 hover:border-zinc-700 text-zinc-400 bg-zinc-900/10"
                }`}
              >
                {asset}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Charts and settings layout */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Real-time Technical candle visualization chart window */}
            <TechnicalChart
              candles={candles}
              symbol={settings.activeAsset}
              activePrice={activePrice}
            />

            {/* Smart intelligence AI Scanner module */}
            <AISniper
              symbol={settings.activeAsset}
              analysis={aiAnalysis}
              onRunAnalysis={triggerAIAnalysis}
              isAnalyzing={isAnalyzing}
              mode={settings.mode}
              onExecuteTrade={executeOperation}
            />

          </div>

          {/* RIGHT: Operational settings, automation logs, and historical transactions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Strategy setup and Tampermonkey script code copying */}
            <SettingsPanel
              settings={settings}
              setSettings={handleUpdateSettings}
              quotexSyncData={quotexSyncData}
              userId={user.uid}
            />

            {/* Real-time trades history records */}
            <HistoryLogs
              trades={trades}
            />

          </div>

        </div>

      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-zinc-500 text-xs">
        <p className="font-mono">Argentum AI • Quotex Intelligence Automation Terminal v3.5</p>
        <p className="text-[10px] text-zinc-650 mt-1">Opere con prudencia. La gestión técnica disminuye el riesgo de mercado.</p>
      </footer>

    </div>
  );
}
