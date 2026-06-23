import { useState, useEffect, useRef, type FormEvent, type ReactNode, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

type SlotObject = { value?: string; status?: string };
type SlotValue = string | SlotObject | null | undefined;

type UserProfile = {
  reading_goal?: SlotValue;
  preferred_genre?: SlotValue;
  reading_style?: SlotValue;
  difficulty_level?: SlotValue;
  current_context?: SlotValue;
};

type ProfilePayload = {
  user_profile?: UserProfile;
} & UserProfile;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sessionDoneCta?: boolean;
};

type ChatResponse = {
  ai_response?: string;
  reply?: string;
  message?: string;
  response?: string;
  profile_payload?: ProfilePayload;
  session_id?: string;
  thread_id?: string;
  session_done?: boolean;
};

type Session = {
  sessionId: string;
  threadId: string | null;
  messages: ChatMessage[];
  profile: UserProfile;
};

function slotValueText(v: SlotValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") {
    const text = (v as SlotObject).value;
    if (typeof text === "string") return text.trim() || null;
  }
  return null;
}

function isSlotFilled(v: SlotValue): boolean {
  return slotValueText(v) !== null;
}

const SLOTS: { key: keyof UserProfile; label: string }[] = [
  { key: "reading_goal", label: "독서 목표" },
  { key: "preferred_genre", label: "선호 장르" },
  { key: "reading_style", label: "독서 스타일" },
  { key: "difficulty_level", label: "난이도" },
  { key: "current_context", label: "현재 상황" },
];

const API_URL = "https://ellldy-peekabook-api.hf.space/chat";
const BODY = "'DM Sans', sans-serif";
const DISPLAY = "'Playfair Display', serif";

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "안녕하세요! 저는 피카북이에요 📚\n어떤 책을 찾고 계신가요? 요즘 관심사나 기분을 편하게 들려주세요.",
};

function newSession(): Session {
  return {
    sessionId: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random()),
    threadId: null,
    messages: [INITIAL_GREETING],
    profile: {},
  };
}

