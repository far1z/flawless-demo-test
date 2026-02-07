"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";

/* ─── Types ─── */

interface User {
  name: string;
  avatarBg: string;
  avatarText: string;
  initial: string;
  isBot?: boolean;
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface Message {
  user: string;
  text: string;
  isStatic: boolean;
  delay: number;
  time: string;
  reactions?: Reaction[];
}

/* ─── Data ─── */

const USERS: Record<string, User> = {
  traction: {
    name: "Traction",
    avatarBg: "bg-gradient-to-br from-landing-amber to-amber-500",
    avatarText: "text-[#1a1d21]",
    initial: "T",
    isBot: true,
  },
  sarah: {
    name: "Sarah K.",
    avatarBg: "bg-[#e06b56]",
    avatarText: "text-white",
    initial: "S",
  },
  mike: {
    name: "Mike R.",
    avatarBg: "bg-[#4a8fe2]",
    avatarText: "text-white",
    initial: "M",
  },
};

const MESSAGES: Message[] = [
  {
    user: "traction",
    text: "Morning. Your Google Ads CAC spiked to $11.20 yesterday. I paused 2 underperformers and I\u2019m testing new copy.",
    isStatic: true,
    delay: 0,
    time: "9:41 AM",
    reactions: [{ emoji: "\uD83D\uDC40", count: 2, users: ["Sarah K.", "Mike R."] }],
  },
  {
    user: "sarah",
    text: "Which campaigns did you pause?",
    isStatic: true,
    delay: 0,
    time: "9:43 AM",
  },
  {
    user: "traction",
    text: "\u201CQ4 Retarget \u2014 Broad\u201D and \u201CStartup Founders v2.\u201D Both were above $14 CAC for 3 days. I reallocated budget to \u201CDevTools IC\u201D which is at $3.80.",
    isStatic: true,
    delay: 0,
    time: "9:43 AM",
    reactions: [{ emoji: "\uD83D\uDC4D", count: 1, users: ["Sarah K."] }],
  },
  {
    user: "traction",
    text: "New ad set is live. CTR is up 34% in the first hour.",
    isStatic: false,
    delay: 1500,
    time: "10:12 AM",
    reactions: [{ emoji: "\uD83D\uDE80", count: 2, users: ["Sarah K.", "Mike R."] }],
  },
  {
    user: "mike",
    text: "Can we push more budget there?",
    isStatic: false,
    delay: 1800,
    time: "10:15 AM",
  },
  {
    user: "traction",
    text: "Already on it \u2014 scaled 2x. Also found a Reddit thread in r/saas about exactly what we build. Drafted a reply for review.",
    isStatic: false,
    delay: 1200,
    time: "10:16 AM",
    reactions: [{ emoji: "\u2705", count: 1, users: ["Mike R."] }],
  },
  {
    user: "traction",
    text: "EOD update: CAC is down to $4.12. 23 signups today. Back to building. \u270C\uFE0F",
    isStatic: false,
    delay: 1500,
    time: "5:30 PM",
    reactions: [
      { emoji: "\uD83C\uDF89", count: 3, users: ["Sarah K.", "Mike R.", "Traction"] },
    ],
  },
];

const TYPING_DURATION = 800;

/* ─── Hooks ─── */

function useMessageSequence(isInView: boolean) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>("traction");
  const hasPlayed = useRef(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const staticCount = MESSAGES.filter((m) => m.isStatic).length;
  const totalCount = MESSAGES.length;

  const playSequence = useCallback(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    if (prefersReducedMotion.current) {
      setVisibleCount(totalCount);
      return;
    }

    setVisibleCount(staticCount);

    let currentIndex = staticCount;

    function showNext() {
      if (currentIndex >= totalCount) return;

      const message = MESSAGES[currentIndex];

      setTimeout(() => {
        setTypingUser(message.user);
        setIsTyping(true);

        setTimeout(() => {
          setIsTyping(false);
          currentIndex++;
          setVisibleCount(currentIndex);
          showNext();
        }, TYPING_DURATION);
      }, message.delay);
    }

    showNext();
  }, [staticCount, totalCount]);

  useEffect(() => {
    if (isInView) {
      playSequence();
    }
  }, [isInView, playSequence]);

  return { visibleCount, isTyping, typingUser };
}

/* ─── Message sub-components ─── */

