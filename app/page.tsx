"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scrapeData, setScrapeData] = useState<{
    screenshot: string;
    html: string;
    title: string;
    url: string;
  } | null>(null);

  const handleScrape = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Auto-prepend https:// if missing
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
      setUrl(finalUrl);
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to capture the page");
      }

      const data = await res.json();
      setScrapeData(data);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to capture the page"
      );
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || !scrapeData) return;

    sessionStorage.setItem(
      "builderData",
      JSON.stringify({
        url: scrapeData.url,
        screenshot: scrapeData.screenshot,
        html: scrapeData.html,
        title: scrapeData.title,
        prompt: prompt.trim(),
      })
    );

    router.push("/builder");
  }, [prompt, scrapeData, router]);

  return (
    <div className="min-h-screen hero-gradient grid-bg noise relative flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-[family-name:var(--font-syne)] text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Flawless</span>{" "}
            <span className="text-white/80">Prototype Builder</span>
          </h1>
          <p className="text-muted text-lg">
            Capture any site. Describe your vision. Get a working prototype.
          </p>
        </motion.div>

        {/* Step 1: URL Input */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleScrape();
                  }}
                  placeholder="Enter a URL to capture (e.g., linear.app)"
                  className="w-full bg-card border border-border rounded-xl px-5 py-4 text-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm px-1"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleScrape}
                disabled={loading || !url.trim()}
                className="btn-primary w-full rounded-xl px-6 py-4 text-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                <span>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Capturing page...
                    </span>
                  ) : (
                    "Capture"
                  )}
                </span>
              </button>
            </motion.div>
          )}

          {/* Step 2: Prompt Input */}
          {step === 2 && scrapeData && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-5"
            >
              {/* Screenshot confirmation */}
              <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                <img
                  src={`data:image/png;base64,${scrapeData.screenshot}`}
                  alt="Captured page"
                  className="w-24 h-16 object-cover object-top rounded-lg border border-border/50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {scrapeData.title || "Untitled"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {scrapeData.url}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStep(1);
                    setScrapeData(null);
                  }}
                  className="text-muted hover:text-foreground text-sm transition-colors shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Prompt textarea */}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to build? Describe the prototype you have in mind..."
                rows={4}
                className="w-full bg-card border border-border rounded-xl px-5 py-4 text-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none"
                autoFocus
              />

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="btn-primary w-full rounded-xl px-6 py-4 text-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                <span>Generate Prototype</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
