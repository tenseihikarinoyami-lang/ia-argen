import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  BrainCircuit,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  TrendingUp,
  Activity,
  Cpu,
  ShieldCheck,
  Flame,
  LineChart,
  Zap,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulation states for the futuristic trading panel (left side)
  const [livePrice, setLivePrice] = useState(1.08456);
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'AGENT_CORE: Inicializando redes neuronales recursivas...',
    'DECISION_ENGINE: Cargando patrones de acción del precio OTC...',
    'TELEMETRY: Sincronizando canalización con Quotex WebSocket port 3000...'
  ]);
  const [simulatedTrades, setSimulatedTrades] = useState([
    { asset: 'EUR/USD (OTC)', type: 'CALL', payout: '+85%', status: 'WIN' },
    { asset: 'GBP/USD (OTC)', type: 'PUT', payout: '+82%', status: 'WIN' },
    { asset: 'Gold (OTC)', type: 'CALL', payout: '+87%', status: 'WIN' },
  ]);

  const googleProvider = new GoogleAuthProvider();

  // Price tick simulation on the left visual console
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => {
        const delta = (Math.random() - 0.495) * 0.00015;
        return parseFloat((prev + delta).toFixed(5));
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // System telemetry simulation logs
  useEffect(() => {
    const logs = [
      'CONCURRENT_RUNS: Sintonizando umbral de RSI (14) -> 70.4 (Sobrecompra)',
      'NEURAL_DEEP_SEARCH: Detectada compresión en Bandas de Bollinger',
      'DECISION_ENGINE: Señal óptima detectada en EUR/JPY (OTC) -> Confianza: 94.2%',
      'AUTOMATION_LINK: Canal activo de persistencia en base de datos Firestore',
      'MARTINGALE_GUARD: Multiplicador listo para la siguiente operación...',
      'AGENT_CORE: Explorando 20 criptoactivos y divisas principales de forma paralela',
    ];

    const interval = setInterval(() => {
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setSystemLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ${randomLog}`,
        ...prev.slice(0, 4)
      ]);
      
      // Randomly inject simulated trade outcome to show life in the machine
      if (Math.random() > 0.7) {
        const assets = ['EUR/USD (OTC)', 'GBP/USD (OTC)', 'USD/CAD (OTC)', 'AUD/USD (OTC)', 'Gold (OTC)'];
        const types = ['CALL', 'PUT'];
        const payouts = ['+85%', '+88%', '+82%', '+90%'];
        const newTrade = {
          asset: assets[Math.floor(Math.random() * assets.length)],
          type: types[Math.floor(Math.random() * types.length)],
          payout: payouts[Math.floor(Math.random() * payouts.length)],
          status: 'WIN'
        };
        setSimulatedTrades((prev) => [newTrade, ...prev.slice(0, 2)]);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado.');
      } else {
        setError(err.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      let translatedError = err.message;
      if (err.code === 'auth/invalid-credential') {
        translatedError = 'Credenciales incorrectas o usuario no registrado.';
      } else if (err.code === 'auth/email-already-in-use') {
        translatedError = 'El correo electrónico ya se encuentra registrado.';
      } else if (err.code === 'auth/invalid-email') {
        translatedError = 'El formato del correo electrónico no es válido.';
      } else if (err.code === 'auth/weak-password') {
        translatedError = 'La contraseña recomendada es demasiado débil.';
      }
      setError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-screen-root" className="min-h-screen bg-neutral-950 flex flex-col md:grid md:grid-cols-12 overflow-x-hidden selection:bg-indigo-600 selection:text-white font-sans text-stone-300">
      
      {/* LEFT: Cybernetic Trading Dashboard Panel (Visual focus on desktop screens) */}
      <div className="hidden md:flex md:col-span-6 lg:col-span-7 bg-[#050505] border-r border-zinc-900/60 p-10 flex-col justify-between relative overflow-hidden select-none">
        
        {/* Futuristic glowing cyber lines & light filters */}
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(18,18,18,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.2)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        {/* Scan lines overlays */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent animate-pulse pointer-events-none"></div>

        {/* Console Top Header */}
        <div id="left-panel-header" className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-bold block leading-none">SISTEMA AUTÓNOMO</span>
              <span className="text-sm font-semibold text-white tracking-tight">ARGENTUM AI • CO-PILOT</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/50 border border-zinc-800/60 rounded-full px-3 py-1 font-mono text-[9px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>GRID_NODE_LIVE // US-EAST</span>
          </div>
        </div>

        {/* Beautiful Real-Time Interactive Trading Workspace */}
        <div className="relative z-10 my-auto py-8">
          
          {/* Main Title of the platform */}
          <div className="max-w-lg mb-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-[10px] font-mono font-semibold mb-4 uppercase">
              <Zap className="h-3.5 w-3.5 text-indigo-400 animate-bounce" />
              Precesión Técnica en Canles Aislados
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight font-sans">
              Estrategia Cuántica para <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-white bg-clip-text text-transparent">Quotex Inteligente</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
              Analítica cuántica impulsada por Gemini. Procese señales autónomas, rote activos según el perfil de riesgo y ejecute transacciones en segundos con aislamiento seguro por usuario.
            </p>
          </div>

          {/* Interactive Trading Widgets */}
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            
            {/* Widget 1: Real-Time Tick telemetry */}
            <div className="bg-[#0b0b0d] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">CONSOLA REALTIME</span>
                <span className="text-[9px] font-mono bg-emerald-950/60 border border-emerald-900 px-1.5 py-0.5 rounded text-emerald-400 font-bold">ACTIVO</span>
              </div>
              <div className="mb-2">
                <span className="text-[11px] font-mono text-zinc-400 block font-bold">EUR/USD (OTC) Ticker</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono text-xl font-bold text-emerald-400 tracking-tight glow-emerald">
                    {livePrice.toFixed(5)}
                  </span>
                  <span className="text-[9px] text-emerald-500 font-bold font-mono">▲ +0.12%</span>
                </div>
              </div>
              
              {/* Decorative mini waveform line charts */}
              <div className="h-10 mt-3 pt-2 flex items-end gap-[3px] border-t border-zinc-900">
                <div className="h-[20%] w-full bg-emerald-500/20 rounded-sm"></div>
                <div className="h-[40%] w-full bg-emerald-500/30 rounded-sm"></div>
                <div className="h-[30%] w-full bg-emerald-500/20 rounded-sm"></div>
                <div className="h-[60%] w-full bg-emerald-500/40 rounded-sm"></div>
                <div className="h-[50%] w-full bg-emerald-500/30 rounded-sm"></div>
                <div className="h-[80%] w-full bg-emerald-500/60 rounded-sm animate-pulse"></div>
                <div className="h-[70%] w-full bg-emerald-500/40 rounded-sm"></div>
                <div className="h-[90%] w-full bg-emerald-500/80 rounded-sm animate-pulse"></div>
              </div>
            </div>

            {/* Widget 2: Signals Analytics outcomes */}
            <div className="bg-[#0b0b0d] border border-zinc-800/80 rounded-xl p-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">ÚLTIMOS ACUERDOS</span>
                  <Activity className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                
                {/* Simulated list of historical wins to show system efficiency */}
                <div className="space-y-2 mt-2">
                  {simulatedTrades.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-mono bg-zinc-900/40 p-1.5 rounded border border-zinc-800/30">
                      <span className="font-bold text-zinc-300">{t.asset}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1 rounded font-bold ${
                          t.type === 'CALL' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>{t.type}</span>
                        <span className="text-emerald-400 font-bold">{t.payout}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-zinc-900/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>EFICACIA DE CANAL DE IA</span>
                <span className="text-emerald-400 font-bold">87.5% WR</span>
              </div>
            </div>

          </div>

          {/* Simulated scrolling developer log window */}
          <div className="mt-4 bg-[#08080a] border border-zinc-800/50 rounded-xl p-4 max-w-xl shadow-inner font-mono">
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
              <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase">TELEMETRÍA NEURONAL EN VIVO</span>
            </div>
            
            <div className="space-y-1.5 text-[10px] text-zinc-400 leading-normal">
              {systemLogs.map((log, index) => (
                <div key={index} className="truncate select-text selection:bg-indigo-600/30">
                  <span className="text-indigo-400/80 font-semibold">&gt;_</span> {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer info blocks */}
        <div id="left-panel-footer" className="relative z-10 flex justify-between items-center text-[10px] font-mono text-zinc-500 border-t border-zinc-900/60 pt-6">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Criptografía TLS 1.3</span>
            <span>•</span>
            <span>Multiusuario Aislado</span>
          </div>
          <span>v3.5 Build stable</span>
        </div>

      </div>

      {/* RIGHT: High-tech Portal Secure Credentials login screen */}
      <div className="col-span-12 md:col-span-6 lg:col-span-5 flex items-center justify-center p-6 sm:p-12 relative">
        
        {/* Subtle radial lights on right panel */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-indigo-500/5 blur-[90px] rounded-full pointer-events-none"></div>

        {/* Small terminal indicators for top/left and top/right */}
        <div className="absolute top-6 left-6 font-mono text-[9px] text-zinc-600 selection:bg-transparent">
          SYS_MAPPING // USER_PORTAL
        </div>
        <div className="absolute top-6 right-6 font-mono text-[9px] text-emerald-500/80 bg-emerald-950/30 border border-emerald-900/50 px-2 py-0.5 rounded-md font-bold">
          CONECTADO SECURE_DB
        </div>

        {/* Standard core credential container */}
        <div className="w-full max-w-[400px] relative z-10">
          
          {/* Logo element for mobile screens (shown when left is hidden) */}
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl mb-4 text-indigo-400 shadow-inner">
              <BrainCircuit className="h-9 w-9 animate-pulse text-indigo-400" />
            </div>
            <h1 className="font-sans font-bold text-2xl tracking-tight text-white mb-1">
              Quotex AI Analyst
            </h1>
            <p className="text-xs text-zinc-400 max-w-[280px] mx-auto leading-relaxed">
              Plataforma técnica de señales cuánticas con aislamiento modular por usuario.
            </p>
          </div>

          <div className="bg-[#0b0b0d] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative">
            
            {/* Header section inside the card (for desktop screen clarity) */}
            <div className="hidden md:block mb-6">
              <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                <span>Acceso al Co-Pilot</span>
                <span className="text-[9px] font-mono bg-indigo-950 border border-indigo-800/80 px-2 py-0.5 rounded text-indigo-300 font-bold uppercase tracking-wider">
                  {isSignUp ? 'Registro' : 'Login'}
                </span>
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                {isSignUp 
                  ? 'Crea credenciales únicas para iniciar tu canalización cifrada.' 
                  : 'Ingresa tus credenciales para conectar tus configuraciones aisladas.'
                }
              </p>
            </div>

            {/* Error notifications */}
            {error && (
              <div className="bg-rose-950/25 border border-rose-900/50 rounded-xl p-3.5 mb-5 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                <p className="text-xs text-rose-200 font-medium break-words flex-1 leading-normal">
                  {error}
                </p>
              </div>
            )}

            {/* Credentials Forms */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {/* Field 1: E-Mail Address */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Correo de Acceso
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-0.5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email-input"
                    type="email"
                    placeholder="usuario@canaltrading.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/15 text-zinc-100 rounded-xl py-3 pl-11 pr-4 text-xs font-mono placeholder-zinc-700 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                    Contraseña Cifrada
                  </label>
                  {!isSignUp && (
                    <span className="text-[10px] font-mono text-zinc-650 hover:text-indigo-400 cursor-help transition-colors select-none">
                      ¿Olvidó la clave?
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-0.5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type="password"
                    placeholder="Contraseña de 6 dígitos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/15 text-zinc-100 rounded-xl py-3 pl-11 pr-4 text-xs font-mono placeholder-zinc-700 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit trigger buttons */}
              <button
                id="login-submit-button"
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans font-bold text-xs rounded-xl py-3.5 justify-center items-center flex gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-indigo-600/15 group"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>
                      {isSignUp ? 'CREAR CANALIZACIÓN CIFRADA' : 'INICIAR ACCESO EXCLUSIVO'}
                    </span>
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

            </form>

            {/* Beautiful visual separator divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-[1px] bg-zinc-800/80 flex-1"></div>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-bold">SEGURIDAD GOOGLE</span>
              <div className="h-[1px] bg-zinc-800/80 flex-1"></div>
            </div>

            {/* Secure Google Identity access integration */}
            <button
              id="login-google-button"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-[#111114] hover:bg-[#15151a] active:bg-[#0c0c0e] border border-zinc-800/80 text-zinc-200 font-sans font-bold text-xs rounded-xl py-3 justify-center items-center flex gap-2.5 transition-all cursor-pointer disabled:opacity-50 shadow-md"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google Identity Web Hub
            </button>

            {/* Alternator SignUp vs SignIn */}
            <div className="text-center mt-6">
              <button
                id="login-toggle-mode-button"
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors bg-transparent border-none outline-none cursor-pointer font-medium font-sans"
              >
                {isSignUp 
                  ? '¿Ya tienes una cuenta? Iniciar Sesión en Canal' 
                  : '¿Nuevo en Argentum? Registrate para crear Canal'
                }
              </button>
            </div>

          </div>

          {/* Footnotes security guarantee labels */}
          <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-[10px] text-zinc-650 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/80"></span>
            <span>Acceso aislado por autenticación de Firebase</span>
          </div>

        </div>

        {/* Small decorative corner coordinate */}
        <div className="absolute bottom-6 right-6 font-mono text-[9px] text-zinc-700 selection:bg-transparent">
          CORTEX_SESSION // FIRESTORE_ISOLATED
        </div>

      </div>

    </div>
  );
};
