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
    const { ticker, context, position } = req.body;

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

      const prompt = `Analise a ação ${ticker} do mercado brasileiro (B3). 
      ${positionContext}
      Considere o seguinte contexto adicional do usuário: ${context || 'Nenhum contexto adicional'}.
      Forneça uma análise preditiva fundamentada (lembrando que não é recomendação oficial), 
      destacando pontos de atenção, oportunidades e uma estimativa de tendência para os próximos meses.
      Responda em Português formatado em Markdown com um tom profissional e analítico.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
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
    // Return some mock historical data for the last 6 months
    const now = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('pt-BR', { month: 'short' });
      
      data.push({
        name: monthName,
        ibov: 110000 + Math.random() * 20000 - 10000 + (i * 2000), // Improving trend
        portfolio: 100 + Math.random() * 20 - 10 + (i * 3.5), // Portfolio in %
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