export default function ChatApp() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("peekabook_authed") !== "1") {
      navigate("/");
    }
  }, [navigate]);

  const [sessions, setSessions] = useState<Session[]>(() => [newSession()]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = sessions[activeIdx];
  const profile = active?.profile ?? {};

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const updateActive = (updater: (s: Session) => Session) => {
    setSessions((prev) => prev.map((s, i) => (i === activeIdx ? updater(s) : s)));
  };

  const sendMessage = async (text: string) => {
    setLoading(true);
    try {
      const userId = sessionStorage.getItem("peekabook_user_id") || "default";
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: active.sessionId,
          user_id: userId,
          thread_id: active.threadId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatResponse = await res.json();

      const reply = data.ai_response ?? data.reply ?? data.message ?? data.response ?? "";

      let nextProfile: UserProfile | null = null;
      if (data.profile_payload) {
        const up = data.profile_payload.user_profile ?? (data.profile_payload as UserProfile);
        if (up) nextProfile = up;
      }

      updateActive((s) => ({
        ...s,
        sessionId: data.session_id ?? s.sessionId,
        threadId: data.thread_id ?? s.threadId,
        profile: nextProfile ?? s.profile,
        messages: [
          ...s.messages,
          {
            role: "assistant",
            content: reply,
            sessionDoneCta: Boolean(data.session_done),
          },
        ],
      }));
    } catch (err) {
      updateActive((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            role: "assistant",
            content: `죄송해요, 응답을 받아오지 못했어요. (${err instanceof Error ? err.message : "오류"})`,
          },
        ],
      }));
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    updateActive((s) => ({ ...s, messages: [...s.messages, { role: "user", content: text }] }));
    await sendMessage(text);
  };

  const startNewSession = () => {
    setSessions((prev) => {
      const next = [...prev, newSession()];
      setActiveIdx(next.length - 1);
      return next;
    });
  };

  const filledCount = SLOTS.filter((s) => isSlotFilled(profile[s.key])).length;

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden animate-fade-in-up"
      style={{ background: "#f7f3ee", fontFamily: BODY }}
    >
      {/* Topbar */}
      <header
        className="flex items-center"
        style={{
          height: 48,
          background: "#1a0f2e",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 16px",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 15,
            fontWeight: 700,
            color: "#eef0ff",
            letterSpacing: "-0.3px",
            marginRight: 8,
          }}
        >
          Peeka
          <span style={{ fontStyle: "italic", fontWeight: 400, color: "#a78bfa" }}>Book</span>
        </div>

        {sessions.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={s.sessionId}
              onClick={() => setActiveIdx(i)}
              className="flex items-center"
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                fontFamily: BODY,
                fontSize: 12,
                fontWeight: 500,
                gap: 6,
                background: isActive ? "rgba(167,139,250,0.22)" : "rgba(255,255,255,0.06)",
                color: isActive ? "#c4b5fd" : "rgba(200,210,255,0.5)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isActive ? "#a78bfa" : "rgba(200,210,255,0.3)",
                  display: "inline-block",
                }}
              />
              Session {i + 1}
            </button>
          );
        })}

        <button
          onClick={startNewSession}
          aria-label="새 세션"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(200,210,255,0.5)",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          +
        </button>

        <button
          onClick={() => setProfileOpen((v) => !v)}
          style={{
            marginLeft: "auto",
            padding: "5px 12px",
            background: profileOpen ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            color: "rgba(200,210,255,0.7)",
            fontFamily: BODY,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          ☰ 독서 프로필
        </button>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Profile panel */}
        <aside
          style={{
            width: profileOpen ? 220 : 0,
            transition: "width 0.25s ease",
            background: "#ffffff",
            borderRight: "1px solid rgba(0,0,0,0.07)",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ width: 220, padding: "20px 16px" }}>
            <div
              className="flex justify-between items-center"
              style={{
                fontFamily: DISPLAY,
                fontSize: 13,
                fontWeight: 700,
                color: "#2d1a4a",
                marginBottom: 16,
              }}
            >
              <span>Session {activeIdx + 1} 독서 프로필</span>
              <button
                onClick={() => setProfileOpen(false)}
                aria-label="닫기"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#f0ece8",
                  border: "none",
                  color: "#888",
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {SLOTS.map(({ key, label }) => {
              const text = slotValueText(profile[key]);
              const filled = !!text;
              return (
                <div
                  key={key}
                  style={{
                    background: "#f7f3ee",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#b0a090",
                      letterSpacing: "0.04em",
                      marginBottom: 3,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: filled ? "#4a3060" : "#c8bfb0",
                      fontWeight: filled ? 500 : 400,
                    }}
                  >
                    {filled ? text : "미입력"}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: "#e05c7a", letterSpacing: "0.03em" }}>
                프로필 완성도 {filledCount}/5
              </div>
              <div
                style={{
                  marginTop: 6,
                  height: 3,
                  background: "#f0ece8",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(90deg, #a78bfa, #e05c7a)",
                    height: "100%",
                    width: `${(filledCount / 5) * 100}%`,
                    borderRadius: 2,
                    transition: "width 300ms",
                  }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Chat area */}
        <section
          className="flex flex-col flex-1 overflow-hidden"
          style={{ background: "#f7f3ee" }}
        >
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto pb-chat-scroll"
            style={{
              padding: "28px 32px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {active?.messages.map((m, i) => {
              const isLast = i === active.messages.length - 1;
              return (
                <MessageRow
                  key={i}
                  message={m}
                  onNewSession={m.sessionDoneCta && isLast ? startNewSession : undefined}
                />
              );
            })}
            {loading && <TypingIndicator />}
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              padding: "14px 32px 18px",
              background: "#f7f3ee",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              flexShrink: 0,
            }}
          >
            <div
              className="flex items-center"
              style={{
                gap: 10,
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 24,
                padding: "10px 14px 10px 18px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="메시지를 입력하세요..."
                disabled={loading}
                className="flex-1 outline-none border-none bg-transparent"
                style={{
                  fontFamily: BODY,
                  fontSize: 13,
                  color: "#2d1a4a",
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="전송"
                className="flex items-center justify-center transition disabled:opacity-40"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed, #e05c7a)",
                  border: "none",
                  color: "#fff",
                  fontSize: 14,
                }}
              >
                ↑
              </button>
            </div>
          </form>
        </section>
      </div>

      <style>{`
        .pb-chat-scroll::-webkit-scrollbar { width: 4px; }
        .pb-chat-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
        input.flex-1::placeholder { color: #c0b4a8; }
      `}</style>
    </div>
  );
}

const INTRO_THRESHOLD = 200;

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node !== null && typeof node === "object" && "props" in node) {
    const el = node as ReactElement;
    return extractText((el.props as { children?: ReactNode }).children);
  }
  return "";
}

function normalizeAuthorList(content: string): string {
  return content.replace(/\[((?:\s*'[^']*'\s*,?\s*)+)\]/g, (match, inner: string) => {
    const items = inner.match(/'([^']*)'/g);
    if (!items) return match;
    return items.map((s) => s.slice(1, -1)).join(", ");
  });
}

function ExpandableParagraph({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const text = extractText(children);

  if (text.length <= INTRO_THRESHOLD) {
    return <p style={{ margin: "4px 0", lineHeight: 1.65 }}>{children}</p>;
  }

  return (
    <p style={{ margin: "4px 0", lineHeight: 1.65 }}>
      {expanded ? text : text.slice(0, INTRO_THRESHOLD) + "..."}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginLeft: 6,
          color: "#a78bfa",
          fontSize: 12,
          fontWeight: 600,
          background: "none",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline",
          padding: 0,
        }}
      >
        {expanded ? "접기" : "펼쳐보기"}
      </button>
    </p>
  );
}

