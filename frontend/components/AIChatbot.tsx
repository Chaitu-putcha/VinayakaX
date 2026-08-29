"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Mic, MicOff, Bot } from "lucide-react";

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Namaste! I am your VinayakaX Smart Assistant. How can I help you today regarding UDDANAM RAMAKRISHNA PURAM festival?" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Set up Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "en-IN"; // Supports Indian English accent, handles Telugu words too
      rec.interimResults = false;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputValue(text);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      alert("Voice search is not supported in this browser. Please use Google Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Every message â€” typed, spoken, or from a quick-action button â€” goes
  // through this single function, which always calls the real backend
  // (FastAPI -> Gemini). There is no client-side keyword logic here.
  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return; // guard against empty sends & double-submits

    const userMsg: Message = { sender: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 30s timeout (safety margin on top of the backend fix)

      const response = await fetch("https://vinayakax-backend.onrender.com/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const reply = typeof data?.reply === "string" && data.reply.trim()
          ? data.reply
          : "Sorry, I didn't get a proper response. Please try again.";
        setMessages(prev => [...prev, { sender: "bot", text: reply }]);
      } else {
        setMessages(prev => [
          ...prev,
          { sender: "bot", text: "Apologies, I am having trouble connecting to my knowledge base right now." }
        ]);
      }
    } catch (e: any) {
      const text =
        e?.name === "AbortError"
          ? "That's taking longer than expected. Please try again in a moment."
          : "I'm currently offline, but you can contact the Main Head Venky Chotu at +91 7993093251.";
      setMessages(prev => [...prev, { sender: "bot", text }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    handleSendMessage(q);
  };

  return (
    <div className="fixed z-[60] right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6">
      {/* Chat bubble button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-saffron-500 text-white shadow-lg hover:bg-saffron-600 hover:scale-110 active:scale-95 transition-all duration-300 animate-bounce"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat window panel */}
      {isOpen && (
        <div className="flex flex-col w-[calc(100vw-2rem)] max-w-[350px] h-[min(70dvh,480px)] lg:w-[350px] lg:h-[480px] rounded-2xl glass-panel shadow-2xl overflow-hidden border border-gold-500/30 transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-saffron-600 to-gold-500 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <h4 className="text-sm font-semibold">VinayakaX AI Assistant</h4>
                <span className="text-[10px] opacity-85">Uddanam Ramakrishna Puram</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-stone-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-stone-50/50 dark:bg-stone-900/50 no-scrollbar">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                    m.sender === "user"
                      ? "bg-saffron-500 text-white rounded-tr-none"
                      : "bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-tl-none shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-none px-3.5 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-500 animate-bounce" />
                  <span className="ml-1">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Recommended Tags */}
          <div className="px-3 py-2 bg-stone-100/50 dark:bg-stone-850/50 border-t border-stone-200/50 dark:border-stone-700/50 flex gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap">
            <button
              onClick={() => handleQuickQuestion("Tell me the Vinayaka story")}
              disabled={isLoading}
              className="text-[10px] bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:border-saffron-500 rounded-full px-2.5 py-1 text-stone-600 dark:text-stone-300 hover:text-saffron-600 transition-colors disabled:opacity-50"
            >
              Vinayaka story
            </button>
            <button
              onClick={() => handleQuickQuestion("Who is Goddess of the village?")}
              disabled={isLoading}
              className="text-[10px] bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:border-saffron-500 rounded-full px-2.5 py-1 text-stone-600 dark:text-stone-300 hover:text-saffron-600 transition-colors disabled:opacity-50"
            >
              Goddess info
            </button>
            <button
              onClick={() => handleQuickQuestion("Who is in the Committee?")}
              disabled={isLoading}
              className="text-[10px] bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:border-saffron-500 rounded-full px-2.5 py-1 text-stone-600 dark:text-stone-300 hover:text-saffron-600 transition-colors disabled:opacity-50"
            >
              Committee
            </button>
            <button
              onClick={() => handleQuickQuestion("Where is the Putchavani Totalu street?")}
              disabled={isLoading}
              className="text-[10px] bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:border-saffron-500 rounded-full px-2.5 py-1 text-stone-600 dark:text-stone-300 hover:text-saffron-600 transition-colors disabled:opacity-50"
            >
              Pooja location
            </button>
            <button
              onClick={() => handleQuickQuestion("à°¤à±†à°²à±à°—à±à°²à±‹ à°šà±†à°ªà±à°ªà°‚à°¡à°¿ (Telugu)?")}
              disabled={isLoading}
              className="text-[10px] bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:border-saffron-500 rounded-full px-2.5 py-1 text-stone-600 dark:text-stone-300 hover:text-saffron-600 transition-colors disabled:opacity-50"
            >
              à°¤à±†à°²à±à°—à±
            </button>
          </div>

          {/* Form input */}
          <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-250 dark:border-stone-750 flex items-center gap-2">
            <button
              onClick={toggleSpeech}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all disabled:opacity-50 ${
                isListening ? "bg-red-500 text-white animate-pulse" : "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
              }`}
              title="Voice Search / Ask with mic"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              placeholder={isListening ? "Listening..." : "Ask VinayakaX..."}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage(inputValue)}
              disabled={isLoading}
              className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full px-3.5 py-1.5 text-xs focus:outline-none focus:border-saffron-500 text-stone-800 dark:text-stone-100 disabled:opacity-60"
            />

            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="p-2 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white transition-all disabled:opacity-50 disabled:hover:bg-saffron-500"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
