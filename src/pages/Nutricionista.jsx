import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, ArrowLeft, Bot, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import MessageBubble from '@/components/nutrition/MessageBubble';

export default function Nutricionista() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Inicializar conversa ou carregar existente
        initializeConversation();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const initializeConversation = async () => {
        try {
            // Verifica se já existe uma conversa ativa (poderia salvar no localStorage ou buscar do backend)
            // Por simplificação, cria uma nova a cada sessão ou recupera a última se implementarmos essa lógica
            const savedConvId = localStorage.getItem('heartbalance_nutrition_chat_id');
            
            if (savedConvId) {
                try {
                    const conv = await base44.agents.getConversation(savedConvId);
                    setConversationId(savedConvId);
                    setMessages(conv.messages || []);
                    subscribeToConversation(savedConvId);
                    return;
                } catch (e) {
                    console.log("Conversa anterior não encontrada ou erro, criando nova.");
                }
            }

            const newConv = await base44.agents.createConversation({
                agent_name: "nutrition_assistant",
                metadata: {
                    name: "Nutricionista HeartBalance",
                    description: "Assistente de nutrição pessoal"
                }
            });
            
            setConversationId(newConv.id);
            setMessages([]);
            localStorage.setItem('heartbalance_nutrition_chat_id', newConv.id);
            subscribeToConversation(newConv.id);
            
            // Mensagem inicial do bot (simulada se não vier do agente)
            if (!newConv.messages || newConv.messages.length === 0) {
                // O agente tem whatsapp_greeting mas aqui podemos forçar uma msg inicial visual
            }

        } catch (error) {
            console.error("Erro ao inicializar conversa:", error);
        }
    };

    const subscribeToConversation = (id) => {
        return base44.agents.subscribeToConversation(id, (data) => {
            setMessages(data.messages);
            setIsLoading(false);
        });
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!inputValue.trim() && !selectedFile) || !conversationId) return;

        const content = inputValue;
        setInputValue("");
        setIsLoading(true);

        try {
            let fileUrls = [];
            
            if (selectedFile) {
                setIsUploading(true);
                // Upload do arquivo
                // Converter File para base64 ou enviar diretamente se a integração suportar,
                // mas a integração UploadFile espera 'file'. O SDK frontend geralmente abstrai isso
                // mas aqui vamos assumir que precisamos enviar o arquivo para obter a URL.
                
                // Nota: A integração UploadFile espera um arquivo. O SDK base44.integrations.Core.UploadFile
                // deve lidar com o objeto File.
                
                try {
                    // Convertendo para base64 se necessário ou passando o blob. 
                    // Base44 client usually handles file uploads via integration
                    const result = await base44.integrations.Core.UploadFile({ file: selectedFile });
                    if (result && result.file_url) {
                        fileUrls.push(result.file_url);
                    }
                } catch (uploadError) {
                    console.error("Erro no upload:", uploadError);
                    // Tentar continuar sem o arquivo ou avisar user
                }
                setIsUploading(false);
                setSelectedFile(null);
            }

            // Adicionar mensagem localmente para feedback instantâneo (opcional, o subscribe vai atualizar)
            // Mas o subscribe é rápido.
            
            await base44.agents.addMessage(conversationId, {
                role: "user",
                content: content,
                file_urls: fileUrls.length > 0 ? fileUrls : undefined
            });

        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
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
                    onClick={() => window.location.href = createPageUrl('Dashboard')}
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
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <Bot className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Olá! Eu sou seu nutricionista.</h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Posso analisar seus exames, sugerir receitas, ou avaliar fotos das suas refeições. Como posso ajudar?
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
                {selectedFile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-50 rounded-lg w-fit border border-emerald-100">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs text-emerald-700 truncate max-w-[200px]">{selectedFile.name}</span>
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
                        placeholder="Digite sua dúvida ou descreva sua refeição..."
                        className="flex-1 bg-gray-50 border-gray-200 focus:ring-emerald-500 focus:border-emerald-500"
                        disabled={isUploading}
                    />
                    
                    <Button 
                        type="submit" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        disabled={(!inputValue.trim() && !selectedFile) || isLoading || isUploading}
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