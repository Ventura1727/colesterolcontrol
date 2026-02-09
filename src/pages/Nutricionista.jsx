import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, ArrowLeft, Bot, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import MessageBubble from "@/components/nutrition/MessageBubble";

const STORAGE_KEY = "hb_nutrition_chat_v1";

// Formato simples e estável para mensagens
function normalizeMessage(msg) {
  if (!msg) return null;
  if (typeof msg === "string") return { role: "assistant", content: msg };
  const role = msg.role === "user" ? "user" : "assistant";
  const content = String(msg.content ?? "");
  return { role, content };
}

function loadStoredMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMessage).filter(Boolean);
  } catch {
    return [];
  }
}

function saveStoredMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export default function Nutricionista() {
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // manter UI, mas por enquanto sem upload real (evita erro)
  const [selectedFile, setSelectedFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    saveStoredMessages(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const emptyState = useMemo(() => messages.length === 0 && !isLoading, [messages.length, isLoading]);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // por enquanto, não vamos processar imagem
    setSelectedFile(null);
    setInfo("Upload de imagem ainda não está habilitado (migração Base44 → Supabase).");
    setTimeout(() => setInfo(null), 3500);

    // Se quiser habilitar depois, a gente integra Supabase Storage + /api/nutrition-chat com file_url
  };

  async function callNutritionApi(nextMessages) {
    // Endpoint a ser criado depois.
    // Se não existir, retornamos uma resposta fallback, mas sem quebrar a página.
    try {
      const resp = await fetch("/api/nutrition-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data?.error || "Falha ao consultar IA.");
      }

      const assistantText = String(data?.assistant ?? "").trim();
      if (!assistantText) throw new Error("Resposta vazia da IA.");
      return assistantText;
    } catch (e) {
      // fallback amigável
      return "Ainda estou sendo configurado. Em breve vou responder por IA aqui.\n\n(Obs: falta criar o endpoint /api/nutrition-chat na Vercel.)";
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const content = inputValue.trim();
    if (!content) return;

    setInputValue("");
    setIsLoading(true);

    // 1) adiciona mensagem do usuário
    const next = [...messages, { role: "user", content }];
    setMessages(next);

    // 2) chama API (ou fallback)
    try {
      const assistant = await callNutritionApi(next);
      setMessages((prev) => [...prev, { role: "assistant", content: assistant }]);
    } catch (err) {
      setError(err?.message || "Erro ao enviar mensagem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 shadow-sm shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (window.location.href = createPageUrl("Dashboard"))}
          className="text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-emerald-600" />
        </div>

        <div>
          <h1 className="font-bold text-gray-900">Nutricionista IA</h1>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Online • HeartBalance
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {emptyState && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Olá! Eu sou seu nutricionista.</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Posso sugerir receitas e orientações gerais. (A integração com IA está sendo finalizada.)
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm ml-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Digitando...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-200 shrink-0">
        {info && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm text-blue-700 mb-2">
            {info}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm text-red-700 mb-2">
            {error}
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-50 rounded-lg w-fit border border-emerald-100">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-700 truncate max-w-[200px]">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600" type="button">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
            onClick={() => fileInputRef.current?.click()}
            title="Upload de imagem (em breve)"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite sua dúvida..."
            className="flex-1 bg-gray-50 border-gray-200 focus:ring-emerald-500 focus:border-emerald-500"
          />

          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>

        <p className="text-[10px] text-center text-gray-400 mt-2">
          A IA pode cometer erros. Verifique informações médicas importantes.
        </p>
      </div>
    </div>
  );
}
