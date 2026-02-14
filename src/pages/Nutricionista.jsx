import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip, ArrowLeft, Bot, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import MessageBubble from "@/components/nutrition/MessageBubble";
import { supabase } from "@/lib/supabaseClient";

const STORAGE_KEY = "heartbalance_nutrition_chat_messages_v1";

export default function Nutricionista() {
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', content:string}
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // UI anexo (ainda não envia imagem)
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Carrega histórico local
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Salva histórico local
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = useMemo(() => {
    return (!isUploading && !isLoading) && (inputValue.trim().length > 0 || !!selectedFile);
  }, [inputValue, selectedFile, isUploading, isLoading]);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) setSelectedFile(f);
  };

  const pushAssistantError = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          text ||
          "Não consegui responder agora. Tente novamente em instantes.\n\n(Se persistir, me mande o erro do console/network).",
      },
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    // Por enquanto: se tiver arquivo selecionado, avisamos que ainda não suporta
    if (selectedFile) {
      alert("Upload de imagem ainda não está ativo. Vamos habilitar no próximo passo.");
      setSelectedFile(null);
      return;
    }

    const userText = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    const nextMessages = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);

    try {
      // ✅ pega token do usuário (mesmo padrão do water-log/colesterol)
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessão inválida. Faça login novamente.");

      const resp = await fetch("/api/nutrition-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: nextMessages.slice(-20) }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // ✅ mostra erro real do backend
        pushAssistantError(
          data?.error ||
            `Erro no servidor (HTTP ${resp.status}). Se persistir, verifique logs do Vercel e me mande o print.`
        );
        return;
      }

      if (!data?.assistant) {
        pushAssistantError("Resposta vazia do servidor. Verifique logs do Vercel (/api/nutrition-chat).");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.assistant }]);
    } catch (err) {
      console.error("Nutricionista IA erro:", err);
      pushAssistantError(
        `Falha de conexão com o servidor do chat.\n\nDetalhe: ${err?.message || "erro desconhecido"}`
      );
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Olá! Eu sou seu nutricionista.
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Posso sugerir cardápios para reduzir LDL/colesterol, ajustar hábitos e montar metas semanais.
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

      {/* Input */}
      <div className="bg-white p-4 border-t border-gray-200 shrink-0">
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-50 rounded-lg w-fit border border-emerald-100">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-700 truncate max-w-[200px]">
              {selectedFile.name}
            </span>
            <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite sua dúvida (ex: me sugira um café da manhã para reduzir LDL)..."
            className="flex-1 bg-gray-50 border-gray-200 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={isUploading || isLoading}
          />

          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            disabled={!canSend}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>

        <p className="text-[10px] text-center text-gray-400 mt-2">
          A IA pode cometer erros. Verifique informações médicas importantes.
        </p>
      </div>
    </div>
  );
}
