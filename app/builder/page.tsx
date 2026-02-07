"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface BuilderData {
  url: string;
  screenshot: string;
  html: string;
  title: string;
  prompt: string;
}

function extractHtml(text: string): string {
  // Try to extract HTML from ```html...``` fences
  const fenceMatch = text.match(/```html\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Handle partial fence during streaming (opened but not closed)
  const partialMatch = text.match(/```html\s*\n?([\s\S]*?)$/);
  if (partialMatch) return partialMatch[1].trim();

  // If no fences, return text as-is (might be raw HTML)
  return text.trim();
}

export default function BuilderPage() {
  const router = useRouter();
  const [builderData, setBuilderData] = useState<BuilderData | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [displayHtml, setDisplayHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [phaseText, setPhaseText] = useState("Initializing...");
  const [instruction, setInstruction] = useState("");
  const [iterationCount, setIterationCount] = useState(0);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const accumulatedRef = useRef("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load builder data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("builderData");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const data: BuilderData = JSON.parse(stored);
      setBuilderData(data);
    } catch {
      router.push("/");
    }
  }, [router]);

  // Auto-trigger initial generation
  useEffect(() => {
    if (builderData && !generatedHtml && !isGenerating) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderData]);

  const updateDisplayDebounced = useCallback((html: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDisplayHtml(html);
    }, 500);
  }, []);

  async function consumeStream(response: Response, label: string) {
    const streamStart = Date.now();
    console.log(`[${label}] Starting to consume SSE stream`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    accumulatedRef.current = "";
    let chunkCount = 0;
    let sseEventCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(`[${label}] Reader done after ${Date.now() - streamStart}ms`);
        break;
      }

      chunkCount++;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            console.log(`[${label}] Received [DONE] signal`);
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              console.error(`[${label}] Server error:`, parsed.error);
              setError(parsed.error);
              return;
            }
            if (parsed.text) {
              sseEventCount++;
              accumulatedRef.current += parsed.text;
              if (sseEventCount % 50 === 0) {
                console.log(`[${label}] Progress: ${sseEventCount} events, ${accumulatedRef.current.length} chars accumulated, ${Date.now() - streamStart}ms`);
              }
              const extracted = extractHtml(accumulatedRef.current);
              if (extracted) {
                setGeneratedHtml(extracted);
                updateDisplayDebounced(extracted);
              }
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Final update without debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const finalHtml = extractHtml(accumulatedRef.current);
    console.log(`[${label}] Stream complete: ${sseEventCount} SSE events, ${chunkCount} reader chunks, final HTML ${finalHtml.length} chars, ${Date.now() - streamStart}ms total`);
    if (finalHtml) {
      setGeneratedHtml(finalHtml);
      setDisplayHtml(finalHtml);
    }
  }

  async function handleGenerate() {
    if (!builderData) return;
    setIsGenerating(true);
    setError("");
    setPhaseText("Analyzing screenshot...");

    console.log("[generate] Starting generation:", {
      url: builderData.url,
      prompt: builderData.prompt,
      screenshotSize: builderData.screenshot.length,
      htmlSize: builderData.html.length,
    });

    try {
      setTimeout(() => setPhaseText("Generating prototype..."), 3000);

      console.log("[generate] Sending POST /api/generate...");
      const fetchStart = Date.now();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshot: builderData.screenshot,
          html: builderData.html,
          url: builderData.url,
          prompt: builderData.prompt,
        }),
      });
      console.log(`[generate] Response status: ${res.status} in ${Date.now() - fetchStart}ms`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      setPhaseText("Streaming response...");
      await consumeStream(res, "generate");
      console.log("[generate] Generation complete");
    } catch (err) {
      console.error("[generate] Error:", err);
      setError(
        err instanceof Error ? err.message : "Generation failed"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleIterate() {
    if (!instruction.trim() || isGenerating || !generatedHtml) return;

    const currentInstruction = instruction.trim();
    setInstruction("");
    setIsGenerating(true);
    setError("");
    setPhaseText("Applying changes...");

    console.log("[iterate] Starting iteration:", {
      instruction: currentInstruction,
      currentHtmlSize: generatedHtml.length,
    });

    try {
      console.log("[iterate] Sending POST /api/iterate...");
      const fetchStart = Date.now();
      const res = await fetch("/api/iterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentHtml: generatedHtml,
          instruction: currentInstruction,
          url: builderData?.url || "",
        }),
      });
      console.log(`[iterate] Response status: ${res.status} in ${Date.now() - fetchStart}ms`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Iteration failed");
      }

      await consumeStream(res, "iterate");
      setIterationCount((c) => c + 1);
      console.log("[iterate] Iteration complete");
    } catch (err) {
      console.error("[iterate] Error:", err);
      setError(
        err instanceof Error ? err.message : "Iteration failed"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (!builderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-border bg-card/50 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="font-[family-name:var(--font-syne)] font-bold text-lg gradient-text hover:opacity-80 transition-opacity"
        >
          Flawless
        </button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={`data:image/png;base64,${builderData.screenshot}`}
            alt="Source"
            className="w-10 h-7 object-cover object-top rounded border border-border/50 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">
              {builderData.title || "Untitled"}
            </p>
            <p className="text-xs text-muted truncate">{builderData.url}</p>
          </div>
        </div>
        {iterationCount > 0 && (
          <span className="text-xs text-muted bg-border/50 px-2 py-1 rounded-full shrink-0">
            {iterationCount} iteration{iterationCount !== 1 ? "s" : ""}
          </span>
        )}
      </header>

      {/* Main preview area */}
      <main className="flex-1 relative overflow-hidden">
        {displayHtml ? (
          <iframe
            srcDoc={displayHtml}
            sandbox="allow-scripts"
            className="w-full h-full border-none bg-white"
            title="Prototype preview"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card/30">
            <p className="text-muted text-sm">Preview will appear here</p>
          </div>
        )}

        {/* Loading overlay */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div className="text-center space-y-4">
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                <p className="text-foreground font-medium">{phaseText}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm z-20">
            {error}
          </div>
        )}
      </main>

      {/* Bottom chat bar */}
      <div className="border-t border-border bg-card/50 px-5 py-3 shrink-0">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleIterate();
              }
            }}
            placeholder={
              isGenerating
                ? "Generating..."
                : "Describe changes... (Enter to send, Shift+Enter for newline)"
            }
            disabled={isGenerating || !generatedHtml}
            rows={1}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none disabled:opacity-40"
          />
          <button
            onClick={handleIterate}
            disabled={isGenerating || !instruction.trim() || !generatedHtml}
            className="btn-primary rounded-xl px-5 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none shrink-0"
          >
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
