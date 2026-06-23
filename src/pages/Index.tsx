import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const DISPLAY = '"Playfair Display", serif';
const SANS = '"DM Sans", system-ui, sans-serif';

type BookPlanet = {
  title: string;
  gradient: string;
  width: number;
  height: number;
  orbit: 1 | 2 | 3;
  angle: number;
};

const BOOKS: BookPlanet[] = [
  { title: "여행", gradient: "linear-gradient(135deg, #4c1d95, #7c3aed)", width: 46, height: 64, orbit: 1, angle: Math.PI * 0.18 },
  { title: "모순", gradient: "linear-gradient(135deg, #9d174d, #db2777)", width: 44, height: 60, orbit: 1, angle: Math.PI * 1.75 },
  { title: "고래", gradient: "linear-gradient(135deg, #064e3b, #059669)", width: 32, height: 46, orbit: 2, angle: Math.PI * 1.35 },
  { title: "장미", gradient: "linear-gradient(135deg, #7c2d12, #ea580c)", width: 40, height: 56, orbit: 3, angle: Math.PI * 0.85 },
  { title: "파도", gradient: "linear-gradient(135deg, #1e3a5f, #4f46e5)", width: 38, height: 54, orbit: 3, angle: Math.PI * 1.60 },
];

export default function PasswordGate() {
  const [pw, setPw] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.w, size.h);
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * size.w;
      const y = Math.random() * size.h;
      const r = 0.15 + Math.random() * 0.9;
      const a = 0.1 + Math.random() * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210, 225, 255, ${a})`;
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * size.w;
      const y = Math.random() * size.h;
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(235, 245, 255, 0.95)";
      ctx.fill();
    }
  }, [size]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_APP_PASSWORD;
    if (!userId.trim()) {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (pw === expected) {
      setError(false);
      try {
        sessionStorage.setItem("peekabook_authed", "1");
        sessionStorage.setItem("peekabook_user_id", userId.trim());
      } catch { /* ignore */ }
      navigate("/chat");
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 450);
    }
  };

  const cx = size.w / 2;
  const cy = size.h / 2;
  const orbits = [
    { rx: size.w * 0.46, ry: size.h * 0.09, op: 0.13, sw: 0.8 },
    { rx: size.w * 0.42, ry: size.h * 0.16, op: 0.10, sw: 0.7 },
    { rx: size.w * 0.48, ry: size.h * 0.23, op: 0.07, sw: 0.6 },
  ];

  return (
    <div
      className="h-screen w-full relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 30% 40%, #1e1458 0%, #0d0b2e 50%, #060518 100%)",
      }}
    >
      <style>{`
        @keyframes pb-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.65); opacity: 0.4; } }
        @keyframes pb-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .pb-pulse-dot { animation: pb-pulse 2s ease-in-out infinite; }
        .pb-shake { animation: pb-shake 0.45s ease-in-out; }
        .pb-input::placeholder { color: rgba(200,210,255,0.28); }
        .pb-input:focus { border-bottom-color: rgba(167,139,250,0.6) !important; }
        .pb-submit:hover { background: rgba(255,255,255,0.16) !important; }
      `}</style>

      {/* Nebula layers */}
      <div
        style={{
          position: "absolute", top: -40, left: -60, width: 380, height: 280,
          background: "radial-gradient(ellipse, rgba(120,80,255,0.15), transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute", bottom: -60, right: -40, width: 340, height: 260,
          background: "radial-gradient(ellipse, rgba(255,80,160,0.08), transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* Star field */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
      />

      {/* Orbit rings */}
      {size.w > 0 && (
        <svg
          style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}
          width={size.w}
          height={size.h}
        >
          {orbits.map((o, i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={o.rx}
              ry={o.ry}
              fill="none"
              stroke={`rgba(255,255,255,${o.op})`}
              strokeWidth={o.sw}
            />
          ))}
        </svg>
      )}

      {/* Book planets */}
      {size.w > 0 && BOOKS.map((b, i) => {
        const o = orbits[b.orbit - 1];
        const x = cx + o.rx * Math.cos(b.angle);
        const y = cy + o.ry * Math.sin(b.angle);
        const s = Math.sin(b.angle);
        const scale = 0.7 + ((s + 1) / 2) * 0.4;
        const opacity = 0.5 + ((s + 1) / 2) * 0.5;
        const rot = (Math.random() * 8 - 4);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: b.width,
              height: b.height,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`,
              background: b.gradient,
              borderRadius: 5,
              opacity,
              boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: 6,
                background: "rgba(0,0,0,0.25)",
                borderRadius: 5,
              }}
            />
            <div
              style={{
                fontFamily: SANS,
                fontSize: 9,
                fontWeight: 500,
                color: "rgba(255,255,255,0.95)",
                textAlign: "center",
                paddingLeft: 4,
              }}
            >
              {b.title}
            </div>
          </div>
        );
      })}

      {/* Center content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
        style={{ zIndex: 5 }}
      >
        {/* Badge */}
        <div
          style={{
            background: "rgba(167,139,250,0.13)",
            border: "1px solid rgba(167,139,250,0.28)",
            borderRadius: 20,
            padding: "6px 16px",
            fontFamily: SANS,
            fontSize: 11,
            color: "#c4b5fd",
            letterSpacing: "0.05em",
            marginBottom: 22,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            className="pb-pulse-dot"
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }}
          />
          AI 기반 대화형 도서 추천
        </div>

        {/* Brand */}
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 76,
            fontWeight: 900,
            letterSpacing: "-2.5px",
            whiteSpace: "nowrap",
            textShadow: "0 0 80px rgba(140,100,255,0.35)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          <span style={{ color: "#eef0ff" }}>Peeka</span>
          <span
            style={{
              fontStyle: "italic",
              fontWeight: 700,
              backgroundImage: "linear-gradient(90deg, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Book
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: "0.03em",
            lineHeight: 1.9,
            marginTop: 18,
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          <div style={{ color: "rgba(200,210,255,0.55)" }}>
            대화할수록 넓어지는 나만의 책 우주.
          </div>
          <div>
            <span style={{ color: "rgba(200,210,255,0.6)" }}>당신의 독서 </span>
            <span
              style={{
                fontStyle: "italic",
                backgroundImage: "linear-gradient(90deg, #a78bfa, #f472b6)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              DNA
            </span>
            <span style={{ color: "rgba(200,210,255,0.6)" }}>를 </span>
            <span style={{ fontStyle: "italic", color: "#7dd3fc" }}>해독</span>
            <span style={{ color: "rgba(200,210,255,0.6)" }}>합니다.</span>
          </div>
        </div>

        <form onSubmit={submit} className={shake ? "pb-shake" : ""} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <input
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setError(false); }}
            placeholder="ID"
            autoFocus
            className="pb-input outline-none"
            style={{
              width: 264,
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${error ? "rgba(244,114,182,0.7)" : "rgba(180,160,255,0.25)"}`,
              borderRadius: 0,
              padding: "10px 4px",
              fontFamily: SANS,
              fontSize: 14,
              color: "#e8eeff",
              textAlign: "center",
              letterSpacing: "0.06em",
              marginBottom: 14,
              transition: "border-color 0.2s",
            }}
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(false); }}
            placeholder="Password"
            className="pb-input outline-none"
            style={{
              width: 264,
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${error ? "rgba(244,114,182,0.7)" : "rgba(180,160,255,0.25)"}`,
              borderRadius: 0,
              padding: "10px 4px",
              fontFamily: SANS,
              fontSize: 14,
              color: "#e8eeff",
              textAlign: "center",
              letterSpacing: "0.06em",
              marginBottom: 14,
              transition: "border-color 0.2s",
            }}
          />
          <button
            type="submit"
            className="pb-submit"
            style={{
              width: 264,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              borderRadius: 8,
              padding: "13px 0",
              color: "rgba(235,240,255,0.85)",
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            입장하기
          </button>
        </form>
      </div>

      {/* Bottom tag */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "rgba(200,210,255,0.22)",
          zIndex: 5,
        }}
      >
        By 책책책 책을 읽읍시다
      </div>
    </div>
  );
}