function MessageRow({
  message,
  onNewSession,
}: {
  message: ChatMessage;
  onNewSession?: () => void;
}) {
  const isUser = message.role === "user";
  const isRecommendation = !isUser && message.content.includes("📚");
  const normalized = isRecommendation ? normalizeAuthorList(message.content) : message.content;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        className="flex items-start"
        style={{ gap: 10, flexDirection: isUser ? "row-reverse" : "row" }}
      >
        <Avatar
          letter={isUser ? "나" : "P"}
          bg={isUser ? "#e05c7a" : "#1a0f2e"}
          color={isUser ? "#fff" : "#a78bfa"}
        />
        <div
          style={{
            maxWidth: isRecommendation ? "80%" : "68%",
            padding: "12px 16px",
            fontFamily: BODY,
            fontSize: 13,
            lineHeight: 1.65,
            whiteSpace: isRecommendation ? "normal" : "pre-wrap",
            background: isUser ? "#2d1a4a" : "#ffffff",
            color: isUser ? "#eef0ff" : "#2d1a4a",
            borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {isRecommendation ? (
            <ReactMarkdown
              components={{
                img: ({ src, alt }) => (
                  <img
                    src={typeof src === "string" ? src : undefined}
                    alt={alt}
                    style={{
                      height: 320,
                      width: "auto",
                      borderRadius: 8,
                      display: "block",
                      margin: "10px 0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                ),
                hr: () => (
                  <hr style={{ border: "none", borderTop: "1px solid #e8e0d0", margin: "16px 0" }} />
                ),
                ul: ({ children }) => (
                  <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>{children}</ul>
                ),
                li: ({ children }) => (
                  <li style={{ fontSize: 12, color: "#666666", lineHeight: 1.7, margin: "2px 0" }}>
                    {children}
                  </li>
                ),
                p: ({ children }) => {
                  const text = extractText(children);
                  if (text.startsWith("📚")) {
                    return (
                      <p
                        style={{
                          fontFamily: DISPLAY,
                          fontSize: 16,
                          fontWeight: 700,
                          margin: "4px 0 8px",
                          color: "#2d1a4a",
                        }}
                      >
                        {children}
                      </p>
                    );
                  }
                  if (
                    (text.startsWith("📖") || text.startsWith("✏️")) &&
                    text.length < 25
                  ) {
                    return (
                      <p
                        style={{
                          fontFamily: DISPLAY,
                          fontSize: 14,
                          fontWeight: 700,
                          margin: "12px 0 4px",
                          color: "#4a3060",
                        }}
                      >
                        {children}
                      </p>
                    );
                  }
                  if (text.startsWith("📍") && text.length < 25) {
                    return (
                      <p
                        style={{
                          fontFamily: DISPLAY,
                          fontSize: 14,
                          fontWeight: 700,
                          margin: "12px 0 4px",
                          color: "#8b4a0a",
                        }}
                      >
                        {children}
                      </p>
                    );
                  }
                  return <ExpandableParagraph>{children}</ExpandableParagraph>;
                },
                strong: ({ children }) => (
                  <strong style={{ color: "#3d1020", fontWeight: 700 }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: "#8b4a0a", fontStyle: "italic" }}>{children}</em>
                ),
              }}
            >
              {normalized}
            </ReactMarkdown>
          ) : (
            <span>{message.content}</span>
          )}
        </div>
      </div>
      {onNewSession && (
        <button
          onClick={onNewSession}
          style={{
            alignSelf: "flex-start",
            marginLeft: 42,
            marginTop: 8,
            background: "rgba(167,139,250,0.15)",
            color: "#a78bfa",
            border: "1px solid rgba(167,139,250,0.3)",
            borderRadius: 20,
            padding: "5px 14px",
            fontFamily: BODY,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          새 세션 시작
        </button>
      )}
    </div>
  );
}

function Avatar({ letter, bg, color }: { letter: string; bg: string; color: string }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: bg,
        color,
        fontFamily: BODY,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {letter}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start" style={{ gap: 10 }}>
      <Avatar letter="P" bg="#1a0f2e" color="#a78bfa" />
      <div
        style={{
          background: "#ffffff",
          borderRadius: "4px 16px 16px 16px",
          padding: "12px 16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
        className="flex gap-1"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "#a78bfa",
              opacity: 0.5,
              animation: `peekaBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
        <style>{`@keyframes peekaBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.3 } 40% { transform: translateY(-4px); opacity: 0.9 } }`}</style>
      </div>
    </div>
  );
}
