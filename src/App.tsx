import { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  BarChart3, 
  Wallet, 
  PieChart as PieIcon, 
  BrainCircuit,
  X,
  ChevronRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Interfaces
interface Asset {
  ticker: string;
  quantity: number;
  avgPrice: number;
  type: string;
}

interface MarketData {
  name: string;
  ibov: number;
  portfolio: number;
}

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis'>('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [userContext, setUserContext] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Asset>({
    ticker: '',
    quantity: 0,
    avgPrice: 0,
    type: 'Ação'
  });

  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  const fetchCurrentPrice = async (ticker: string) => {
    if (!ticker || ticker.length < 4) return;
    setIsFetchingPrice(true);
    try {
      const res = await fetch(`/api/current-price/${ticker}`);
      const data = await res.json();
      if (data.price > 0) {
        setFormData(prev => ({ ...prev, avgPrice: data.price }));
      }
    } catch (err) {
      console.error("Error fetching price", err);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const savedAssets = localStorage.getItem('investvision_assets');
    if (savedAssets) {
      setAssets(JSON.parse(savedAssets));
    }
  }, []);

  const fetchMarketData = async () => {
    try {
      const res = await fetch('/api/market-data');
      const data = await res.json();
      setMarketData(data);
    } catch (err) {
      console.error("Failed to fetch market data", err);
    }
  };

  const saveAssets = (newAssets: Asset[]) => {
    setAssets(newAssets);
    localStorage.setItem('investvision_assets', JSON.stringify(newAssets));
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const newAssets = [...assets, { ...formData, ticker: formData.ticker.toUpperCase() }];
    saveAssets(newAssets);
    setFormData({ ticker: '', quantity: 0, avgPrice: 0, type: 'Ação' });
    setIsRegistering(false);
  };

  const runAnalysis = async () => {
    if (!selectedTicker) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/analyze-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: selectedTicker,
          context: userContext 
        })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysis("Erro ao realizar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-indigo-500 rounded-full blur-[180px] opacity-5 pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
              <TrendingUp size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">InvestVision</h1>
          </div>
          <nav className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'dashboard' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'analysis' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              IA Análise
            </button>
          </nav>
          <button 
            onClick={() => setIsRegistering(true)}
            className="flex items-center gap-2 bg-emerald-500 text-slate-950 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <Plus size={16} />
            Novo Ativo
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-sm transition-all hover:bg-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Patrimônio Total</p>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <Wallet size={16} className="text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-light text-white">R$ {assets.reduce((acc, curr) => acc + (curr.quantity * curr.avgPrice), 0).toLocaleString()}</h3>
                  <div className="mt-4 flex items-center gap-1 text-emerald-400 text-sm font-medium">
                    <TrendingUp size={14} />
                    <span>+4.2% este mês</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-sm transition-all hover:bg-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Performance vs IBOV</p>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <BarChart3 size={16} className="text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-light text-emerald-400">+12.4%</h3>
                  <p className="mt-4 text-slate-400 text-sm">Alpha gerado no período</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-sm transition-all hover:bg-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ativos Registrados</p>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <PieIcon size={16} className="text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-light text-white">{assets.length}</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {assets.slice(0, 3).map((a, i) => (
                      <span key={i} className="text-[10px] bg-white/5 px-2 py-1 rounded-md border border-white/10 font-mono text-slate-300">{a.ticker}</span>
                    ))}
                    {assets.length > 3 && <span className="text-[10px] text-slate-500 font-medium">+{assets.length - 3}</span>}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Evolution Chart */}
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-sm min-h-[400px]">
                  <div className="flex justify-between items-center mb-8">
                    <h4 className="text-lg font-medium text-white">Evolução da Carteira vs IBOVESPA</h4>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Carteira</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">IBOVESPA</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marketData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 600}}
                          dy={10}
                        />
                        <YAxis 
                          hide 
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                            borderRadius: '16px', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(10px)',
                            color: '#fff'
                          }}
                          itemStyle={{fontSize: '12px'}}
                          labelStyle={{fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: 'rgba(255,255,255,0.6)'}}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="portfolio" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={{r: 4, strokeWidth: 2, fill: '#10b981', stroke: '#0f172a'}} 
                          activeDot={{r: 6, strokeWidth: 0}}
                          name="Sua Rentabilidade"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="ibov" 
                          stroke="#3b82f6" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          dot={false}
                          name="Benchmark IBOV"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Allocation Chart */}
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-sm min-h-[400px]">
                  <h4 className="text-lg font-medium text-white mb-8">Composição de Carteira</h4>
                  <div className="h-[300px] flex items-center justify-center relative">
                    {assets.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={assets.map(a => ({ name: a.ticker, value: a.quantity * a.avgPrice }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={95}
                              paddingAngle={8}
                              dataKey="value"
                            >
                              {assets.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={[`#10b981`, `#3b82f6`, `#6366f1`, `#8b5cf6`, `#ec4899`][index % 5]} className="stroke-none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center pointer-events-none">
                          <span className="text-2xl font-bold">{assets.length}</span>
                          <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Ativos</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-slate-500">
                        <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Nenhum dado para exibir</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assets Table */}
              <div className="bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h4 className="text-lg font-medium text-white">Posição Detalhada</h4>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      Mercado Aberto
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        <th className="px-8 py-5">Ticker</th>
                        <th className="px-8 py-5">Classe</th>
                        <th className="px-8 py-5">Quantidade</th>
                        <th className="px-8 py-5">Custo Médio</th>
                        <th className="px-8 py-5">Patrimônio</th>
                        <th className="px-8 py-5 text-right">Controle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {assets.map((asset, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-all group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                {asset.ticker.charAt(0)}
                              </div>
                              <span className="font-mono font-bold text-white tracking-wider">{asset.ticker}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-400 font-medium">{asset.type}</span>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-300">{asset.quantity}</td>
                          <td className="px-8 py-5 text-sm font-mono text-slate-400 whitespace-nowrap">R$ {asset.avgPrice.toFixed(2)}</td>
                          <td className="px-8 py-5 text-sm font-bold text-white whitespace-nowrap">R$ {(asset.quantity * asset.avgPrice).toLocaleString()}</td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={() => {
                                const newAssets = assets.filter((_, i) => i !== idx);
                                saveAssets(newAssets);
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {assets.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-8 py-16 text-center text-slate-500 italic font-medium">
                            Sua carteira está vazia. Comece adicionando seu primeiro ativo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/10 shadow-sm text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20 rotate-3">
                    <BrainCircuit size={40} className="text-white" />
                  </div>
                  <h2 className="text-4xl font-black mb-4 tracking-tight leading-tight">Análise Preditiva <br/><span className="text-emerald-400">Powered by AI</span></h2>
                  <p className="text-slate-400 mb-10 max-w-lg mx-auto text-lg leading-relaxed">Receba insights profundos sobre tendências de mercado, riscos e fundamentos baseados em modelos avançados de IA.</p>
                  
                  <div className="flex flex-col gap-4 items-center justify-center max-w-xl mx-auto">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Ex: PETR4, ITUB4..."
                        value={selectedTicker}
                        onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-slate-600 transition-all text-lg font-mono font-bold uppercase tracking-wider"
                      />
                    </div>
                    
                    <div className="w-full space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Contexto Adicional (Objetivos, Notícias, Observações)</label>
                      <textarea 
                        rows={3}
                        placeholder="Ex: Tenho foco em dividendos e gostaria de saber se a notícia sobre a nova política de preços afeta a Petrobras no longo prazo."
                        value={userContext}
                        onChange={(e) => setUserContext(e.target.value)}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-slate-600 transition-all font-medium text-sm resize-none"
                      />
                    </div>

                    <button 
                      onClick={runAnalysis}
                      disabled={isAnalyzing || !selectedTicker}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-bold transition-all shadow-xl",
                        isAnalyzing || !selectedTicker ? "bg-white/5 text-slate-600 cursor-not-allowed" : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:-translate-y-1 shadow-emerald-500/20"
                      )}
                    >
                      {isAnalyzing ? <Loader2 className="animate-spin" size={24} /> : <BrainCircuit size={24} />}
                      Analisar com IA Personalizada
                    </button>
                  </div>
                </div>
              </div>

              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/10 shadow-sm relative"
                >
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner">
                        <TrendingUp size={28} />
                      </div>
                      <div>
                        <h4 className="text-3xl font-black text-white leading-none tracking-tighter">{selectedTicker}</h4>
                        <span className="text-[10px] text-emerald-400/80 uppercase tracking-[0.2em] font-black mt-2 inline-block">Score de Confiança: 82%</span>
                      </div>
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Relatório Completo
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none prose-emerald prose-headings:tracking-tighter prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-white prose-li:text-slate-400">
                    <Markdown>{analysis}</Markdown>
                  </div>
                  <div className="mt-12 p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10 flex gap-4 items-start">
                    <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />
                    <p className="text-xs text-rose-300/60 leading-relaxed font-medium">
                      <span className="text-rose-400 font-bold block mb-1">Aviso Regulatório (Complacência)</span>
                      As informações acima são fornecidas apenas para fins informativos. Investir no mercado financeiro acarreta riscos. Recomendamos fortemente a consulta a um assessor de investimentos certificado antes de tomar qualquer decisão.
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Registration Modal */}
      <AnimatePresence>
        {isRegistering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegistering(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-emerald-500/5"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-2xl font-bold text-white tracking-tight">Novo Investimento</h3>
                <button onClick={() => setIsRegistering(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddAsset} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Símbolo do Ativo</label>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: VALE3"
                      value={formData.ticker}
                      onChange={(e) => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                      onBlur={(e) => fetchCurrentPrice(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-slate-600 transition-all font-mono font-bold tracking-widest text-lg"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isFetchingPrice ? (
                        <Loader2 className="animate-spin text-emerald-400" size={20} />
                      ) : (
                        <Search 
                          className="text-slate-500 cursor-pointer hover:text-emerald-400 transition-colors" 
                          size={20} 
                          onClick={() => fetchCurrentPrice(formData.ticker)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Quantidade</label>
                    <input 
                      required
                      type="number" 
                      placeholder="0"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Preço Médio</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                      <input 
                        required
                        step="0.01"
                        type="number" 
                        placeholder="0,00"
                        value={formData.avgPrice || ''}
                        onChange={(e) => setFormData({...formData, avgPrice: Number(e.target.value)})}
                        className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold text-lg"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Tipo de Classe</label>
                  <div className="relative">
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold appearance-none cursor-pointer"
                    >
                      <option className="bg-slate-900">Ação (B3)</option>
                      <option className="bg-slate-900">FII (Fundo Imob.)</option>
                      <option className="bg-slate-900">ETF (Índices)</option>
                      <option className="bg-slate-900">Criptoativos</option>
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black text-lg mt-4 shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  Cadastrar Ativo
                  <ChevronRight size={20} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