function TypingIndicator({ userKey }: { userKey: string }) {
  const user = USERS[userKey];
  return (
    <div className="flex items-start gap-2 px-5 py-1">
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${user.avatarBg}`}
      >
        <span className={`text-[13px] font-bold ${user.avatarText}`}>
          {user.initial}
        </span>
      </div>
      <div className="pt-1">
        <div className="flex items-center gap-1 px-1 py-1">
          <motion.span
            className="h-2 w-2 rounded-full bg-[#b9bbbe]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-[#b9bbbe]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-[#b9bbbe]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

function ReactionPill({ emoji, count }: { emoji: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#35373b] bg-[#25272b] px-2 py-0.5 text-xs cursor-pointer hover:border-[#4a4d55] transition-colors">
      <span>{emoji}</span>
      <span className="text-[#d1d2d3]">{count}</span>
    </span>
  );
}

function SlackMessage({
  message,
  animate,
  isGrouped,
}: {
  message: Message;
  animate: boolean;
  isGrouped: boolean;
}) {
  const user = USERS[message.user];

  const content = isGrouped ? (
    <div className="group flex items-start gap-2 px-5 py-0.5 hover:bg-[#222529]/50">
      <div className="w-9 shrink-0 pt-0.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[11px] text-[#ababad]">{message.time}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[15px] leading-[1.46] text-[#d1d2d3]">
          {message.text}
        </p>
        {message.reactions && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <ReactionPill key={r.emoji} emoji={r.emoji} count={r.count} />
            ))}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="group flex items-start gap-2 px-5 pt-2 pb-0.5 hover:bg-[#222529]/50">
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${user.avatarBg}`}
      >
        <span className={`text-[13px] font-bold ${user.avatarText}`}>
          {user.initial}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-[#d1d2d3] hover:underline cursor-pointer">
            {user.name}
          </span>
          {user.isBot && (
            <span className="rounded bg-[#1d6955]/30 px-1 py-px text-[10px] font-medium uppercase tracking-wide text-[#44b37e]">
              App
            </span>
          )}
          <span className="text-xs text-[#ababad]">{message.time}</span>
        </div>
        <p className="text-[15px] leading-[1.46] text-[#d1d2d3]">
          {message.text}
        </p>
        {message.reactions && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <ReactionPill key={r.emoji} emoji={r.emoji} count={r.count} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/* ─── Main component ─── */

export function SlackConversation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-80px" });
  const { visibleCount, isTyping, typingUser } =
    useMessageSequence(isInView);

  const staticCount = MESSAGES.filter((m) => m.isStatic).length;

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [visibleCount, isTyping]);

  return (
    <section className="px-4 sm:px-6 pb-20 sm:pb-28 pt-4" ref={containerRef}>
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.08]"
        >
          {/* macOS window chrome */}
          <div className="flex items-center gap-2 bg-[#1a1d21] px-4 py-2.5 border-b border-[#313338]">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>

          {/* Slack app layout */}
          <div className="flex h-[440px] sm:h-[480px]">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden sm:flex w-[220px] shrink-0 flex-col bg-[#19171d] border-r border-[#313338]">
              {/* Workspace header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#313338]/60">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#4a154b]">
                  <span className="text-[10px] font-bold text-white">A</span>
                </div>
                <span className="text-[15px] font-bold text-white truncate">
                  Acme Inc
                </span>
                <svg
                  className="ml-auto h-4 w-4 text-[#ababad]"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {/* Sidebar nav */}
              <div className="flex-1 overflow-hidden py-3 px-2">
                <div className="space-y-0.5">
                  <SidebarItem icon="thread" label="Threads" />
                  <SidebarItem icon="dm" label="Direct messages" />
                </div>

                {/* Channels section */}
                <div className="mt-4">
                  <div className="flex items-center gap-1 px-2 py-1">
                    <svg
                      className="h-3 w-3 text-[#ababad]"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-[13px] font-medium text-[#ababad]">
                      Channels
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    <SidebarChannel name="general" />
                    <SidebarChannel name="growth" active />
                    <SidebarChannel name="product" />
                    <SidebarChannel name="engineering" />
                  </div>
                </div>

                {/* DMs section */}
                <div className="mt-4">
                  <div className="flex items-center gap-1 px-2 py-1">
                    <svg
                      className="h-3 w-3 text-[#ababad]"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-[13px] font-medium text-[#ababad]">
                      Direct messages
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    <SidebarDM
                      name="Traction"
                      avatar={
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-landing-amber to-amber-500">
                          <span className="text-[8px] font-bold text-[#1a1d21]">
                            T
                          </span>
                        </div>
                      }
                      online
                    />
                    <SidebarDM name="Slackbot" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main chat area */}
            <div className="flex flex-1 flex-col bg-[#1a1d21]">
              {/* Channel header */}
              <div className="flex items-center gap-2 border-b border-[#313338] px-4 sm:px-5 py-2.5 bg-[#1a1d21]">
                <span className="text-[18px] text-[#ababad] leading-none">
                  #
                </span>
                <span className="text-[15px] font-bold text-white">
                  growth
                </span>
                <div className="hidden sm:flex items-center ml-2 pl-2 border-l border-[#313338] gap-1.5">
                  {/* Member avatars */}
                  <div className="flex -space-x-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-landing-amber to-amber-500 ring-2 ring-[#1a1d21]">
                      <span className="text-[8px] font-bold text-[#1a1d21]">
                        T
                      </span>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-[#e06b56] ring-2 ring-[#1a1d21]">
                      <span className="text-[8px] font-bold text-white">
                        S
                      </span>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-[#4a8fe2] ring-2 ring-[#1a1d21]">
                      <span className="text-[8px] font-bold text-white">
                        M
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[#ababad]">3</span>
                </div>
              </div>

              {/* Messages area */}
              <div
                ref={scrollAreaRef}
                className="flex-1 overflow-y-auto py-4"
              >
                {/* Date divider */}
                <div className="relative flex items-center px-5 py-2 mb-2">
                  <div className="flex-1 border-t border-[#313338]/60" />
                  <span className="mx-4 rounded-full border border-[#313338]/60 bg-[#1a1d21] px-3 py-0.5 text-[12px] font-bold text-[#d1d2d3]">
                    Today
                  </span>
                  <div className="flex-1 border-t border-[#313338]/60" />
                </div>

                {MESSAGES.slice(0, visibleCount).map((message, index) => {
                  const prev = index > 0 ? MESSAGES[index - 1] : null;
                  const isGrouped =
                    prev !== null &&
                    prev.user === message.user &&
                    prev.time === message.time;
                  return (
                    <SlackMessage
                      key={index}
                      message={message}
                      animate={index >= staticCount}
                      isGrouped={isGrouped}
                    />
                  );
                })}
                {isTyping && <TypingIndicator userKey={typingUser} />}
              </div>

              {/* Message input */}
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <div className="rounded-lg border border-[#565856] bg-[#222529]">
                  <div className="px-4 py-2.5">
                    <span className="text-[14px] text-[#ababad]">
                      Message #growth
                    </span>
                  </div>
                  <div className="flex items-center gap-1 border-t border-[#565856]/30 px-2 py-1.5">
                    <ToolbarIcon d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                    <ToolbarIcon d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    <div className="ml-auto flex items-center gap-1">
                      <ToolbarIcon d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Sidebar sub-components ─── */

function SidebarItem({
  icon,
  label,
}: {
  icon: "thread" | "dm";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1 text-[#ababad] hover:bg-[#27242c] cursor-pointer">
      {icon === "thread" ? (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          />
        </svg>
      )}
      <span className="text-[14px]">{label}</span>
    </div>
  );
}

function SidebarChannel({
  name,
  active,
}: {
  name: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-0.5 cursor-pointer ${
        active
          ? "bg-[#1264a3] text-white"
          : "text-[#ababad] hover:bg-[#27242c]"
      }`}
    >
      <span className="text-[16px] leading-none">#</span>
      <span className="text-[14px]">{name}</span>
    </div>
  );
}

function SidebarDM({
  name,
  active,
  avatar,
  online,
}: {
  name: string;
  active?: boolean;
  avatar?: React.ReactNode;
  online?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer ${
        active
          ? "bg-[#1264a3] text-white"
          : "text-[#ababad] hover:bg-[#27242c]"
      }`}
    >
      {avatar || (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-[#4a4f55]">
          <span className="text-[9px] font-bold text-white">
            {name.charAt(0)}
          </span>
        </div>
      )}
      <span className="text-[14px] truncate">{name}</span>
      {online && (
        <span className="ml-auto h-2 w-2 rounded-full bg-[#2bac76]" />
      )}
    </div>
  );
}

function ToolbarIcon({ d }: { d: string }) {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#35373b] text-[#ababad] transition-colors">
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </button>
  );
}
