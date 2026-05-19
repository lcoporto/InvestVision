import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // API Routes
  app.post("/api/analyze-stock", async (req, res) => {
    const { ticker, context, position, detailLevel = "intermediário" } = req.body;

    if (!ticker) {
      return res.status(400).json({ error: "Ticker is required" });
    }

    try {
      let positionContext = "";
      if (position) {
        positionContext = `O usuário possui ${position.quantity} unidades deste ativo com um preço médio de R$ ${position.avgPrice}. 
        Inclua na análise se a cotação atual versus o preço médio sugere uma estratégia de "hold", "buy more" ou "take profit" (venda parcial/total), 
        baseado nos fundamentos e tendências atuais.`;
      }

      let detailInstruction = "";
      let thinkingLevelSelected = ThinkingLevel.LOW;

      if (detailLevel === "básico") {
        thinkingLevelSelected = ThinkingLevel.MINIMAL;
        detailInstruction = `Forneça uma análise BÁSICA e Direta:
        - Resumo executivo ultra simplificado de até 2 parágrafos sobre a situação atual de ${ticker}.
        - 3 principais pontos positivos e 3 pontos negativos rápidos em lista de marcadores.
        - Um veredito direto de tendência de curto/médio prazo (Alta, Neutro, Baixa).
        Esta é uma análise rápida, focada e de alta velocidade de leitura.`;
      } else if (detailLevel === "avançado") {
        thinkingLevelSelected = ThinkingLevel.HIGH;
        detailInstruction = `Forneça uma análise AVANÇADA, Extremamente Detalhada e Completa:
        - Resumo profissional detalhado da governança, saúde financeira (endividamento, margens, ROIC) e tese de investimento global.
        - Análise aprofundada de valuation e múltiplos (P/L, P/VP, Dividend Yield) comparando com as médias históricas e pares setoriais.
        - Seção abrangente de perspectivas macroeconômicas (como inflação, juros Selic e câmbio afetam esta empresa nos próximos 12 a 24 meses).
        - Matriz de Riscos detalhada abordando estresse de mercado, concorrência, regulação e gargalos operacionais.
        - Roadmap de recomendações estratégicas personalizadas para a carteira.
        Seja extremamente minucioso e use múltiplos subtópicos formatados em Markdown.`;
      } else {
        // intermediário (default)
        thinkingLevelSelected = ThinkingLevel.LOW;
        detailInstruction = `Forneça uma análise INTERMEDIÁRIA balanceada:
        - Resumo executivo claro e focado sobre ${ticker}.
        - Seção estruturada de prós e contras ponderados.
        - Seção de "### Análise de Risco Detalhada" contendo Volatilidade Histórica, Correlação com o Mercado (beta) e Cenários de Estresse (alta de juros, crise setorial, etc.).
        - Estimativa de tendência fundamentada para os próximos meses.`;
      }

      const prompt = `Analise a ação ${ticker} do mercado brasileiro (B3). 
      ${positionContext}
      Considere o seguinte contexto adicional do usuário: ${context || 'Nenhum contexto adicional'}.
      
      NÍVEL DE DETALHE SOLICITADO: **${detailLevel.toUpperCase()}**
      
      Diretrizes específicas de profundidade para esta análise:
      ${detailInstruction}
      
      Responda em Português formatado em Markdown com um tom profissional, analítico e elegante.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: thinkingLevelSelected }
        }
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to analyze stock", details: error.message });
    }
  });

  // Mock Market Data Endpoint
  app.get("/api/market-data", (req, res) => {
    const { timeframe } = req.query;
    const now = new Date();
    const data = [];
    
    let points = 6;
    let stepDescription = 'month';

    if (timeframe === 'daily') {
      points = 30;
      stepDescription = 'day';
    } else if (timeframe === 'weekly') {
      points = 12;
      stepDescription = 'week';
    }

    for (let i = points; i >= 0; i--) {
      let date: Date;
      let name: string;

      if (timeframe === 'daily') {
        date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        name = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      } else if (timeframe === 'weekly') {
        date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        name = `Sem ${points - i + 1}`;
      } else {
        date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        name = date.toLocaleString('pt-BR', { month: 'short' });
      }
      
      data.push({
        name: name,
        ibov: 110000 + Math.random() * 15000 - 7500 + (i * (points / 3)), // Improving trend
        portfolio: 100 + Math.random() * 15 - 7.5 + (i * 0.5), // Portfolio in %
      });
    }

    res.json(data);
  });

  // Fetch current price for a ticker
  app.get("/api/current-price/:ticker", async (req, res) => {
    const { ticker } = req.params;

    try {
      const prompt = `Qual é o preço atual aproximado da ação ${ticker} na B3 (Brasil)? 
      Retorne APENAS o valor numérico com ponto decimal, sem símbolos de moeda ou texto adicional. 
      Se não encontrar, retorne 0.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const price = parseFloat(response.text.trim());
      res.json({ price: isNaN(price) ? 0 : price });
    } catch (error: any) {
      console.error("Price Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  // Fetch news for a ticker and optional keywords/sources
  app.post("/api/fetch-news", async (req, res) => {
    const { ticker, keywords, sources } = req.body;

    try {
      const prompt = `Atue como um analista financeiro. Busque e sintetize as notícias mais recentes e relevantes sobre o ativo ${ticker}. 
      ${keywords ? `Foque especialmente em tópicos relacionados a: ${keywords}.` : ''}
      ${sources ? `Considere fontes como: ${sources}.` : ''}
      Retorne uma lista formatada em Markdown com títulos, um breve resumo e o sentimento geral (positivo, neutro ou negativo).
      A resposta deve ser em Português.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      res.json({ news: response.text });
    } catch (error: any) {
      console.error("News Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.post("/api/compare-assets", (req, res) => {
    const { tickers } = req.body;
    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({ error: "Tickers array is required" });
    }

    const now = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('pt-BR', { month: 'short' });
      
      const point: any = { name: monthName };
      tickers.forEach((ticker, index) => {
        // Base value + random variance + trend based on ticker index to differentiate
        point[ticker] = 100 + (Math.random() * 20 - 10) + (i * (2 + index));
      });
      data.push(point);
    }

    res.json(data);
  });

  app.get("/api/sector-comparison/:ticker", async (req, res) => {
    const { ticker } = req.params;
    try {
      const prompt = `Identifique 3-4 ativos do mesmo setor/ramo que ${ticker} na B3 (Brasil).
      Para cada um (incluindo ${ticker}), gere dados fictícios mas realistas de:
      - Ticker
      - Preço Atual
      - Dividend Yield (L12M %)
      - P/L (Preço/Lucro)
      - Rentabilidade 12M (%)
      Retorne APENAS um objeto JSON válido seguindo este formato:
      [
        {"ticker": "ABC3", "price": 10.5, "dy": 5.2, "pe": 12.4, "return12m": 15.6},
        ...
      ]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      // Simple JSON extraction from response
      const jsonStr = response.text.substring(response.text.indexOf('['), response.text.lastIndexOf(']') + 1);
      const data = JSON.parse(jsonStr);
      res.json(data);
    } catch (error: any) {
      console.error("Sector Comparison Error:", error);
      res.status(500).json({ error: "Failed to fetch sector comparison" });
    }
  });

  // Fetch variation for selected tickers with seeded values for stability
  app.get("/api/assets-variation", (req, res) => {
    const tickersParam = req.query.tickers as string;
    const period = (req.query.period as string) || "daily";

    let tickersList: string[] = [];
    let isMockData = false;

    if (tickersParam) {
      tickersList = tickersParam.split(",").map(t => t.trim().toUpperCase()).filter(Boolean);
    }

    if (tickersList.length === 0) {
      tickersList = ["PETR4", "VALE3", "ITUB4", "MGLU3", "BBDC4", "WEGE3"];
      isMockData = true;
    }

    const getSeededValue = (ticker: string, per: string) => {
      let hash = 0;
      const str = ticker + per;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const absHash = Math.abs(hash);
      let maxVar = 3.5;
      if (per === "weekly") maxVar = 8.0;
      if (per === "monthly") maxVar = 15.0;

      const percentage = ((absHash % 200) / 100 - 1) * maxVar;
      return Number(percentage.toFixed(2));
    };

    const data = tickersList.map(ticker => ({
      ticker,
      variation: getSeededValue(ticker, period),
    }));

    res.json({ data, isMockData });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InvestVision server running at http://localhost:${PORT}`);
  });
}

startServer();
