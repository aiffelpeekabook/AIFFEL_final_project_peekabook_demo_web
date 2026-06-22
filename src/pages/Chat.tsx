import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

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

const STORAGE_KEY = "peekabook_profile";
const API_URL = "https://ellldy-peekabook-api.hf.space/chat";
const FONT = "var(--pb-font-body)";
const DISPLAY = "var(--pb-font-display)";

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "안녕하세요! 저는 피카북이에요 📚\n어떤 책을 찾고 계신가요? 요즘 관심사나 기분을 편하게 들려주세요.",
};

export default function ChatApp() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("peekabook_authed") !== "1") {
      navigate("/");
    }
  }, [navigate]);

  const [sessions, setSessions] = useState<Session[]>(() => [
    {
      sessionId: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random()),
      threadId: null,
      messages: [INITIAL_GREETING],
    },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingPriorRef = useRef<ProfilePayload | null>(null);
  const firstSendRef = useRef(true);

  const active = sessions[activeIdx];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const readStoredProfile = (): ProfilePayload | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ProfilePayload) : null;
    } catch {
      return null;
    }
  };

  const updateActive = (updater: (s: Session) => Session) => {
    setSessions((prev) => prev.map((s, i) => (i === activeIdx ? updater(s) : s)));
  };

  const sendMessage = async (text: string, priorPayload?: ProfilePayload | null) => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: active.sessionId,
          thread_id: active.threadId,
          prior_profile_payload: priorPayload ?? null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatResponse = await res.json();

      const reply = data.ai_response ?? data.reply ?? data.message ?? data.response ?? "";

      if (data.profile_payload) {
        const up = data.profile_payload.user_profile ?? (data.profile_payload as UserProfile);
        if (up) setProfile(up);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.profile_payload));
        } catch {
          /* ignore */
        }
      }

      updateActive((s) => ({
        ...s,
        sessionId: data.session_id ?? s.sessionId,
        threadId: data.thread_id ?? s.threadId,
        messages: [
          ...s.messages,
          { role: "assistant", content: reply, sessionDoneCta: Boolean(data.session_done) },
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
    let prior = pendingPriorRef.current;
    if (firstSendRef.current && !prior) {
      prior = readStoredProfile();
      firstSendRef.current = false;
    }
    pendingPriorRef.current = null;
    await sendMessage(text, prior);
  };

  const startNewSession = () => {
    const prior = readStoredProfile();
    const newSession: Session = {
      sessionId: crypto.randomUUID(),
      threadId: null,
      messages: [
        {
          role: "assistant",
          content: "새로운 세션을 시작했어요 ✨ 오늘은 어떤 책을 찾아볼까요?",
        },
      ],
    };
    setSessions((prev) => {
      const next = [...prev, newSession];
      setActiveIdx(next.length - 1);
      return next;
    });
    pendingPriorRef.current = prior;
    firstSendRef.current = false;
  };

  const filledCount = SLOTS.filter((s) => isSlotFilled(profile[s.key])).length;

  return (
    <div
      className="relative h-screen w-screen bg-white overflow-hidden animate-fade-in-up"
      style={{ fontFamily: FONT }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0"
        style={{
          width: 280,
          height: 280,
          background:
            "radial-gradient(ellipse at 0% 0%, rgba(254,240,176,0.55) 0%, rgba(252,200,112,0.18) 45%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0"
        style={{
          width: 320,
          height: 320,
          background:
            "radial-gradient(ellipse at 100% 100%, rgba(248,160,96,0.35) 0%, rgba(112,224,184,0.18) 45%, transparent 75%)",
        }}
      />

      <nav
        className="relative z-10 flex items-center gap-3 px-4"
        style={{
          height: 48,
          background: "rgba(255,255,255,0.88)",
          borderBottom: "1px solid #f0ece8",
          fontFamily: FONT,
          boxShadow: "var(--pb-shadow-sm)",
        }}
      >
        <button
          onClick={() => setProfileOpen((v) => !v)}
          style={{
            background: "rgba(61,16,32,0.85)",
            color: "var(--pb-cream)",
            borderRadius: "var(--pb-radius-sm)",
            padding: "6px 14px",
            fontFamily: DISPLAY,
            fontSize: 13,
            boxShadow: "var(--pb-shadow-sm)",
          }}
        >
          ≡  Profile
        </button>

        <div style={{ width: 1, height: 28, background: "#f0e8d0" }} />

        <div className="flex items-center gap-2 overflow-x-auto">
          {sessions.map((s, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={s.sessionId}
                onClick={() => setActiveIdx(i)}
                className="flex items-center gap-2"
                style={{
                  background: isActive ? "var(--pb-warm-1)" : "#f8f4f0",
                  borderRadius: "var(--pb-radius-sm)",
                  padding: "6px 12px",
                  fontFamily: DISPLAY,
                  fontSize: 13,
                  color: isActive ? "var(--pb-amber-deep)" : "#aaa",
                  fontWeight: isActive ? 700 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isActive ? "#8b4a0a" : "#cccccc",
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
              background: "#f0ece8",
              borderRadius: "var(--pb-radius-sm)",
              color: "var(--pb-amber-deep)",
              fontSize: 18,
              lineHeight: 1,
              padding: "2px 12px",
              fontFamily: DISPLAY,
            }}
          >
            +
          </button>
        </div>
      </nav>

      <div
        ref={scrollRef}
        className="relative z-0 overflow-y-auto"
        style={{ height: "calc(100vh - 48px - 48px)", padding: "16px 24px", fontFamily: FONT }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {active?.messages.map((m, i) => (
            <MessageRow
              key={i}
              message={m}
              onNewSession={m.sessionDoneCta ? startNewSession : undefined}
            />
          ))}
          {loading && <TypingIndicator />}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 px-6"
        style={{
          height: 48,
          background: "#fffbf0",
          borderTop: "1px solid #f0e8d0",
          fontFamily: FONT,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
          className="flex-1 outline-none placeholder:opacity-35"
          style={{
            background: "#fef6e0",
            border: "0.8px solid #e8d8b0",
            borderRadius: 12,
            padding: "8px 16px",
            fontFamily: FONT,
            fontSize: 14,
            color: "#3d1020",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="전송"
          className="flex items-center justify-center transition disabled:opacity-40"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--pb-amber-deep)",
            color: "#fef6e0",
            boxShadow: "var(--pb-shadow-sm)",
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>↑</span>
        </button>
      </form>

      <aside
        className="absolute top-[48px] bottom-0 left-0 z-20 transition-transform duration-300"
        style={{
          width: 240,
          background: "rgba(255,255,255,0.96)",
          borderRight: "1px solid #f0ece8",
          transform: profileOpen ? "translateX(0)" : "translateX(-100%)",
          fontFamily: FONT,
          boxShadow: profileOpen ? "var(--pb-shadow-md)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 14,
              color: "var(--pb-ink)",
            }}
          >
            내 독서 프로필
          </h2>
          <button
            onClick={() => setProfileOpen(false)}
            aria-label="닫기"
            style={{ color: "var(--pb-ink)", fontSize: 12 }}
          >
            ✕
          </button>
        </div>

        <div className="px-4 space-y-2">
          {SLOTS.map(({ key, label }) => {
            const text = slotValueText(profile[key]);
            const filled = isSlotFilled(profile[key]);
            return (
              <div
                key={key}
                style={{
                  width: 200,
                  borderRadius: 8,
                  padding: "10px 14px",
                  background: filled ? "rgba(254,240,176,0.8)" : "rgba(248,244,240,0.7)",
                  fontFamily: FONT,
                }}
              >
                <div style={{ fontSize: 10, color: filled ? "rgba(139,74,10,0.7)" : "#bbb" }}>
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: filled ? "#3d1020" : "#ddd",
                    marginTop: 2,
                  }}
                >
                  {filled ? text : "미입력"}
                </div>
              </div>
            );
          })}

          <div className="pt-3">
            <div style={{ fontSize: 10, color: "#8b4a0a", marginBottom: 4 }}>
              프로필 완성도 {filledCount}/5
            </div>
            <div
              style={{
                background: "#f0ece8",
                borderRadius: 2.5,
                height: 5,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#fcc870",
                  height: "100%",
                  width: `${(filledCount / 5) * 100}%`,
                  transition: "width 300ms",
                }}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
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
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2 items-end`}>
      {!isUser && <Avatar letter="P" bg="#c8d8a0" />}
      <div style={{ maxWidth: "60%" }}>
        <div
          style={{
            background: isUser ? "#fde8d0" : "#eaf3d8",
            color: isUser ? "#3a1a08" : "#2a3a1a",
            opacity: 0.85,
            borderRadius: 14,
            padding: "12px 16px",
            fontFamily: FONT,
            fontSize: 14,
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}
        >
          {message.content}
        </div>
        {onNewSession && (
          <button
            onClick={onNewSession}
            className="mt-2 rounded-full px-3 py-1"
            style={{
              background: "var(--pb-warm-1)",
              color: "var(--pb-amber-deep)",
              border: "1px solid var(--pb-warm-2)",
              fontSize: 11,
              fontFamily: DISPLAY,
              boxShadow: "var(--pb-shadow-sm)",
            }}
          >
            새 세션 시작
          </button>
        )}
      </div>
      {isUser && <Avatar letter="U" bg="#f0a060" />}
    </div>
  );
}

function Avatar({ letter, bg }: { letter: string; bg: string }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: bg,
        color: "#ffffff",
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {letter}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start gap-2 items-end">
      <Avatar letter="P" bg="#c8d8a0" />
      <div
        style={{
          background: "#eaf3d8",
          borderRadius: 14,
          padding: "12px 16px",
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
              background: "#2a3a1a",
              opacity: 0.4,
              animation: `peekaBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
        <style>{`@keyframes peekaBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.3 } 40% { transform: translateY(-4px); opacity: 0.9 } }`}</style>
      </div>
    </div>
  );
}
