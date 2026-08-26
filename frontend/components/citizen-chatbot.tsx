"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tv,
  HelpCircle,
  Languages,
  ArrowRight,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  noticeLink?: {
    id: string;
    title: string;
    category: string;
    status: "published" | "pending_review" | "not_found";
    details?: string;
  };
}

const KNOWLEDGE_BASE_NOTICES = [
  {
    id: "notice_scholarship_2026",
    title: "National Merit Scholarship Application Window 2026",
    category: "Education & Scholarships",
    department: "Ministry of Education",
    status: "published" as const,
    deadline: "30 November 2026",
    eligibility: "Students scoring at least 75% in qualifying examination",
    slots: "12,000 merit scholarships nationwide",
    languages: ["Hindi", "Marathi", "Tamil", "English"],
    keywords: ["scholarship", "merit", "nmss", "education", "student", "stipend", "cutoff", "75%"],
  },
  {
    id: "notice_swayam_2026",
    title: "NTA SWAYAM January 2026 Semester Exam Results",
    category: "Examination Results",
    department: "National Testing Agency (NTA)",
    status: "published" as const,
    deadline: "Results Live (Portal Active)",
    eligibility: "Candidates who appeared for 61 Hybrid Mode courses",
    slots: "Score cards hosted at swayam.nta.ac.in",
    languages: ["Hindi", "Marathi", "Tamil", "English"],
    keywords: ["swayam", "nta", "exam", "result", "semester", "score card", "marks", "ignou"],
  },
  {
    id: "notice_fda_recall_2026",
    title: "Urgent Safety Recall Order: Contaminated Cough Syrup Batch CP-4029",
    category: "Urgent Safety Recall",
    department: "Food & Drug Administration (FDA) Maharashtra",
    status: "published" as const,
    deadline: "Immediate quarantine & 7-day return",
    eligibility: "Wholesale distributors, retail chemists & hospital pharmacies",
    slots: "Batch CP-4029 freeze",
    languages: ["Hindi", "Marathi", "Tamil", "English"],
    keywords: ["recall", "fda", "cough syrup", "drug", "medicine", "contaminated", "quarantine", "safety"],
  },
  {
    id: "notice_pm_kisan_18",
    title: "PM-Kisan 18th Installment DBT Disbursement Date Notification",
    category: "Agriculture & Farmer Welfare",
    department: "Ministry of Agriculture & Farmers Welfare",
    status: "published" as const,
    deadline: "Biometric e-KYC before 25 September 2026",
    eligibility: "Registered landholding farmer families",
    slots: "Rs 2,000 direct bank DBT transfer on 5 October 2026",
    languages: ["Hindi", "Marathi", "Tamil", "English"],
    keywords: ["pm kisan", "kisan", "farmer", "dbt", "installment", "2000", "agriculture", "ekyc"],
  },
  {
    id: "notice_ugc_abc_2026",
    title: "UGC Guidelines on Direct Academic Credit Transfer via ABC Portal",
    category: "Higher Education Advisory",
    department: "University Grants Commission",
    status: "published" as const,
    deadline: "Mandatory integration by October 2026",
    eligibility: "All Central and State Universities",
    slots: "DigiLocker Academic Bank of Credits integration",
    languages: ["Hindi", "Marathi", "Tamil", "English"],
    keywords: ["ugc", "abc", "credit", "transfer", "digilocker", "university", "academic bank"],
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg_1",
    sender: "bot",
    text: "Namaste! 🙏 I am **VaaniMitra (वाणीमित्र)**, your AI Citizen Assistant. You can speak or type to check if any notice is published, search circulars, or get guidance in your language.",
    timestamp: "Just now",
  },
];

const SUGGESTION_CHIPS = [
  "Is the National Merit Scholarship notice published?",
  "Has the SWAYAM exam result been declared?",
  "Show me urgent medicine recall notices from FDA",
  "How do I watch videos in Hindi or Marathi?",
  "What is the PM-Kisan installment date?",
];

// Helper to clean markdown formatting for natural voice synthesis
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#+/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[👉📌🏛️⏳🎯✅🔍ℹ️🌐✔]/g, "")
    .replace(/\n+/g, ". ");
}

