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
    const { ticker, context } = req.body;

    if (!ticker) {
      return res.status(400).json({ error: "Ticker is required" });
    }

    try {
      const prompt = `Analise a ação ${ticker} do mercado brasileiro (B3). 
      Considere o seguinte contexto do usuário: ${context || 'Nenhum contexto adicional'}.
      Forneça uma análise preditiva fundamentada (lembrando que não é recomendação oficial), 
      destacando pontos de atenção, oportunidades e uma estimativa de tendência para os próximos meses.
      Responda em Português formatado em Markdown.`;

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
