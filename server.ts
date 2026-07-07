import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Check API key status
  app.get("/api/ai-status", (req, res) => {
    const apiKeyExists = !!process.env.GEMINI_API_KEY;
    res.json({ ready: apiKeyExists });
  });

  // API Route: Natural Language Task Parsing
  app.post("/api/parse-task", async (req, res) => {
    try {
      const { text, currentDate, currentDayOfWeek, categories } = req.body;

      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Missing or invalid 'text' field" });
        return;
      }

      const ai = getAi();
      
      const categoryPromptList = categories && Array.isArray(categories) && categories.length > 0
        ? categories.map((c: any) => `- ID: "${c.id}", Name: "${c.name}"`).join("\n")
        : "None available";

      const systemInstruction = `You are an expert natural language task planner assistant. 
Your job is to analyze a natural language task description and extract structured information.

Current details for reference:
- Current date: ${currentDate || "Unknown"}
- Current day of week: ${currentDayOfWeek || "Unknown"}

Available categories to classify into:
${categoryPromptList}

Extract:
1. title: The actual task/event title (e.g. "开会", "去看医生"). Strip out the time or date words if they are solely used for scheduling, but keep them if they are part of the title itself (e.g. "看周三的电影" can retain "周三").
2. date: The resolved target date in YYYY-MM-DD format. Use the reference current date to calculate words like "明天" (tomorrow), "下周三" (next Wednesday), "后天", "今天". If no date is mentioned or implied, leave it empty.
3. time: The target time in HH:MM format (24-hour clock). Parse phrases like "下午3点" to "15:00", "早上8:30" to "08:30". If no time is specified, leave it empty.
4. categoryId: Match the task conceptually to one of the provided category IDs. If none fits well, leave it empty.
5. urgency: Detect urgency from words like "急", "特急", "必须做", "很重要" -> 'high'; "重要", "提醒我" -> 'medium'; else default to 'low'.

Strictly follow the output schema provided.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: text,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "The parsed task name, e.g., '和团队开会'"
              },
              date: {
                type: Type.STRING,
                description: "Date in YYYY-MM-DD format, or empty if none specified"
              },
              time: {
                type: Type.STRING,
                description: "Time in HH:MM format, or empty if none specified"
              },
              categoryId: {
                type: Type.STRING,
                description: "The best matching category ID or empty if none match well"
              },
              urgency: {
                type: Type.STRING,
                enum: ["low", "medium", "high"],
                description: "Urgency rating"
              }
            },
            required: ["title"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        res.status(500).json({ error: "Empty response from Gemini API" });
        return;
      }

      const parsedData = JSON.parse(resultText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini Parsing Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to parse natural language task", 
        details: error.toString() 
      });
    }
  });

  // Vite development middleware vs Static Production files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
