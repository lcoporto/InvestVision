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
  Loader2,
  Trash2,
  Pencil,
  Check,
  Newspaper,
  RefreshCw,
  Filter,
  Globe
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
  currentPrice?: number;
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
  news?: string;
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
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'alerts'>('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [userContext, setUserContext] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLevel, setAnalysisLevel] = useState<'básico' | 'intermediário' | 'avançado'>('intermediário');
  const [analysisHistory, setAnalysisHistory] = useState<HistoricalAnalysis[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isAddingAlert, setIsAddingAlert] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<StockAlert | null>(null);
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

  // Sector Comparison State
  const [sectorPeers, setSectorPeers] = useState<any[]>([]);
  const [isFetchingPeers, setIsFetchingPeers] = useState(false);

  // Asset Variation Chart State
  const [variationData, setVariationData] = useState<{ ticker: string; variation: number }[]>([]);
  const [variationPeriod, setVariationPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isVariationMock, setIsVariationMock] = useState(false);

  // News Analysis State
  const [activeAnalysisNews, setActiveAnalysisNews] = useState<string | null>(null);
  const [isFetchingAnalysisNews, setIsFetchingAnalysisNews] = useState(false);
  const [newsKeywords, setNewsKeywords] = useState('');
  const [newsExcludeKeywords, setNewsExcludeKeywords] = useState('');
  const [newsSources, setNewsSources] = useState('');
  const [showNewsFilters, setShowNewsFilters] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Asset>({
    ticker: '',
    quantity: 0,
    avgPrice: 0,
    type: 'Ação (B3)'
  });

  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [editingAssetIdx, setEditingAssetIdx] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');

  // Positive Cryptos State
  const [positiveCryptos, setPositiveCryptos] = useState<{ticker: string, name: string, price: number, variation: number, variation30m?: number, variation24hAbs?: number, high24h?: number, low24h?: number, evolution?: number[]}[]>([]);
  const [isFetchingCryptos, setIsFetchingCryptos] = useState(false);
  const [showCryptosModal, setShowCryptosModal] = useState(false);

  const fetchPositiveCryptos = async () => {
    setIsFetchingCryptos(true);
    setShowCryptosModal(true);
    try {
      const res = await fetch('/api/positive-cryptos');
      const data = await res.json();
      setPositiveCryptos(data);
    } catch (err) {
      console.error("Error fetching positive cryptos", err);
    } finally {
      setIsFetchingCryptos(false);
    }
  };

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

  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [lastPricesUpdate, setLastPricesUpdate] = useState<string | null>(null);

  // Internet Financial Market Search State
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [isSearchingMarketAsset, setIsSearchingMarketAsset] = useState(false);
  const [marketSearchResult, setMarketSearchResult] = useState<{
    ticker: string;
    name: string;
    price: number;
    type: string;
    variation24h: number;
    currency: string;
    description: string;
    source: string;
    updatedAt?: string;
  } | null>(null);

  // Auto fetch real market price when typing ticker in "Novo Ativo" modal
  useEffect(() => {
    if (!isRegistering || !formData.ticker || formData.ticker.trim().length < 3) return;
    const timer = setTimeout(() => {
      searchAssetInMarket(formData.ticker);
    }, 450);
    return () => clearTimeout(timer);
  }, [formData.ticker, isRegistering]);

  const searchAssetInMarket = async (queryStr: string) => {
    if (!queryStr || queryStr.trim().length < 2) return;
    setIsSearchingMarketAsset(true);
    setMarketSearchResult(null);
    try {
      const res = await fetch(`/api/search-asset-market?query=${encodeURIComponent(queryStr.trim())}`);
      const data = await res.json();
      if (data && data.price) {
        setMarketSearchResult(data);
        setFormData(prev => ({
          ...prev,
          ticker: data.ticker ? data.ticker.toUpperCase() : prev.ticker,
          avgPrice: data.price || prev.avgPrice,
          type: data.type || prev.type
        }));
      }
    } catch (err) {
      console.error("Error searching asset in market", err);
    } finally {
      setIsSearchingMarketAsset(false);
    }
  };

  const refreshAllPrices = async () => {
    if (assets.length === 0) return;
    setIsRefreshingPrices(true);
    try {
      let batchPricesMap: Record<string, number> = {};
      try {
        const batchRes = await fetch('/api/batch-refresh-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assets })
        });
        const batchData = await batchRes.json();
        if (batchData.prices) {
          batchPricesMap = batchData.prices;
        }
      } catch (e) {
        console.warn("Batch refresh endpoint error, falling back to individual queries", e);
      }

      const updatedAssets = await Promise.all(
        assets.map(async (asset) => {
          try {
            if (batchPricesMap[asset.ticker] && batchPricesMap[asset.ticker] > 0) {
              return { ...asset, currentPrice: batchPricesMap[asset.ticker] };
            }
            const res = await fetch(`/api/current-price/${asset.ticker}`);
            const data = await res.json();
            if (data.price > 0) {
              return { ...asset, currentPrice: data.price };
            }
          } catch (err) {
            console.error(`Failed to refresh price for ${asset.ticker}`, err);
          }
          return asset;
        })
      );
      saveAssets(updatedAssets);
      setLastPricesUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error("Failed to refresh prices", err);
    } finally {
      setIsRefreshingPrices(false);
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
  }, [timeframe]);

  const fetchVariationData = async () => {
    try {
      const tickers = assets.map(a => a.ticker).join(',');
      const res = await fetch(`/api/assets-variation?tickers=${tickers}&period=${variationPeriod}`);
      const result = await res.json();
      setVariationData(result.data);
      setIsVariationMock(result.isMockData);
    } catch (err) {
      console.error("Error fetching variation data", err);
    }
  };

  useEffect(() => {
    fetchVariationData();
  }, [assets, variationPeriod]);

  const fetchMarketData = async () => {
    try {
      const res = await fetch(`/api/market-data?timeframe=${timeframe}`);
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

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const tickerUpper = formData.ticker.toUpperCase();
    setIsFetchingPrice(true);
    let fetchedCurrentPrice = formData.avgPrice;
    try {
      const res = await fetch(`/api/current-price/${tickerUpper}`);
      const data = await res.json();
      if (data.price > 0) {
        fetchedCurrentPrice = data.price;
      }
    } catch (err) {
      console.error("Error fetching price on add", err);
    } finally {
      setIsFetchingPrice(false);
    }
    const existingAssetIndex = assets.findIndex(a => a.ticker === tickerUpper);
    let newAssets;
    if (existingAssetIndex > -1) {
      const existingAsset = assets[existingAssetIndex];
      const totalQuantity = existingAsset.quantity + formData.quantity;
      const totalCost = (existingAsset.quantity * existingAsset.avgPrice) + (formData.quantity * formData.avgPrice);
      const newAvgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      
      newAssets = [...assets];
      newAssets[existingAssetIndex] = {
        ...existingAsset,
        quantity: totalQuantity,
        avgPrice: newAvgPrice,
        currentPrice: fetchedCurrentPrice || existingAsset.currentPrice || newAvgPrice
      };
    } else {
      newAssets = [...assets, { ...formData, ticker: tickerUpper, currentPrice: fetchedCurrentPrice }];
    }
    saveAssets(newAssets);
    setFormData({ ticker: '', quantity: 0, avgPrice: 0, type: 'Ação (B3)' });
    setIsRegistering(false);
  };

  const updateAssetQuantity = (idx: number) => {
    const qty = parseFloat(editQuantity);
    if (!isNaN(qty) && qty >= 0) {
      const newAssets = [...assets];
      newAssets[idx].quantity = qty;
      saveAssets(newAssets);
      setEditingAssetIdx(null);
    }
  };

  const fetchAnalysisNews = async (ticker: string, keywordsOverride?: string, excludeKeywordsOverride?: string, sourcesOverride?: string) => {
    setIsFetchingAnalysisNews(true);
    try {
      const res = await fetch('/api/fetch-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          keywords: keywordsOverride !== undefined ? keywordsOverride : newsKeywords,
          excludeKeywords: excludeKeywordsOverride !== undefined ? excludeKeywordsOverride : newsExcludeKeywords,
          sources: sourcesOverride !== undefined ? sourcesOverride : newsSources
        })
      });
      const data = await res.json();
      setActiveAnalysisNews(data.news);
      return data.news;
    } catch (err) {
      console.error("Error fetching analysis news", err);
      setActiveAnalysisNews("Erro ao carregar notícias para este ativo.");
      return null;
    } finally {
      setIsFetchingAnalysisNews(false);
    }
  };

  const runAnalysis = async (position?: { quantity: number; avgPrice: number }, tickerOverride?: string) => {
    const ticker = tickerOverride || selectedTicker;
    if (!ticker) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setSectorPeers([]);
    setActiveAnalysisNews(null);
    try {
      // Trigger sector peer comparison in parallel
      fetchSectorComparison(ticker);

      // Run both API requests in parallel for super fast loading
      const [analysisRes, newsText] = await Promise.all([
        fetch('/api/analyze-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ticker: ticker,
            context: userContext,
            position: position,
            detailLevel: analysisLevel
          })
        }).then(res => res.json()),
        fetchAnalysisNews(ticker)
      ]);

      setAnalysis(analysisRes.analysis);

      // Save to history with news
      const newAnalysis: HistoricalAnalysis = {
        id: crypto.randomUUID(),
        ticker: ticker,
        date: new Date().toLocaleString('pt-BR'),
        summary: analysisRes.analysis.substring(0, 150) + "...",
        analysis: analysisRes.analysis,
        context: userContext,
        news: newsText || undefined
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
    setActiveAnalysisNews(h.news || null);
    if (!h.news) {
      fetchAnalysisNews(h.ticker);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAnalysisFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = analysisHistory.filter(h => h.id !== id);
    setAnalysisHistory(updatedHistory);
    localStorage.setItem('investvision_analysis_history', JSON.stringify(updatedHistory));
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

  const fetchSectorComparison = async (ticker: string) => {
    setIsFetchingPeers(true);
    setSectorPeers([]);
    try {
      const res = await fetch(`/api/sector-comparison/${ticker}`);
      const data = await res.json();
      setSectorPeers(data);
    } catch (err) {
      console.error("Failed to fetch sector peers", err);
    } finally {
      setIsFetchingPeers(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

  const typeDistribution = useMemo(() => {
    return assets.reduce((acc: any, asset) => {
      const type = asset.type;
      const totalValue = asset.quantity * (asset.currentPrice || asset.avgPrice);
      if (!acc[type]) acc[type] = 0;
      acc[type] += totalValue;
      return acc;
    }, {});
  }, [assets]);

  const totalPortfolioCost = useMemo(() => {
    return assets.reduce((acc, asset) => acc + (asset.quantity * asset.avgPrice), 0);
  }, [assets]);

  const totalPortfolioValue = useMemo(() => {
    return assets.reduce((acc, asset) => acc + (asset.quantity * (asset.currentPrice || asset.avgPrice)), 0);
  }, [assets]);

  const totalPortfolioProfitLossPercentage = useMemo(() => {
    if (totalPortfolioCost === 0) return 0;
    return ((totalPortfolioValue - totalPortfolioCost) / totalPortfolioCost) * 100;
  }, [totalPortfolioValue, totalPortfolioCost]);
  
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
      value: a.quantity * (a.currentPrice || a.avgPrice)
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

  const triggeredAlertsCount = useMemo(() => {
    return alerts.filter(alert => {
      if (!alert.active) return false;
      const matchingAsset = assets.find(a => a.ticker.toUpperCase() === alert.ticker.toUpperCase());
      if (!matchingAsset) return false;
      const currentPrice = matchingAsset.currentPrice || matchingAsset.avgPrice;
      if (!currentPrice) return false;
      
      if (alert.type === 'price') {
        const isAbove = alert.condition === 'above';
        const threshold = alert.value || 0;
        return isAbove ? currentPrice >= threshold : currentPrice <= threshold;
      }
      
      if (alert.type === 'variation') {
        const matchingVar = variationData.find(v => v.ticker.toUpperCase() === alert.ticker.toUpperCase());
        if (matchingVar) {
          return Math.abs(matchingVar.variation) >= (alert.value || 0);
        }
      }
      return false;
    }).length;
  }, [alerts, assets, variationData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-indigo-500 rounded-full blur-[180px] opacity-5 pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-white/10 shadow-2xl">
                <div className="relative flex flex-col items-center justify-center">
                  <div className="flex items-baseline gap-[1px]">
                    <div className="w-1.5 h-3 bg-emerald-500/40 rounded-t-sm"></div>
                    <div className="w-1.5 h-5 bg-emerald-500/60 rounded-t-sm"></div>
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-t-sm animate-pulse"></div>
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full blur-[2px] animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white flex items-center gap-1 leading-none uppercase">
                Porto <span className="text-emerald-400">Invest</span> Vision
              </h1>
              <p className="text-[8px] text-slate-500 font-bold tracking-[0.2em] uppercase">Intelligence Unbound</p>
            </div>
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
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 relative",
                activeTab === 'alerts' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              Alertas
              {triggeredAlertsCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white animate-pulse">
                  {triggeredAlertsCount}
                </span>
              )}
            </button>
          </nav>
          <div className="flex gap-3">
            <button 
              onClick={() => fetchPositiveCryptos()}
              className="flex items-center gap-2 bg-pink-500/20 text-pink-400 border border-pink-500/50 px-5 py-2 rounded-full text-sm font-bold hover:bg-pink-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <TrendingUp size={16} />
              Criptos em Alta
            </button>
            <button 
              onClick={() => setIsRegistering(true)}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Plus size={16} />
              Novo Ativo
            </button>
          </div>
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
              {/* Internet Market Asset Search Widget */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 backdrop-blur-md p-6 rounded-[2rem] border border-emerald-500/20 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Pesquisa em Tempo Real na Internet 🌐</span>
                      </div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Buscar Cotação de Ativos no Mercado Financeiro</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-mono">
                      B3 • Binance • Yahoo Finance • Google Search
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Digite qualquer ativo ou empresa (ex: PETR4, VALE3, HGLG11, Bitcoin, Apple, NVDA)..."
                        value={marketSearchQuery}
                        onChange={(e) => setMarketSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchAssetInMarket(marketSearchQuery)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-white/15 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium transition-all"
                      />
                      {marketSearchQuery && (
                        <button 
                          onClick={() => { setMarketSearchQuery(''); setMarketSearchResult(null); }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => searchAssetInMarket(marketSearchQuery)}
                      disabled={isSearchingMarketAsset || !marketSearchQuery.trim()}
                      className="px-6 py-3.5 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0 text-sm"
                    >
                      {isSearchingMarketAsset ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Pesquisando na Internet...</span>
                        </>
                      ) : (
                        <>
                          <Search size={18} />
                          <span>Pesquisar Mercado 🌐</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Market Search Result Box */}
                  {marketSearchResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-5 bg-slate-950/90 border border-emerald-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-lg text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                            {marketSearchResult.ticker}
                          </span>
                          <span className="text-white font-bold text-base">{marketSearchResult.name}</span>
                          <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                            {marketSearchResult.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{marketSearchResult.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                          <span>Fonte: {marketSearchResult.source}</span>
                          <span>•</span>
                          <span>Atualizado online em {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                        <div className="text-right">
                          <div className="text-xs text-slate-400 uppercase font-black tracking-wider">Cotação Real</div>
                          <div className="text-2xl font-black font-mono text-white">
                            {marketSearchResult.currency === 'USD' ? 'USD ' : 'R$ '}
                            {marketSearchResult.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </div>
                          {marketSearchResult.variation24h !== undefined && (
                            <span className={cn(
                              "text-xs font-bold font-mono inline-flex items-center gap-0.5",
                              marketSearchResult.variation24h >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {marketSearchResult.variation24h >= 0 ? '+' : ''}{marketSearchResult.variation24h}% (24h)
                            </span>
                          )}
                        </div>

                        <button 
                          onClick={() => {
                            setFormData({
                              ticker: marketSearchResult.ticker,
                              quantity: 1,
                              avgPrice: marketSearchResult.price,
                              type: marketSearchResult.type || 'Ação (B3)'
                            });
                            setIsRegistering(true);
                          }}
                          className="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/40 rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Plus size={16} />
                          <span>Adicionar Ativo</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-sm transition-all hover:bg-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Patrimônio Total</p>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <Wallet size={16} className="text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-light text-white">R$ {totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium">
                    {totalPortfolioProfitLossPercentage >= 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <TrendingUp size={14} />
                        <span>+{totalPortfolioProfitLossPercentage.toFixed(2)}% retorno geral</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400">
                        <TrendingDown size={14} />
                        <span>{totalPortfolioProfitLossPercentage.toFixed(2)}% retorno geral</span>
                      </span>
                    )}
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h4 className="text-lg font-medium text-white">Evolução da Carteira vs IBOVESPA</h4>
                      <div className="flex gap-4 mt-1">
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
                    
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                      {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTimeframe(t)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            timeframe === t ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          {t === 'daily' ? 'Diário' : t === 'weekly' ? 'Semanal' : 'Mensal'}
                        </button>
                      ))}
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

              {/* Grid 2: Distribution & Variation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                {/* Performance/Variation Chart */}
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-sm min-h-[400px] flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                      <div>
                        <h4 className="text-lg font-medium text-white">Variação Percentual dos Ativos</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                          {isVariationMock ? "Desempenho de Amostra do Mercado (%)" : "Desempenho Individual (%)"}
                        </p>
                      </div>
                      
                      <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 shrink-0 self-end sm:self-auto">
                        {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setVariationPeriod(p)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                              variationPeriod === p ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            {p === 'daily' ? 'Diário' : p === 'weekly' ? 'Semanal' : 'Mensal'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-[270px]">
                      {variationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={variationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="variationPos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                              </linearGradient>
                              <linearGradient id="variationNeg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                              dataKey="ticker" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 600 }}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 600 }}
                              tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const isPositive = data.variation >= 0;
                                  const matchingAsset = assets.find(a => a.ticker.toUpperCase() === data.ticker.toUpperCase());
                                  
                                  return (
                                    <div className="bg-slate-900/95 border border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-md min-w-[220px]">
                                      <div className="flex items-center justify-between gap-4 mb-2">
                                        <span className="font-mono font-bold text-white tracking-wider text-base">
                                          {data.ticker}
                                        </span>
                                        <span className={cn(
                                          "text-xs px-2.5 py-1 rounded-lg font-bold font-mono",
                                          isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                                        )}>
                                          {isPositive ? '+' : ''}{data.variation.toFixed(2)}%
                                        </span>
                                      </div>
                                      
                                      <div className="h-[1px] bg-white/5 my-2" />
                                      
                                      <div className="space-y-1.5 text-xs text-slate-300">
                                        <div className="flex justify-between items-center">
                                          <span className="text-slate-500 font-medium">Período:</span>
                                          <span className="text-white font-semibold uppercase tracking-wider text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                            {variationPeriod === 'daily' ? 'Diário' : variationPeriod === 'weekly' ? 'Semanal' : 'Mensal'}
                                          </span>
                                        </div>
                                        
                                        {matchingAsset ? (
                                          <>
                                            <div className="flex justify-between items-center">
                                              <span className="text-slate-500 font-medium">Classe:</span>
                                              <span className="text-white font-medium bg-white/5 px-2 py-0.5 rounded text-[10px]">{matchingAsset.type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-500 font-medium">Qtd. Alocada:</span>
                                              <span className="text-white font-medium font-mono">{matchingAsset.quantity}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-500 font-medium">Preço Médio:</span>
                                              <span className="text-slate-300 font-mono">R$ {matchingAsset.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between pt-1 border-t border-white/5 font-semibold text-emerald-400">
                                              <span className="text-slate-500 font-medium">Patrimônio:</span>
                                              <span className="font-mono text-white">
                                                R$ {((matchingAsset.currentPrice || matchingAsset.avgPrice) * matchingAsset.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="mt-2 p-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-500/90 leading-normal">
                                            ⚠️ Ativo de simulação. Clique em "Novo Ativo" para adicionar posições reais!
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="variation" 
                              isAnimationActive={true}
                              animationDuration={800}
                              radius={[6, 6, 0, 0]}
                            >
                              {variationData.map((entry, idx) => {
                                const isPositive = entry.variation >= 0;
                                return (
                                  <Cell 
                                    key={`cell-${idx}`} 
                                    fill={isPositive ? 'url(#variationPos)' : 'url(#variationNeg)'}
                                    stroke={isPositive ? '#10b981' : '#f43f5e'}
                                    strokeWidth={1.5}
                                  />
                                );
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                          <AlertCircle size={40} className="mb-3 opacity-20" />
                          <p className="text-sm font-medium">Adicione ativos para ver a variação</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {isVariationMock && (
                    <div className="mt-4 px-4 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
                      <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-widest leading-relaxed">
                        Exibindo ativos modelo (adicione ativos em sua carteira para ver a sua variação real)
                      </p>
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
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5">
                  <div>
                    <h4 className="text-lg font-medium text-white">Posição Detalhada</h4>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Filtro de Busca */}
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Buscar ativo por ticker ou tipo..."
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono"
                      />
                      {assetSearchQuery && (
                        <button
                          onClick={() => setAssetSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={refreshAllPrices}
                        disabled={isRefreshingPrices || assets.length === 0}
                        title="Busca o preço atual de cada ativo no mercado financeiro na Internet em tempo real"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl text-[10px] text-emerald-300 font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10"
                      >
                        <RefreshCw size={12} className={cn(isRefreshingPrices && "animate-spin text-emerald-400")} />
                        {isRefreshingPrices ? "Pesquisando na Internet..." : "Atualizar na Internet 🌐"}
                      </button>

                      {lastPricesUpdate ? (
                        <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-[10px] font-mono flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Atu. {lastPricesUpdate}</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider text-center">
                          Mercado Aberto
                        </div>
                      )}
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
                        <th className="px-8 py-5">Preço Atual</th>
                        <th className="px-8 py-5">Rentabilidade</th>
                        <th className="px-8 py-5">Patrimônio</th>
                        <th className="px-8 py-5 text-right">Controle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {assets
                         .filter(asset => {
                           if (!assetSearchQuery) return true;
                           const query = assetSearchQuery.toLowerCase();
                           return asset.ticker.toLowerCase().includes(query) || 
                                  asset.type.toLowerCase().includes(query);
                         })
                         .map((asset, idx) => {
                         const currentPrice = asset.currentPrice || asset.avgPrice;
                         const profitLoss = ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100;
                         const equity = asset.quantity * currentPrice;

                         return (
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
                            <td className="px-8 py-5">
                              {editingAssetIdx === idx ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                    className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') updateAssetQuantity(idx);
                                      if (e.key === 'Escape') setEditingAssetIdx(null);
                                    }}
                                  />
                                  <button 
                                    onClick={() => updateAssetQuantity(idx)}
                                    className="text-emerald-400 hover:text-emerald-300"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button 
                                    onClick={() => setEditingAssetIdx(null)}
                                    className="text-rose-400 hover:text-rose-300"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-300">{asset.quantity}</span>
                                  <button 
                                    onClick={() => {
                                      setEditingAssetIdx(idx);
                                      setEditQuantity(asset.quantity.toString());
                                    }}
                                    className="text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Alterar Quantidade"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-5 text-sm font-mono text-slate-400 whitespace-nowrap">R$ {asset.avgPrice.toFixed(2)}</td>
                            <td className="px-8 py-5 text-sm font-mono text-emerald-400 font-medium whitespace-nowrap">R$ {currentPrice.toFixed(2)}</td>
                            <td className="px-8 py-5 text-sm whitespace-nowrap">
                              <span className={cn(
                                "text-xs font-bold px-2 py-1 rounded inline-flex items-center gap-1",
                                profitLoss > 0 ? "bg-emerald-500/10 text-emerald-400" : profitLoss < 0 ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400"
                              )}>
                                {profitLoss > 0 ? <TrendingUp size={12} /> : profitLoss < 0 ? <TrendingDown size={12} /> : null}
                                {profitLoss > 0 ? '+' : ''}{profitLoss.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-8 py-5 text-sm font-bold text-white whitespace-nowrap">R$ {equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-40 hover:opacity-100"
                                title="Excluir Ativo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                         );
                       })}
                       {assets.length === 0 && (
                         <tr>
                           <td colSpan={8} className="px-8 py-16 text-center text-slate-500 italic font-medium">
                             Sua carteira está vazia. Comece adicionando seu primeiro ativo.
                           </td>
                         </tr>
                       )}
                       {assets.length > 0 && assets.filter(asset => {
                         const query = assetSearchQuery.toLowerCase();
                         return asset.ticker.toLowerCase().includes(query) || 
                                asset.type.toLowerCase().includes(query);
                       }).length === 0 && (
                         <tr>
                           <td colSpan={8} className="px-8 py-16 text-center text-slate-500 italic font-medium">
                             Nenhum ativo corresponde à busca "{assetSearchQuery}".
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

                    <div className="w-full space-y-2 text-left">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Nível de Detalhe da Análise</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setAnalysisLevel('básico')}
                          className={cn(
                            "p-4 rounded-2xl border text-left transition-all",
                            analysisLevel === 'básico' 
                              ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5" 
                              : "bg-white/5 border-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("text-xs font-bold", analysisLevel === 'básico' ? "text-emerald-400" : "text-white")}>Básico</span>
                            <span className="text-[8px] font-bold text-slate-500 font-mono uppercase">Rápido ⚡</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">Visão geral direta dos pontos críticos e tendência.</p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setAnalysisLevel('intermediário')}
                          className={cn(
                            "p-4 rounded-2xl border text-left transition-all",
                            analysisLevel === 'intermediário' 
                              ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5" 
                              : "bg-white/5 border-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("text-xs font-bold", analysisLevel === 'intermediário' ? "text-emerald-400" : "text-white")}>Intermediário</span>
                            <span className="text-[8px] font-bold text-emerald-400 font-mono uppercase">Equilibrado ⚖️</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">Relação ideal de profundidade, riscos e fundamentos.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAnalysisLevel('avançado')}
                          className={cn(
                            "p-4 rounded-2xl border text-left transition-all",
                            analysisLevel === 'avançado' 
                              ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5" 
                              : "bg-white/5 border-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("text-xs font-bold", analysisLevel === 'avançado' ? "text-emerald-400" : "text-white")}>Avançado</span>
                            <span className="text-[8px] font-bold text-amber-500 font-mono uppercase">Completo 🧠</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">Detalhamento máximo, valuation, macro e guias estratégicos.</p>
                        </button>
                      </div>
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
                  <div className="prose prose-invert max-w-none prose-emerald prose-headings:tracking-tighter prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-white prose-li:text-slate-400 prose-headings:text-emerald-400">
                    <Markdown
                      components={{
                        h3: ({node, ...props}) => {
                          const isRiskHeader = props.children?.toString().toLowerCase().includes('risco');
                          return (
                            <h3 {...props} className={cn(
                              "text-xl font-bold mt-10 mb-4 pb-2 border-b border-white/5 flex items-center gap-2",
                              isRiskHeader ? "text-rose-400 border-rose-500/20" : "text-emerald-400"
                            )}>
                              {isRiskHeader && <AlertCircle size={20} className="text-rose-400" />}
                              {props.children}
                            </h3>
                          );
                        }
                      }}
                    >
                      {analysis}
                    </Markdown>
                  </div>

                  {/* Sector Comparison Table */}
                  <AnimatePresence>
                    {(sectorPeers.length > 0 || isFetchingPeers) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md"
                      >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Comparativo Setorial</h4>
                          {isFetchingPeers && <Loader2 size={16} className="text-emerald-500 animate-spin" />}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                              <tr>
                                <th className="px-6 py-4">Ticker</th>
                                <th className="px-6 py-4">Preço</th>
                                <th className="px-6 py-4">DY (12M)</th>
                                <th className="px-6 py-4">P/L</th>
                                <th className="px-6 py-4">Retorno (12M)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {sectorPeers.map((peer) => (
                                <tr key={peer.ticker} className={cn(
                                  "hover:bg-white/5 transition-colors",
                                  peer.ticker.toUpperCase() === selectedTicker.toUpperCase() ? "bg-emerald-500/5" : ""
                                )}>
                                  <td className="px-6 py-4">
                                    <span className="font-mono font-bold text-white">{peer.ticker}</span>
                                    {peer.ticker.toUpperCase() === selectedTicker.toUpperCase() && (
                                      <span className="ml-2 text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase font-black">Analised</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono text-slate-300">R$ {peer.price.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-xs font-mono text-emerald-400">{peer.dy}%</td>
                                  <td className="px-6 py-4 text-xs font-mono text-blue-400">{peer.pe}x</td>
                                  <td className="px-6 py-4 text-xs font-mono text-indigo-400">{peer.return12m.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-4 bg-emerald-500/5 text-center">
                          <p className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-widest leading-relaxed">
                            💡 {sectorPeers.sort((a,b) => b.return12m - a.return12m)[0]?.ticker} apresenta o melhor retorno histórico recente no ramo.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* News Section */}
                  <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <Newspaper size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white leading-tight">Últimas Notícias & Sentimento</h4>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 inline-block">Sintetizado para {selectedTicker}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setShowNewsFilters(!showNewsFilters)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
                            showNewsFilters || newsKeywords || newsExcludeKeywords || newsSources
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                              : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                          )}
                          title="Filtros de notícias"
                        >
                          <Filter size={12} />
                          Filtros
                        </button>
                        <button
                          onClick={() => fetchAnalysisNews(selectedTicker)}
                          disabled={isFetchingAnalysisNews}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-[10px] text-white font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10"
                        >
                          <RefreshCw size={12} className={cn(isFetchingAnalysisNews && "animate-spin")} />
                          Atualizar
                        </button>
                      </div>
                    </div>

                    {/* Filters collapsable panel */}
                    <AnimatePresence>
                      {showNewsFilters && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-b border-white/10 bg-black/20 p-6 space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">Palavras-chave a Incluir</label>
                              <input
                                type="text"
                                placeholder="dividendos, fusão, balanço..."
                                value={newsKeywords}
                                onChange={(e) => setNewsKeywords(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">Palavras-chave a Excluir</label>
                              <input
                                type="text"
                                placeholder="processo, multa, escândalo..."
                                value={newsExcludeKeywords}
                                onChange={(e) => setNewsExcludeKeywords(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">Filtrar por Fontes</label>
                              <input
                                type="text"
                                placeholder="Ex: Valor Econômico, InfoMoney..."
                                value={newsSources}
                                onChange={(e) => setNewsSources(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            {(newsKeywords || newsExcludeKeywords || newsSources) && (
                              <button
                                onClick={() => {
                                  setNewsKeywords('');
                                  setNewsExcludeKeywords('');
                                  setNewsSources('');
                                  fetchAnalysisNews(selectedTicker, '', '', '');
                                }}
                                className="px-4 py-1.5 bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                              >
                                Limpar
                              </button>
                            )}
                            <button
                              onClick={() => {
                                fetchAnalysisNews(selectedTicker);
                                setShowNewsFilters(false);
                              }}
                              className="px-4 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                              Aplicar Filtros
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Content Section */}
                    <div className="p-8">
                      {isFetchingAnalysisNews ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                          <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
                          <p className="text-sm font-medium">Buscando e sintetizando as notícias mais recentes...</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-mono">Processando sentimentos com IA via Gemini-3-Flash</p>
                        </div>
                      ) : activeAnalysisNews ? (
                        <div className="prose prose-invert max-w-none prose-sm prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-li:text-slate-300">
                          <Markdown
                            components={{
                              li: ({node, ...props}) => {
                                // Add sentiment coloring dynamically to the list items containing positive, negative, or neutral mentions
                                const text = props.children?.toString() || '';
                                const isPositive = /positivo|otimista|alta|compra/i.test(text);
                                const isNegative = /negativo|pessimista|queda|venda/i.test(text);
                                
                                return (
                                  <li {...props} className="mb-4 pl-2 relative border-l-2 border-white/10 hover:border-blue-500/50 transition-all">
                                    <div className="flex items-start gap-2 flex-wrap">
                                      {isPositive && (
                                        <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ALTA</span>
                                      )}
                                      {isNegative && (
                                        <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">BAIXA</span>
                                      )}
                                      <span>{props.children}</span>
                                    </div>
                                  </li>
                                );
                              }
                            }}
                          >
                            {activeAnalysisNews}
                          </Markdown>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
                          <Newspaper size={40} className="mb-3 opacity-20 text-blue-400" />
                          <p className="text-sm font-semibold">Sem notícias carregadas para {selectedTicker}</p>
                          <p className="text-xs text-slate-600 mt-1 max-w-md">Para carregar ou renovar os fatos relevantes e análises de notícias consolidadas do ativo, clique no botão de atualizar.</p>
                          <button
                            onClick={() => fetchAnalysisNews(selectedTicker)}
                            className="mt-4 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all"
                          >
                            Carregar Notícias
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-500/5 border-t border-white/5 p-4 text-center">
                      <p className="text-[10px] text-blue-400/80 font-medium uppercase tracking-widest leading-relaxed">
                        ⚡ Notícias consolidadas e curadas em tempo real com base no sentimento de mercado da B3.
                      </p>
                    </div>
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
                        className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all flex flex-col justify-between group relative"
                      >
                        <button 
                          onClick={(e) => deleteAnalysisFromHistory(h.id, e)}
                          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-0 group-hover:opacity-100 z-10"
                          title="Excluir do Histórico"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-mono font-bold text-emerald-400 text-lg uppercase tracking-wider">{h.ticker}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mr-8">{h.date}</span>
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
                {alerts.map((alert) => {
                  const matchingAsset = assets.find(a => a.ticker.toUpperCase() === alert.ticker.toUpperCase());
                  const currentPrice = matchingAsset ? (matchingAsset.currentPrice || matchingAsset.avgPrice) : null;
                  const matchingVar = variationData.find(v => v.ticker.toUpperCase() === alert.ticker.toUpperCase());
                  const currentVar = matchingVar ? matchingVar.variation : null;

                  let isTriggered = false;

                  if (alert.active) {
                    if (alert.type === 'price' && currentPrice !== null) {
                      const threshold = alert.value || 0;
                      if (alert.condition === 'above') {
                        isTriggered = currentPrice >= threshold;
                      } else {
                        isTriggered = currentPrice <= threshold;
                      }
                    } else if (alert.type === 'variation' && currentVar !== null) {
                      isTriggered = Math.abs(currentVar) >= (alert.value || 0);
                    }
                  }

                  return (
                    <div key={alert.id} className={cn(
                      "bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group",
                      isTriggered ? "border-rose-500/40 bg-rose-500/5 shadow-lg shadow-rose-500/5" : "border-white/10"
                    )}>
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner shrink-0",
                          isTriggered ? "bg-rose-500/10 text-rose-400" :
                          alert.active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-600"
                        )}>
                          {alert.ticker.charAt(0)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xl font-bold text-white tracking-wider font-mono">{alert.ticker}</h4>
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                              alert.type === 'price' ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" : 
                              alert.type === 'variation' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20" : 
                              "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                            )}>
                              {alert.type === 'price' ? 'Preço Alvo' : alert.type === 'variation' ? 'Variação' : 'Notícias'}
                            </span>
                            {isTriggered && (
                              <span className="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-rose-500 text-white animate-bounce flex items-center gap-1">
                                <span>ATINGIDO 🔔</span>
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs mt-1 leading-normal">
                            {alert.type === 'price' ? (
                              <span>
                                Notificar quando {alert.condition === 'above' ? 'subir acima de' : 'cair abaixo de'}{" "}
                                <strong className="text-white font-semibold">R$ {alert.value?.toFixed(2)}</strong>
                              </span>
                            ) : alert.type === 'variation' ? (
                              <span>
                                Notificar se variar mais de <strong className="text-white font-semibold">{alert.value}%</strong>
                              </span>
                            ) : (
                              <span>
                                Monitorando notícias: <strong className="text-white font-semibold">{alert.keywords || 'Geral'}</strong> {alert.sources ? `(Fontes: ${alert.sources})` : ''}
                              </span>
                            )}
                          </p>

                          {/* Live metrics / status info */}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium">
                            {alert.type === 'price' && currentPrice !== null && (
                              <span className={cn(
                                "font-mono",
                                isTriggered ? "text-rose-400" : "text-emerald-400"
                              )}>
                                Preço atual: R$ {currentPrice.toFixed(2)}{" "}
                                <span className="text-slate-500">
                                  (Falta R$ {Math.abs(currentPrice - (alert.value || 0)).toFixed(2)} para o alvo)
                                </span>
                              </span>
                            )}
                            {alert.type === 'variation' && currentVar !== null && (
                              <span className={cn(
                                "font-mono",
                                isTriggered ? "text-rose-400" : "text-emerald-400"
                              )}>
                                Variação atual: {currentVar > 0 ? '+' : ''}{currentVar.toFixed(2)}%
                              </span>
                            )}
                            {!matchingAsset && alert.type !== 'news' && (
                              <span className="text-slate-500 italic block">
                                ⚠️ Ativo não cadastrado no seu portfólio para obter preço real.
                              </span>
                            )}
                          </div>
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
                            Checar Notícias
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
                          onClick={() => setAlertToDelete(alert)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-40 group-hover:opacity-100"
                          title="Excluir Alerta"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegistering(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl shadow-emerald-500/10 flex flex-col max-h-[90vh] overflow-hidden my-auto z-10"
            >
              <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Novo Investimento</h3>
                  <p className="text-xs text-slate-400">Adicione ativos à sua carteira com cotações ao vivo</p>
                </div>
                <button onClick={() => setIsRegistering(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddAsset} className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-emerald-400 shrink-0" />
                    <span className="font-medium">Cotações pesquisadas em tempo real na Internet</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/20 px-2 py-0.5 rounded-md uppercase font-black tracking-wider text-emerald-400 shrink-0">Live Web</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center mr-1">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-1">Símbolo ou Nome do Ativo</label>
                    <button
                      type="button"
                      onClick={() => searchAssetInMarket(formData.ticker)}
                      disabled={!formData.ticker || formData.ticker.length < 2 || isSearchingMarketAsset}
                      className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 transition-colors flex items-center gap-1"
                    >
                      {isSearchingMarketAsset ? "Buscando..." : "Pesquisar na Internet 🌐"}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: PETR4, HGLG11, BTC, Apple..."
                      value={formData.ticker}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData({...formData, ticker: val});
                      }}
                      onBlur={(e) => {
                        if (e.target.value.length >= 3) {
                          searchAssetInMarket(e.target.value);
                        }
                      }}
                      className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-slate-600 transition-all font-mono font-bold tracking-widest text-lg"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isSearchingMarketAsset || isFetchingPrice ? (
                        <Loader2 className="animate-spin text-emerald-400" size={20} />
                      ) : (
                        <Search 
                          className="text-slate-500 cursor-pointer hover:text-emerald-400 transition-colors" 
                          size={20} 
                          onClick={() => searchAssetInMarket(formData.ticker)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-1">Quantidade</label>
                    <input 
                      required
                      type="number" 
                      placeholder="0"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                      className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mr-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-1">Preço Médio</label>
                      <button
                        type="button"
                        onClick={() => fetchCurrentPrice(formData.ticker)}
                        disabled={!formData.ticker || formData.ticker.length < 3 || isFetchingPrice}
                        className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 transition-colors flex items-center gap-1"
                        title="Buscar preço atual no mercado financeiro na internet"
                      >
                        {isFetchingPrice ? "..." : "Buscar 🌐"}
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                      <input 
                        required
                        step="0.01"
                        type="number" 
                        placeholder="0,00"
                        value={formData.avgPrice || ''}
                        onChange={(e) => setFormData({...formData, avgPrice: Number(e.target.value)})}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold text-lg font-mono focus:border-emerald-500/30"
                      />
                    </div>
                  </div>
                </div>

                {formData.avgPrice > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                        <Globe size={14} className="animate-pulse" />
                        <span>{marketSearchResult?.name || `${formData.ticker} - Mercado Financeiro`}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded font-bold">
                        {marketSearchResult?.source || "Cotação em Tempo Real"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-500/10">
                      <span className="text-[11px] text-slate-400">Preço atual de mercado:</span>
                      <div className="flex items-center gap-2">
                        {marketSearchResult?.variation24h !== undefined && (
                          <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                            marketSearchResult.variation24h >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {marketSearchResult.variation24h >= 0 ? '+' : ''}{marketSearchResult.variation24h}% 24h
                          </span>
                        )}
                        <span className="text-sm font-mono font-black text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10">
                          {marketSearchResult?.currency === 'USD' ? '$' : 'R$'} {formData.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-1">Tipo de Classe</label>
                  <div className="relative">
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold appearance-none cursor-pointer"
                    >
                      <option className="bg-slate-900">Ação (B3)</option>
                      <option className="bg-slate-900">FII (Fundo Imob.)</option>
                      <option className="bg-slate-900">ETF (Índices)</option>
                      <option className="bg-slate-900">Criptoativos</option>
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" />
                  </div>
                </div>

                {/* Sticky / Prominently Positioned Submit Button */}
                <div className="pt-3 sticky bottom-0 bg-slate-900/95 backdrop-blur-md pb-1 mt-auto shrink-0 border-t border-white/5">
                  <button 
                    type="submit"
                    className="w-full bg-emerald-500 text-slate-950 py-4 rounded-2xl font-black text-base shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Confirmar e Incluir Ativo</span>
                    <Plus size={20} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingAlert(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl shadow-emerald-500/5 flex flex-col max-h-[90vh] overflow-hidden my-auto z-10"
            >
              <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                <h3 className="text-2xl font-bold text-white tracking-tight">Novo Alerta</h3>
                <button onClick={() => setIsAddingAlert(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0">
                  <X size={20} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddAlert(alertForm);
                }} 
                className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1 flex flex-col"
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

        {alertToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlertToDelete(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-rose-500/5 p-8 text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center border border-rose-500/20">
                  <AlertCircle size={32} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Excluir Alerta?</h3>
                <p className="text-slate-400 text-sm">
                  Tem certeza que deseja excluir o alerta de monitoramento para <strong className="text-white font-mono font-bold">{alertToDelete.ticker}</strong>?
                </p>
                {alertToDelete.type === 'price' && (
                  <p className="text-slate-500 text-xs italic">
                    Alerta de preço {alertToDelete.condition === 'above' ? 'acima de' : 'abaixo de'} R$ {alertToDelete.value?.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setAlertToDelete(null)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl border border-white/5 active:scale-95 transition-all text-sm uppercase tracking-wider font-mono text-center"
                >
                  Não
                </button>
                <button
                  onClick={() => {
                    const newAlerts = alerts.filter(a => a.id !== alertToDelete.id);
                    saveAlerts(newAlerts);
                    setAlertToDelete(null);
                  }}
                  className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-wider font-mono shadow-lg shadow-rose-500/20 text-center"
                >
                  Sim
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showCryptosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCryptosModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-pink-500/5 flex flex-col max-h-[80vh]"
            >
              <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-500/10 text-pink-400 rounded-full flex items-center justify-center border border-pink-500/20">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      Criptos em Alta
                      <span className="text-[10px] bg-pink-500/20 text-pink-300 font-mono px-2 py-0.5 rounded-full border border-pink-500/30 font-bold">
                        Mercado Online 🌐
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Ativos digitais com maior crescimento e variação em tempo real</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchPositiveCryptos}
                    disabled={isFetchingCryptos}
                    className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-pink-400 disabled:opacity-50 transition-all flex items-center justify-center"
                    title="Atualizar cotações do mercado cripto agora"
                  >
                    <RefreshCw size={18} className={isFetchingCryptos ? "animate-spin" : ""} />
                  </button>
                  <button onClick={() => setShowCryptosModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-4 relative">
                {isFetchingCryptos ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-pink-400 mb-4" size={32} />
                    <p className="text-slate-400 font-medium text-sm">Analisando o mercado cripto...</p>
                  </div>
                ) : (
                  <>
                    {positiveCryptos.length > 0 ? (
                      <div className="space-y-3">
                        {positiveCryptos.map((crypto, i) => (
                          <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4 w-1/3">
                              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center font-bold text-pink-400 font-mono text-sm border border-pink-500/20 shrink-0">
                                {crypto.ticker}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-white truncate">{crypto.name}</h4>
                                <p className="text-xs text-slate-400 font-mono truncate">USD {crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                              </div>
                            </div>
                            
                            <div className="flex-1 px-4 h-10 hidden sm:block">
                              {crypto.evolution && crypto.evolution.length > 0 && (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={crypto.evolution.map((val, i) => ({ value: val, index: i }))}>
                                    <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={true} />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1.5 w-1/3 sm:w-auto shrink-0">
                              <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-md text-sm border border-emerald-500/20" title="Variação Diária">
                                <TrendingUp size={14} />
                                +{crypto.variation}% <span className="text-[10px] text-emerald-400/70 ml-0.5">24h</span>
                              </span>
                              {crypto.variation30m !== undefined && (
                                <span className="flex items-center gap-1 text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded-md text-xs border border-pink-500/20" title="Variação nos últimos 30 min">
                                  <TrendingUp size={12} />
                                  +{crypto.variation30m}% <span className="text-[10px] text-pink-400/70 ml-0.5">30m</span>
                                </span>
                              )}
                              {crypto.variation24hAbs !== undefined && (
                                <span className="flex items-center gap-1 text-emerald-400/80 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-md text-[10px] border border-emerald-500/10" title="Variação Absoluta 24h">
                                  +USD {crypto.variation24hAbs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle className="mx-auto text-slate-500 mb-4" size={32} />
                        <p className="text-slate-400">Não encontramos destaques positivos no momento.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
