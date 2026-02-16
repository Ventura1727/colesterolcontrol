// src/pages/Nutricionista.jsx
import React, { useMemo } from "react";
import { ArrowLeft, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function Nutricionista() {
  const promptBase = useMemo(() => {
    return `
Você é um(a) nutricionista virtual do app HeartBalance.
Contexto: o app ajuda pessoas a controlar colesterol com alimentação, hidratação e atividade física.
Regras:
- Responda em português (Brasil)
- Seja claro e objetivo
- Faça perguntas rápidas se faltar informação
- Evite recomendações médicas de risco; sugira procurar médico quando necessário

Minha dúvida é:
`.trim();
  }, []);

  const openChatGPT = () => {
    // ChatGPT não oferece “URL oficial com prompt preenchido” garantida.
    // Então abrimos o ChatGPT e o usuário cola o prompt.
    window.open("https://chatgpt.com", "_blank", "noopener,noreferrer");
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptBase);
      alert("Prompt copiado! Agora abra o ChatGPT e cole no chat.");
    } catch {
      // fallback se clipboard falhar
      const ta = document.createElement("textarea");
      ta.value = promptBase;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Prompt copiado! Agora abra o ChatGPT e cole no chat.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (window.location.href = createPageUrl("Dashboard"))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Nutricionista IA</h1>
            <p className="text-sm text-gray-500">
              Versão gratuita: usando o ChatGPT Web (fora do app)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-700 mb-4">
            Para manter 100% gratuito, vamos abrir o ChatGPT em uma nova aba.
            Você volta para o HeartBalance quando quiser.
          </p>

          <div className="space-y-3">
            <Button
              onClick={copyPrompt}
              variant="outline"
              className="w-full rounded-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar prompt de início
            </Button>

            <Button
              onClick={openChatGPT}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir ChatGPT
            </Button>

            <div className="text-xs text-gray-500 leading-relaxed">
              Passo a passo: 1) Clique em “Copiar prompt” 2) Clique em “Abrir ChatGPT”
              3) Cole o prompt no chat 4) Escreva sua dúvida.
            </div>
          </div>
        </div>

        <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <div className="font-semibold text-emerald-900 mb-2">Dica</div>
          <div className="text-sm text-emerald-900/90">
            Se quiser, me diga sua idade, exames (LDL/HDL/Triglicérides), objetivo e rotina.
            Assim o ChatGPT consegue orientar melhor.
          </div>
        </div>
      </div>
    </div>
  );
}
