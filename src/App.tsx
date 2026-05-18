import { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar
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

interface HistoricalAnalysis {
  id: string;
  ticker: string;
  date: string;
  summary: string;
  analysis: string;
  context?: string;
}

interface StockAlert {
  id: string;
  ticker: string;
  type: 'price' | 'variation' | 'news';
  value?: number;
  condition?: 'above' | 'below';
  keywords?: string;
  sources?: string;
  active: boolean;
  createdAt: string;
}

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'alerts'>('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [userContext, setUserContext] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<HistoricalAnalysis[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isAddingAlert, setIsAddingAlert] = useState(false);
  const [isFetchingAlertNews, setIsFetchingAlertNews] = useState<string | null>(null);
  const [alertNews, setAlertNews] = useState<{ [id: string]: string }>({});
  const [alertForm, setAlertForm] = useState<Omit<StockAlert, 'id' | 'createdAt' | 'active'>>({
    ticker: '',
    type: 'price',
    value: 0,
    condition: 'above',
    keywords: '',
    sources: ''
  });

  // Comparison State
  const [comparisonTickers, setComparisonTickers] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [isFetchingComparison, setIsFetchingComparison] = useState(false);
  const [tickerCompareInput, setTickerCompareInput] = useState('');

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

    const savedHistory = localStorage.getItem('investvision_analysis_history');
    if (savedHistory) {
      setAnalysisHistory(JSON.parse(savedHistory));
    }

    const savedAlerts = localStorage.getItem('investvision_alerts_config');
    if (savedAlerts) {
      setAlerts(JSON.parse(savedAlerts));
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

  const runAnalysis = async (position?: { quantity: number; avgPrice: number }, tickerOverride?: string) => {
    const ticker = tickerOverride || selectedTicker;
    if (!ticker) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/analyze-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: ticker,
          context: userContext,
          position: position 
        })
      });
      const data = await res.json();
      setAnalysis(data.analysis);

      // Save to history
      const newAnalysis: HistoricalAnalysis = {
        id: crypto.randomUUID(),
        ticker: ticker,
        date: new Date().toLocaleString('pt-BR'),
        summary: data.analysis.substring(0, 150) + "...",
        analysis: data.analysis,
        context: userContext
      };
      const updatedHistory = [newAnalysis, ...analysisHistory].slice(0, 10); // Keep last 10
      setAnalysisHistory(updatedHistory);
      localStorage.setItem('investvision_analysis_history', JSON.stringify(updatedHistory));

    } catch (err) {
      setAnalysis("Erro ao realizar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadPreviousAnalysis = (h: HistoricalAnalysis) => {
    setSelectedTicker(h.ticker);
    setUserContext(h.context || '');
    setAnalysis(h.analysis);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveAlerts = (newAlerts: StockAlert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem('investvision_alerts_config', JSON.stringify(newAlerts));
  };

  const handleAddAlert = (newAlert: Omit<StockAlert, 'id' | 'createdAt' | 'active'>) => {
    const alert: StockAlert = {
      ...newAlert,
      id: crypto.randomUUID(),
      active: true,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };
    saveAlerts([alert, ...alerts]);
    setIsAddingAlert(false);
    setAlertForm({
      ticker: '',
      type: 'price',
      value: 0,
      condition: 'above',
      keywords: '',
      sources: ''
    });
  };

  const fetchNewsForAlert = async (alert: StockAlert) => {
    setIsFetchingAlertNews(alert.id);
    try {
      const res = await fetch('/api/fetch-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: alert.ticker,
          keywords: alert.keywords,
          sources: alert.sources
        })
      });
      const data = await res.json();
      setAlertNews(prev => ({ ...prev, [alert.id]: data.news }));
    } catch (err) {
      console.error("Error fetching alert news", err);
    } finally {
      setIsFetchingAlertNews(null);
    }
  };

  const fetchComparisonData = async (tickers: string[]) => {
    if (tickers.length === 0) {
      setComparisonData([]);
      return;
    }
    setIsFetchingComparison(true);
    try {
      const res = await fetch('/api/compare-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });
      const data = await res.json();
      setComparisonData(data);
    } catch (err) {
      console.error("Failed to fetch comparison data", err);
    } finally {
      setIsFetchingComparison(false);
    }
  };

  const addTickerToComparison = (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    if (t && !comparisonTickers.includes(t)) {
      const newTickers = [...comparisonTickers, t];
      setComparisonTickers(newTickers);
      fetchComparisonData(newTickers);
      setTickerCompareInput('');
    }
  };

  const removeTickerFromComparison = (ticker: string) => {
    const newTickers = comparisonTickers.filter(t => t !== ticker);
    setComparisonTickers(newTickers);
    fetchComparisonData(newTickers);
  };

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

  const typeDistribution = useMemo(() => {
    return assets.reduce((acc: any, asset) => {
      const type = asset.type;
      const totalValue = asset.quantity * asset.avgPrice;
      if (!acc[type]) acc[type] = 0;
      acc[type] += totalValue;
      return acc;
    }, {});
  }, [assets]);

  const totalPortfolioValue = useMemo(() => {
    return assets.reduce((acc, asset) => acc + (asset.quantity * asset.avgPrice), 0);
  }, [assets]);
  
  const distributionData = useMemo(() => {
    return Object.keys(typeDistribution).map(type => ({
      name: type,
      value: typeDistribution[type],
      percentage: totalPortfolioValue > 0 ? Number(((typeDistribution[type] / totalPortfolioValue) * 100).toFixed(1)) : 0
    }));
  }, [typeDistribution, totalPortfolioValue]);

  const pieData = useMemo(() => {
    return assets.map(a => ({ 
      name: a.ticker, 
      value: a.quantity * a.avgPrice 
    }));
  }, [assets]);

  const TYPE_COLORS: { [key: string]: string } = {
    'Ação (B3)': '#10b981',
    'FII (Fundo Imob.)': '#3b82f6',
    'ETF (Índices)': '#6366f1',
    'Criptoativos': '#ec4899',
    'Ação': '#10b981',
    'FII': '#3b82f6',
    'ETF': '#6366f1',
    'Cripto': '#ec4899'
  };

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
            <button 
              onClick={() => setActiveTab('alerts')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'alerts' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              Alertas
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-sm transition-all hover:bg-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Score de Confiança IA</p>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                      <BrainCircuit size={16} className="text-blue-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                        <circle 
                          cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                          strokeDasharray={175.9} 
                          strokeDashoffset={175.9 * (1 - 0.82)} 
                          className="text-blue-400" 
                          strokeLinecap="round" 
                        />
                      </svg>
                      <span className="absolute text-sm font-black text-white">82%</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-tight">Otimista</h4>
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-[0.2em]">Mercado High</p>
                    </div>
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
                          isAnimationActive={true}
                          animationDuration={1000}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="ibov" 
                          stroke="#3b82f6" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          dot={false}
                          name="Benchmark IBOV"
                          isAnimationActive={true}
                          animationDuration={1000}
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
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={95}
                              paddingAngle={8}
                              dataKey="value"
                              isAnimationActive={true}
                              animationDuration={800}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`pie-cell-${entry.name}`} fill={COLORS[index % COLORS.length]} className="stroke-none" />
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

              {/* Distribution Chart */}
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-sm min-h-[400px]">
                <h4 className="text-lg font-medium text-white mb-8">Distribuição por Classe de Ativo</h4>
                <div className="h-[300px]">
                  {assets.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
                          width={120}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            color: '#fff'
                          }}
                          formatter={(value: number, name: string, props: any) => [`${props.payload.percentage}%`, 'Distribuição']}
                        />
                        <Bar 
                          dataKey="percentage" 
                          radius={[0, 8, 8, 0]} 
                          barSize={24}
                          isAnimationActive={true}
                          animationDuration={800}
                        >
                          {distributionData.map((entry) => (
                            <Cell key={`bar-cell-${entry.name}`} fill={TYPE_COLORS[entry.name] || COLORS[Object.keys(TYPE_COLORS).indexOf(entry.name) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <AlertCircle size={40} className="mb-3 opacity-20" />
                      <p className="text-sm font-medium">Adicione ativos para ver a distribuição</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Comparison Section */}
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-sm min-h-[400px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <div>
                    <h4 className="text-lg font-medium text-white">Comparação de Ativos</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Rentabilidade Acumulada (%)</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                      <input 
                        type="text" 
                        placeholder="Adicionar ticker..."
                        value={tickerCompareInput}
                        onChange={(e) => setTickerCompareInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && addTickerToComparison(tickerCompareInput)}
                        className="w-full pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs font-mono font-bold uppercase"
                      />
                      <button 
                        onClick={() => addTickerToComparison(tickerCompareInput)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {comparisonTickers.map((t, idx) => (
                    <div key={t} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 group animate-in fade-in zoom-in duration-300">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-xs font-mono font-bold text-white uppercase">{t}</span>
                      <button 
                        onClick={() => removeTickerFromComparison(t)}
                        className="text-slate-500 hover:text-rose-400 opacity-100 transition-all ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {comparisonTickers.length === 0 && (
                    <div className="flex items-center gap-2 text-slate-500 bg-white/5 px-4 py-2 rounded-xl border border-dashed border-white/10">
                      <Search size={14} />
                      <p className="text-[10px] uppercase font-black tracking-widest">Adicione tickers acima para comparar performance</p>
                    </div>
                  )}
                </div>

                <div className="h-[300px] relative">
                  {isFetchingComparison && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] rounded-2xl">
                      <Loader2 size={24} className="text-emerald-500 animate-spin" />
                    </div>
                  )}
                  {comparisonTickers.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonData}>
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
                          domain={['auto', 'auto']}
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
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconType="circle"
                          content={({ payload }) => (
                            <div className="flex gap-4 justify-end mb-4">
                              {payload?.map((entry: any, index: number) => (
                                <div key={`item-${index}`} className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        />
                        {comparisonTickers.map((ticker, index) => (
                          <Line 
                            key={ticker}
                            type="monotone" 
                            dataKey={ticker} 
                            stroke={COLORS[index % COLORS.length]} 
                            strokeWidth={3} 
                            dot={{r: 4, strokeWidth: 2, fill: COLORS[index % COLORS.length], stroke: '#0f172a'}} 
                            activeDot={{r: 6, strokeWidth: 0}}
                            name={ticker}
                            isAnimationActive={true}
                            animationDuration={1000}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-20">
                      <BarChart3 size={48} className="mb-4" />
                      <p className="text-sm font-medium">Selecione ativos para visualizar a comparação</p>
                    </div>
                  )}
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
                          <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedTicker(asset.ticker);
                                setActiveTab('analysis');
                                runAnalysis({ quantity: asset.quantity, avgPrice: asset.avgPrice }, asset.ticker);
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-400 hover:bg-emerald-400/10 transition-all group-hover:opacity-100"
                              title="Análise IA Personalizada"
                            >
                              <BrainCircuit size={16} />
                            </button>
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
          ) : activeTab === 'analysis' ? (
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
                      onClick={() => runAnalysis()}
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

              {/* History Section */}
              {analysisHistory.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-1 h-1 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Histórico de Análises</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisHistory.map((h) => (
                      <motion.div 
                        key={h.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => loadPreviousAnalysis(h)}
                        className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-mono font-bold text-emerald-400 text-lg uppercase tracking-wider">{h.ticker}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{h.date}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed italic">
                            "{h.summary}"
                          </p>
                        </div>
                        <div className="flex items-center justify-end text-emerald-400 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          Retomar Análise <ChevronRight size={12} className="ml-1" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="alerts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Meus Alertas</h2>
                  <p className="text-slate-400 mt-1">Gerencie suas notificações e alertas de mercado</p>
                </div>
                <button 
                  onClick={() => setIsAddingAlert(true)}
                  className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Plus size={18} />
                  Novo Alerta
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner",
                        alert.active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-600"
                      )}>
                        {alert.ticker.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-xl font-bold text-white tracking-wider">{alert.ticker}</h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                            alert.type === 'price' ? "bg-blue-500/20 text-blue-400" : 
                            alert.type === 'variation' ? "bg-indigo-500/20 text-indigo-400" : 
                            "bg-amber-500/20 text-amber-400"
                          )}>
                            {alert.type === 'price' ? 'Preço Alvo' : alert.type === 'variation' ? 'Variação' : 'Notícias'}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1">
                          {alert.type === 'price' ? `Notificar quando ${alert.condition === 'above' ? 'subir acima de' : 'cair abaixo de'} R$ ${alert.value}` :
                           alert.type === 'variation' ? `Notificar se variar mais de ${alert.value}%` :
                           `Monitorando: ${alert.keywords || 'Geral'} ${alert.sources ? `(Fontes: ${alert.sources})` : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {alert.type === 'news' && (
                        <button 
                          onClick={() => fetchNewsForAlert(alert)}
                          disabled={isFetchingAlertNews === alert.id}
                          className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-2"
                        >
                          {isFetchingAlertNews === alert.id ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                          Check News
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const newAlerts = alerts.map(a => a.id === alert.id ? { ...a, active: !a.active } : a);
                          saveAlerts(newAlerts);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                          alert.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-slate-500 border border-white/5"
                        )}
                      >
                        {alert.active ? 'Ativo' : 'Pausado'}
                      </button>
                      <button 
                        onClick={() => {
                          const newAlerts = alerts.filter(a => a.id !== alert.id);
                          saveAlerts(newAlerts);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <AnimatePresence>
                  {Object.keys(alertNews).map(id => (
                    alertNews[id] && (
                      <motion.div 
                        key={`news-${id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 mt-2 relative">
                          <button 
                            onClick={() => setAlertNews(prev => ({ ...prev, [id]: '' }))}
                            className="absolute top-6 right-6 text-slate-500 hover:text-white"
                          >
                            <X size={20} />
                          </button>
                          <h5 className="text-sm font-black text-amber-400 uppercase tracking-[0.2em] mb-4">Últimas Notícias Mentonadas</h5>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <Markdown>{alertNews[id]}</Markdown>
                          </div>
                        </div>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>

                {alerts.length === 0 && (
                  <div className="bg-white/5 backdrop-blur-md p-16 rounded-[2.5rem] border border-white/10 text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-slate-600 opacity-20" />
                    <h4 className="text-xl font-bold text-white mb-2">Nenhum alerta configurado</h4>
                    <p className="text-slate-500 max-w-xs mx-auto">Configure alertas para ser notificado sobre preços ou notícias importantes dos seus ativos.</p>
                  </div>
                )}
              </div>
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

        {isAddingAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingAlert(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-emerald-500/5"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-2xl font-bold text-white tracking-tight">Novo Alerta</h3>
                <button onClick={() => setIsAddingAlert(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddAlert(alertForm);
                }} 
                className="p-8 space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Ativo para Alerta</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: PETR4"
                    value={alertForm.ticker}
                    onChange={(e) => setAlertForm({...alertForm, ticker: e.target.value.toUpperCase()})}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-slate-600 transition-all font-mono font-bold tracking-widest text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Tipo de Alerta</label>
                  <div className="relative">
                    <select 
                      value={alertForm.type}
                      onChange={(e) => setAlertForm({...alertForm, type: e.target.value as any})}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold appearance-none cursor-pointer"
                    >
                      <option value="price" className="bg-slate-900">Preço Alvo</option>
                      <option value="variation" className="bg-slate-900">Variação (%)</option>
                      <option value="news" className="bg-slate-900">Notícias Relevantes</option>
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" />
                  </div>
                </div>

                {alertForm.type !== 'news' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Condição</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setAlertForm({...alertForm, condition: 'above'})}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-bold transition-all border",
                            alertForm.condition === 'above' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/5 text-slate-500"
                          )}
                        >
                          Acima de
                        </button>
                        <button 
                          type="button"
                          onClick={() => setAlertForm({...alertForm, condition: 'below'})}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-bold transition-all border",
                            alertForm.condition === 'below' ? "bg-rose-500/10 border-rose-500/50 text-rose-400" : "bg-white/5 border-white/5 text-slate-500"
                          )}
                        >
                          Abaixo de
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">
                        {alertForm.type === 'price' ? 'Valor do Preço (R$)' : 'Percentual de Variação (%)'}
                      </label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={alertForm.value || ''}
                        onChange={(e) => setAlertForm({...alertForm, value: Number(e.target.value)})}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold text-lg"
                      />
                    </div>
                  </>
                )}

                {alertForm.type === 'news' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Palavras-chave (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: fusão, dividendos, CEO"
                        value={alertForm.keywords}
                        onChange={(e) => setAlertForm({...alertForm, keywords: e.target.value})}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-slate-600 transition-all font-medium text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Fontes Específicas (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Bloomberg, Valor Econômico"
                        value={alertForm.sources}
                        onChange={(e) => setAlertForm({...alertForm, sources: e.target.value})}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-slate-600 transition-all font-medium text-sm"
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black text-lg mt-4 shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  Configurar Alerta
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
