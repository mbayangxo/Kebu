"use client";

import { useState, useRef, useEffect } from "react";
import { Nav } from "@/app/components/nav";
import { PantherEyes } from "@/app/components/panther-motif";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "How do I apply for the Tony Elumelu Foundation grant?",
  "What documents do I need to get a business loan in Nigeria?",
  "Is my food business eligible for AfDB AFAWA funding?",
  "Help me write an application for the YouthConnekt fellowship",
  "What is a certificate of origin under AfCFTA?",
  "How can diaspora investors buy equity in African businesses?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          system: `You are Kebu AI, an expert African business and funding advisor. You help African entrepreneurs, founders, and diaspora investors navigate funding opportunities, grant applications, government contracts, accelerators, and business regulations across all 54 African countries.

Your expertise includes:
- African Development Bank (AfDB) programs and AFAWA
- Tony Elumelu Foundation, Mastercard Foundation, and other philanthropic grants
- Government tender and procurement processes across Africa
- AfCFTA trade rules and certificates of origin
- SME loan products from development finance institutions
- Application writing and document preparation
- Business formalization and compliance across African jurisdictions

Be specific, practical, and direct. When asked about a specific opportunity, provide concrete next steps. When asked to write something, write it. Respond in the language the user writes in (English or French).`,
        }),
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-ivory flex flex-col">
      <Nav />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 flex flex-col py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <PantherEyes size={64} />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink mb-2">
            AI Application Coach
          </h1>
          <p className="text-muted text-sm max-w-md mx-auto">
            Ask me anything about African funding, grant applications, tenders, and business compliance. I know all 54 countries.
          </p>
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer compact />
        </div>

        {/* Quick prompts — shown when no messages */}
        {messages.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-left text-sm text-ink bg-white border border-border rounded-xl px-4 py-3 hover:border-gold hover:text-deep-green transition-colors leading-snug"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-deep-green text-ivory"
                      : "bg-white border border-border text-ink"
                  }`}
                >
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                    <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className="mt-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              placeholder="Ask about grants, tenders, applications, regulations..."
              className="flex-1 bg-white border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="bg-deep-green text-ivory font-bold px-5 py-3 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-40"
            >
              {streaming ? "..." : "Send"}
            </button>
          </form>
          <p className="text-center text-xs text-muted mt-3">
            Powered by Claude AI · Always verify deadlines and eligibility directly with funders
          </p>
        </div>
      </div>
    </div>
  );
}
