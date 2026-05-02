import type { Express, Request, Response } from "express";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b:free";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

export function registerChatRoutes(app: Express) {
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { messages } = req.body as ChatRequest;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages are required" });
      }

      // Add system message if not present
      const hasSystemMessage = messages.some(m => m.role === "system");
      const finalMessages = hasSystemMessage ? messages : [
        {
          role: "system",
          content: "Você é um assistente de suporte da Meteorfy, uma plataforma de vendas digital. Seja educado, prestativo e ajude os usuários com dúvidas sobre a plataforma, produtos, checkouts e configurações. Responda sempre em português do Brasil."
        },
        ...messages
      ];

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: finalMessages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        return res.status(500).json({ 
          message: "Erro ao processar mensagem. Tente novamente." 
        });
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

      res.json({ 
        message: assistantMessage,
        usage: data.usage 
      });

    } catch (error: any) {
      console.error("Chat endpoint error:", error);
      res.status(500).json({ 
        message: error?.message || "Erro interno do servidor" 
      });
    }
  });
}