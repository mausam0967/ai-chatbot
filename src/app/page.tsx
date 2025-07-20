"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, User, Sparkles } from "lucide-react"
import { useSession, signIn, signOut } from "next-auth/react"

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Array<{ id: number; role: string; content: string }>>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [model, setModel] = useState<string>(process.env.AI_MODEL_NAME || "lgai/exaone-3-5-32b-instruct");
  const [error, setError] = useState<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [lastUserMessage, setLastUserMessage] = useState<{ id: number; role: string; content: string } | null>(null);
  const [lastModel, setLastModel] = useState<string>("");
  const MAX_MESSAGE_LENGTH = 500;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const confirmYesRef = useRef<HTMLButtonElement>(null);

  // Add clearChat handler
  const clearChat = () => {
    setMessages([]);
    setInput("");
    setError("");
    setLastUserMessage(null);
    setLastModel("");
    setShowClearConfirm(false);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Trap focus in modal and handle Escape key
  useEffect(() => {
    if (showClearConfirm) {
      confirmYesRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowClearConfirm(false);
          clearButtonRef.current?.focus();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showClearConfirm]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { id: Date.now(), role: "user", content: input }
    setMessages((prevMessages) => [...prevMessages, userMessage])
    setInput("")
    setIsLoading(true)
    setError("");
    setLastUserMessage(userMessage);
    setLastModel(model);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, userMessage], model }),
      })

      if (!response.ok) {
        let errorMsg = "Something went wrong. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (jsonErr) {
          // fallback to text
          const errorText = await response.text();
          if (errorText) errorMsg = errorText;
        }
        setError(errorMsg);
        return;
      }

      const data = await response.json()
      const aiMessage = { id: Date.now() + 1, role: "assistant", content: data.content }
      setMessages((prevMessages) => [...prevMessages, aiMessage])
    } catch (error) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async () => {
    if (!lastUserMessage) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, lastUserMessage], model: lastModel || model }),
      });
      if (!response.ok) {
        let errorMsg = "Something went wrong. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (jsonErr) {
          const errorText = await response.text();
          if (errorText) errorMsg = errorText;
        }
        setError(errorMsg);
        return;
      }
      const data = await response.json();
      const aiMessage = { id: Date.now() + 1, role: "assistant", content: data.content };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      setLastUserMessage(null);
      setLastModel("");
    } catch (error) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 relative overflow-hidden">
        {/* Decorative blurred background blob */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-30 rounded-full blur-3xl z-0" />
        <Card className="p-10 flex flex-col items-center relative z-10 border-0 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl">
          <div className="w-20 h-20 mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            Welcome to AI Assistant
          </h2>
          <p className="text-md text-muted-foreground mb-6 text-center max-w-xs">
            Sign in with Google to start chatting with your AI assistant.
          </p>
          <Button
            onClick={() => signIn("google")}
            className="h-12 px-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg font-semibold shadow-lg transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2 inline-block align-middle" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.22l6.85-6.85C35.64 2.7 30.18 0 24 0 14.82 0 6.71 5.82 2.69 14.29l7.98 6.19C12.13 13.13 17.57 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.04l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.48a14.5 14.5 0 0 1 0-9.01l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.34 2.69 10.48l7.98-6z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.15-5.57l-7.19-5.6c-2.01 1.35-4.6 2.15-7.96 2.15-6.43 0-11.87-3.63-14.33-8.98l-7.98 6C6.71 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
            Sign in with Google
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pt-6 gap-y-4 gap-x-6 flex-wrap w-full">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-sm text-muted-foreground">Powered by source</p>
              <p className="text-lg font-semibold mt-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome Back!! {session.user?.name}
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full md:w-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full md:w-auto">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 dark:text-white w-full md:w-auto"
                disabled={isLoading}
              >
                <option value="lgai/exaone-3-5-32b-instruct">Exaone-3-5-32B-Instruct (Serverless, ready to use)</option>
                <option value="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free">DeepSeek-R1-Distill-Llama-70B-free (Serverless, ready to use)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="font-semibold text-blue-700 dark:text-purple-300 whitespace-nowrap">{session.user?.name}</span>
              <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <Card className="flex-1 flex flex-col shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm relative">
          {/* Sticky Top Bar for Clear Button only */}
          <div className="sticky top-0 left-0 z-20 flex items-start px-4 pt-4 pb-2 bg-white/80 dark:bg-slate-900/80 rounded-t-lg">
            <button
              ref={clearButtonRef}
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 text-xs px-4 py-2 font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all border-0"
              aria-label="Clear chat history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Clear
            </button>
          </div>
          {/* Clear Chat Confirmation Dialog (fixed, centered modal) */}
          {showClearConfirm && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30" role="dialog" aria-modal="true" aria-labelledby="clear-chat-title">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 flex flex-col items-center">
                <p id="clear-chat-title" className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Clear all chat messages?</p>
                <div className="flex gap-4">
                  <button
                    ref={confirmYesRef}
                    onClick={clearChat}
                    className="px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow hover:from-blue-600 hover:to-purple-700 focus:outline-none"
                    aria-label="Confirm clear chat"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => { setShowClearConfirm(false); clearButtonRef.current?.focus(); }}
                    className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold shadow hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none"
                    aria-label="Cancel clear chat"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Error Banner */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-md mb-2 flex items-center justify-between">
              <span>{error}</span>
              <div className="flex items-center gap-2">
                <button
                  className="text-blue-700 hover:text-blue-900 font-bold border border-blue-200 rounded px-2 py-1 disabled:opacity-50 flex items-center gap-2"
                  onClick={handleRetry}
                  disabled={isLoading}
                  aria-label="Retry last message"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4 mr-1 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  ) : null}
                  Retry
                </button>
                <button
                  className="ml-2 text-red-700 hover:text-red-900 font-bold"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Welcome to AI Assistant</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Start a conversation by typing a message below. I&apos;m here to help with questions, tasks, and creative
                    projects.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback
                      className={`${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      }`}
                    >
                      {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                    <div
                      className={`inline-block p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-bl-md">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Form */}
          <div className="border-t bg-white/50 dark:bg-slate-900/50 p-4">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                      setInput(e.target.value);
                    }
                  }}
                  placeholder="Type your message..."
                  className="pr-12 h-12 rounded-full border-2 focus:border-blue-500 transition-colors"
                  disabled={isLoading}
                  maxLength={MAX_MESSAGE_LENGTH}
                  aria-label="Type your message"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 select-none">
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </div>
                {input.length === MAX_MESSAGE_LENGTH && (
                  <div className="absolute left-0 -bottom-5 text-xs text-red-500">Maximum message length reached.</div>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || input.length > MAX_MESSAGE_LENGTH}
                className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            {/* Ephemeral Chat Warning (centered below input) */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-200 rounded px-3 py-1 w-fit mx-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Chat history is not saved and will be lost if you refresh or sign out.
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-4 text-sm text-muted-foreground">
          <p>AI Assistant • Built with Next.js and AI SDK</p>
        </div>
      </div>
    </div>
  )
}