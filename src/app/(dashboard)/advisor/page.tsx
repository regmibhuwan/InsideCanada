"use client";

import { useState, useRef, useEffect } from "react";
import { useCase } from "@/lib/use-case";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, Loader2, User, AlertTriangle, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const PRE_APPLICATION_QUESTIONS = [
  "What's the best PR pathway for me right now?",
  "My PGWP is expiring soon — what are my options?",
  "How do I apply for a bridging open work permit?",
  "What does 'maintained status' mean and how does it work?",
  "How can I improve my CRS score?",
  "What documents do I need for Express Entry?",
  "Can I change employers on my current work permit?",
  "How long does the PR process take?",
];

const POST_APPLICATION_QUESTIONS = [
  "How long should I expect to wait for my PR decision?",
  "What do I do if IRCC requests additional documents?",
  "Should I order GCMS notes to check my progress?",
  "My work permit expires before PR — what are my options?",
  "What's happening with recent Express Entry draws?",
  "When should I do my medical exam?",
  "What does my current application stage mean?",
  "Are there faster alternative pathways I should consider?",
];

export default function AdvisorPage() {
  const { userCase, loading } = useCase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || sending) return;

    const userMsg: Message = {
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          history: messages,
          userCase,
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response || "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting. Please check your internet connection and try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          AI Immigration Advisor
        </h1>
        <p className="text-muted-foreground mt-1">
          Ask questions about your immigration case in plain English. Advice is personalized to your profile.
        </p>
      </div>

      <div className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">How can I help?</h2>
              <p className="text-muted-foreground text-center mb-8 max-w-md">
                I have access to your full immigration profile. Ask me anything about your case,
                deadlines, eligibility, or next steps.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {(userCase.profile?.has_applied_pr ? POST_APPLICATION_QUESTIONS : PRE_APPLICATION_QUESTIONS).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm p-3 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                Not legal advice. Always verify with a licensed RCIC or lawyer.
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-muted"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your immigration case..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={sending}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Powered by AI · Not legal advice · Consult an RCIC or lawyer for formal guidance
          </p>
        </div>
      </div>
    </div>
  );
}