export function CitizenChatbot() {
  const { isAdmin } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceResponseEnabled, setIsVoiceResponseEnabled] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Stop any ongoing speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice Output (Text-to-Speech)
  const speakText = (text: string, msgId: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }

    // If currently speaking this message, toggle off
    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Try to find an Indian English or Hindi voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("hi-IN") || v.name.includes("India")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingMessageId(msgId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  };

  // Voice Input (Speech-to-Text Voice Search)
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info("Microphone recognition not supported in this browser", {
        description: "Please type your question into the chat box below.",
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // Supports English (India) and bilingual speech

      recognition.onstart = () => {
        setIsListening(true);
        toast.success("Listening... Speak your question now", {
          description: "e.g., 'Is the National Merit Scholarship published?'",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInputValue(transcript);

        // If final result, send
        if (event.results[0].isFinal) {
          setIsListening(false);
          handleSend(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  // Intelligent notice search and response generation
  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const lowerQ = query.toLowerCase();

      // 1. Search Knowledge Base
      let matchedNotice = KNOWLEDGE_BASE_NOTICES.find((n) =>
        n.keywords.some((k) => lowerQ.includes(k)) || lowerQ.includes(n.id) || n.title.toLowerCase().includes(lowerQ)
      );

      let botResponse: ChatMessage;

      if (matchedNotice) {
        botResponse = {
          id: `msg_bot_${Date.now()}`,
          sender: "bot",
          text: `✅ **Yes, this notice is officially published and live on the portal!**\n\n📌 **${matchedNotice.title}**\n🏛️ **Department:** ${matchedNotice.department}\n⏳ **Key Timeline/Deadline:** ${matchedNotice.deadline}\n🎯 **Eligibility / Terms:** ${matchedNotice.eligibility}\n\nYou can watch the narrated outreach video in **Hindi, Marathi, Tamil, or English** with synchronized subtitles right on this page!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          noticeLink: {
            id: matchedNotice.id,
            title: matchedNotice.title,
            category: matchedNotice.category,
            status: matchedNotice.status,
            details: matchedNotice.slots,
          },
        };
      } else if (
        lowerQ.includes("published") ||
        lowerQ.includes("available") ||
        lowerQ.includes("already") ||
        lowerQ.includes("is this notice") ||
        lowerQ.includes("find notice")
      ) {
        botResponse = {
          id: `msg_bot_${Date.now()}`,
          sender: "bot",
          text: `🔍 I checked our official published registry. Here are the notices currently verified and live on **VaaniReach**:\n\n1. **National Merit Scholarship Scheme 2026** (12,000 scholarships, deadline 30 Nov)\n2. **NTA SWAYAM Semester Results** (61 Hybrid courses on swayam.nta.ac.in)\n3. **FDA Maharashtra Drug Recall Order** (Urgent batch CP-4029 freeze)\n4. **PM-Kisan 18th Installment DBT Notice** (Release on 5 Oct 2026)\n\nIs there a specific circular number, topic, or department you are looking for?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      } else if (lowerQ.includes("language") || lowerQ.includes("hindi") || lowerQ.includes("marathi") || lowerQ.includes("tamil")) {
        botResponse = {
          id: `msg_bot_${Date.now()}`,
          sender: "bot",
          text: `🌐 **Multilingual Video Playback:**\n\nAll verified notices on VaaniReach are generated in **Hindi (हिन्दी)**, **Marathi (मराठी)**, **Tamil (தமிழ்)**, and **English (EN)** using Sarvam AI translation & neural voice synthesis.\n\n👉 Simply click the language buttons below the video player to switch tracks instantly with live captions!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      } else if (lowerQ.includes("how") || lowerQ.includes("help") || lowerQ.includes("work")) {
        botResponse = {
          id: `msg_bot_${Date.now()}`,
          sender: "bot",
          text: `ℹ️ **How to use VaaniReach:**\n\n1. **Browse Notices:** Click any notice on the right list to load its outreach video.\n2. **Select Language:** Choose Hindi, Marathi, Tamil, or English.\n3. **Switch Anchor:** Toggle between Priya (Female) and Rajesh (Male) anchors.\n4. **Check Source Citations:** Scroll down below the video to view exact verbatim evidence from the gazette circular.\n5. **Officer Login:** Authorized officials can click **Admin Login** in the top right to generate new videos.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      } else {
        botResponse = {
          id: `msg_bot_${Date.now()}`,
          sender: "bot",
          text: `I've noted your question: *"${query}"*.\n\nYou can ask me if specific notices (such as Scholarships, Exam Results, Health Advisories, or Welfare Schemes) are published, or speak your question using the microphone!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);

      // Auto-speak voice reply if voice response is enabled
      if (isVoiceResponseEnabled) {
        speakText(botResponse.text, botResponse.id);
      }
    }, 450);
  };

  // ONLY render on User Portal (Citizen mode). Hide completely in Admin Mode and Admin routes.
  if (isAdmin) return null;
  if (
    pathname &&
    (pathname.startsWith("/jobs") ||
      pathname.startsWith("/status") ||
      pathname.startsWith("/review") ||
      pathname.startsWith("/history"))
  ) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Bottom-Right Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group animate-fade-in">
          {/* Pulsing Hint Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 border border-primary/30 shadow-lg text-xs font-semibold text-foreground backdrop-blur-md transition-all group-hover:scale-105">
            <Mic className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span>Voice Search Available • Ask VaaniMitra</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-amber-500 text-white shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-200 cursor-pointer"
            aria-label="Open AI Citizen Assistant"
          >
            <Bot className="h-7 w-7 animate-bounce-slow" />
          </button>
        </div>
      )}

      {/* 2. Expandable Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[430px] h-[600px] max-h-[85vh] bg-card/95 border border-primary/30 rounded-2xl shadow-2xl shadow-primary/15 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header with Voice Response Toggle & Close */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-amber-500/10 border-b flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-card rounded-[9px] flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-foreground">VaaniMitra AI</h3>
                  <Badge variant="outline" className="text-[10px] font-mono py-0 px-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Voice Enabled
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">Citizen Notice Assistant • वाणीमित्र</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Auto Voice Response Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (speakingMessageId) stopSpeaking();
                  setIsVoiceResponseEnabled(!isVoiceResponseEnabled);
                  toast.info(
                    !isVoiceResponseEnabled ? "🔊 Voice Replies Activated" : "🔇 Voice Replies Muted"
                  );
                }}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isVoiceResponseEnabled
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-muted-foreground bg-muted/40 border-border"
                }`}
                title={isVoiceResponseEnabled ? "Voice Output ON (Click to mute)" : "Voice Output Muted (Click to enable)"}
              >
                {isVoiceResponseEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg) => {
              const isBot = msg.sender === "bot";
              const isSpeakingThis = speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? "items-start" : "items-end justify-end"}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div className={`space-y-1.5 max-w-[85%] ${isBot ? "" : "text-right"}`}>
                    <div
                      className={`relative p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isBot
                          ? `bg-muted/60 border text-foreground rounded-tl-xs shadow-xs ${
                              isSpeakingThis ? "border-primary/50 ring-1 ring-primary/30" : ""
                            }`
                          : "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                      }`}
                    >
                      {msg.text}

                      {/* Embedded Notice Card in Chat */}
                      {msg.noticeLink && (
                        <div className="mt-3 p-2.5 rounded-xl bg-background/80 border border-primary/20 space-y-1.5 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-primary">
                              {msg.noticeLink.category}
                            </span>
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              ✔ PUBLISHED
                            </Badge>
                          </div>
                          <h4 className="font-bold text-[11px] text-foreground leading-tight">
                            {msg.noticeLink.title}
                          </h4>
                          {msg.noticeLink.details && (
                            <p className="text-[10px] text-muted-foreground">{msg.noticeLink.details}</p>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              stopSpeaking();
                              setIsOpen(false);
                              window.scrollTo({ top: 400, behavior: "smooth" });
                            }}
                            className="w-full h-7 text-[10px] gap-1 font-bold cursor-pointer mt-1"
                          >
                            <Tv className="h-3 w-3" />
                            <span>Play Outreach Broadcast Video</span>
                          </Button>
                        </div>
                      )}

                      {/* Per-Message Voice Listen Button for Bot Messages */}
                      {isBot && (
                        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => speakText(msg.text, msg.id)}
                            className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                              isSpeakingThis
                                ? "bg-primary text-primary-foreground font-bold"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            }`}
                          >
                            {isSpeakingThis ? (
                              <>
                                <VolumeX className="h-3 w-3 animate-pulse" />
                                <span>Stop Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3 w-3" />
                                <span>Listen Voice</span>
                              </>
                            )}
                          </button>

                          {isSpeakingThis && (
                            <div className="flex items-center gap-0.5 h-3">
                              <span className="w-1 h-full bg-primary rounded-full animate-wave" style={{ animationDelay: "0ms" }} />
                              <span className="w-1 h-3/4 bg-primary rounded-full animate-wave" style={{ animationDelay: "150ms" }} />
                              <span className="w-1 h-full bg-primary rounded-full animate-wave" style={{ animationDelay: "300ms" }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono px-1">{msg.timestamp}</span>
                  </div>

                  {!isBot && (
                    <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 mb-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-mono pt-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "300ms" }} />
                  <span className="text-[10px]">VaaniMitra is searching official notices...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Active Listening Mic Banner */}
          {isListening && (
            <div className="px-4 py-2 bg-gradient-to-r from-red-500/15 via-amber-500/15 to-primary/15 border-t flex items-center justify-between text-xs font-mono animate-pulse">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <Radio className="h-4 w-4 animate-spin" />
                <span>Listening to your voice... Speak now</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[10px] underline cursor-pointer text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Quick Suggestion Chips */}
          <div className="p-2 border-t bg-muted/20 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
            {SUGGESTION_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-background border text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar with Voice Search Mic and Send */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t bg-card flex items-center gap-2"
          >
            {/* Microphone Voice Search Button */}
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              onClick={toggleListening}
              className={`h-9 px-2.5 cursor-pointer shrink-0 transition-all ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30"
                  : "hover:text-primary hover:border-primary/50"
              }`}
              title={isListening ? "Stop listening" : "Click to speak your question"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? "Listening... speak now" : "Speak or type your question..."}
              className="h-9 text-xs bg-background/80 flex-1"
            />

            <Button
              type="submit"
              size="sm"
              disabled={!inputValue.trim() || isTyping}
              className="h-9 px-3 cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
