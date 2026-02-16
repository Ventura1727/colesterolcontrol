// src/pages/Nutricionista.jsx
import React, { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Copy, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";

export default function Nutricionista() {
  const [question, setQuestion] = useState("");
  const [copied, setCopied] = useState(false);

  const basePrompt = useMemo(() => {
    return (
      `Você é um(a) nutricionista virtual do app HeartBalance (controle de colesterol).
Objetivo: responder dúvidas do usuário sobre alimentação, hidratação e atividade física para melhorar colesterol.

Regras:
- Responda em português (Brasil).
- Seja claro, prático e objetivo.
- Faça 2–4 perguntas curtas se faltar informação (ex.: idade, exames LDL/HDL/TG, rotina, restrições).
- Evite prescrever remédios. Se houver sinais de risco, oriente procurar médico.
- Sugira opções acessíveis e seguras, com exemplos de refeições.

Minha dúvida é:
`
    );
  }, []);

  const finalPrompt = useMemo(() => {
    const q = (question || "").trim();
    return q ? `${basePrompt}${q}` : basePrompt;
  }, [basePrompt, question]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback (caso clipboard não funcione)
      try {
        const ta = document.createElement("textarea");
        ta.value = finalPrompt;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        alert("Não consegui copiar automaticamente. Selecione e copie manualmente o texto.");
      }
    }
  };

  const openChatGPT = () => {
    // Abre em nova aba (mais confiável que tentar embed/iframe)
    window.open("https://chatgpt.com", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (window.location.href = createPageUrl("Dashboard"))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Nutricionista IA</h1>
            <p className="text-sm text-gray-500">
              Modo gratuito: abre o ChatGPT em nova aba (sem custos no seu app)
            </p>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start gap-2 text-sm text-gray-700 mb-4">
            <Info className="w-5 h-5 text-emerald-700 mt-0.5" />
            <div>
              Para manter <b>100% gratuito</b>, o chat será feito no ChatGPT Web (free/plus do próprio usuário).
              Você pode voltar para o HeartBalance quando quiser.
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Escreva sua dúvida (opcional)</label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="mt-2"
                placeholder="Ex: como montar um café da manhã para reduzir LDL?"
              />
              <p className="text-xs text-gray-500 mt-2">
                Se você preencher, eu coloco a sua pergunta já no prompt que será copiado.
              </p>
            </div>

            <Button onClick={copyPrompt} variant="outline" className="w-full rounded-xl">
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Prompt copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar prompt (com contexto)
                </>
              )}
            </Button>

            <Button
              onClick={openChatGPT}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir ChatGPT
            </Button>

            <div className="text-xs text-gray-500 leading-relaxed">
              Passo a passo: 1) Clique em <b>Copiar prompt</b> 2) Clique em <b>Abrir ChatGPT</b> 3) Cole no chat
              4) Envie. Depois é só voltar para esta aba do HeartBalance.
            </div>
          </div>
        </div>

        {/* Dicas rápidas */}
        <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <div className="font-semibold text-emerald-900 mb-2">Para respostas melhores</div>
          <div className="text-sm text-emerald-900/90">
            Inclua no chat: sua idade, altura/peso (se quiser), seus exames (LDL/HDL/triglicérides), objetivo e rotina.
          </div>
        </div>
      </div>
    </div>
  );
}
