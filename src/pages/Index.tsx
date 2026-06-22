import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const DISPLAY = "var(--pb-font-display)";
const BODY = "var(--pb-font-body)";

export default function PasswordGate() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_APP_PASSWORD;
    if (pw === expected) {
      setError("");
      try { sessionStorage.setItem("peekabook_authed", "1"); } catch { /* ignore */ }
      navigate("/chat");
    } else {
      setError("비밀번호가 틀렸습니다");
    }
  };

  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center px-6 relative overflow-hidden animate-fade-in-up"
      style={{
        background: `radial-gradient(ellipse at 0% 0%, rgba(112,224,184,0.55) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 100%, rgba(112,224,184,0.45) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 46%, #ffffff 0%, #fef0b0 25%, #fcc870 55%, #f8a060 80%, #ee7848 100%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0"
        style={{
          width: 200,
          height: 200,
          background:
            "radial-gradient(ellipse at 0% 0%, rgba(254,240,176,0.55) 0%, rgba(252,200,112,0.18) 45%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0"
        style={{
          width: 200,
          height: 200,
          background:
            "radial-gradient(ellipse at 100% 100%, rgba(248,160,96,0.35) 0%, rgba(112,224,184,0.18) 45%, transparent 75%)",
        }}
      />

      <div className="w-full max-w-[600px] flex flex-col items-center text-center relative" style={{ gap: 24 }}>
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "5px",
            color: "var(--pb-coral)",
            opacity: 0.75,
            textTransform: "uppercase",
          }}
        >
          PEEKABOOK
        </div>

        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 56,
            color: "var(--pb-ink)",
            opacity: 0.78,
            letterSpacing: "-1px",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Your reading DNA,
          <br />
          decoded by AI.
        </h1>

        <p style={{ fontFamily: BODY, fontSize: 15, color: "var(--pb-ink)", opacity: 0.42, margin: 0 }}>
          Smarter picks with every page you turn
        </p>

        <form onSubmit={submit} className="w-full flex flex-col items-center" style={{ gap: 24, marginTop: 8 }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="outline-none"
            style={{
              width: 280,
              textAlign: "center",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(61,16,32,0.25)",
              fontFamily: BODY,
              fontSize: 15,
              color: "var(--pb-ink)",
              padding: "10px 0",
            }}
          />

          <button
            type="submit"
            className="transition-opacity"
            style={{
              background: "var(--pb-ink)",
              opacity: 0.78,
              borderRadius: "var(--pb-radius-sm)",
              padding: "14px 48px",
              fontFamily: DISPLAY,
              fontSize: 15,
              color: "var(--pb-cream)",
              border: "none",
              cursor: "pointer",
              boxShadow: "var(--pb-shadow-md)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.78")}
          >
            Enter Now
          </button>

          {error && (
            <p style={{ color: "var(--pb-coral)", fontSize: 13, fontFamily: BODY, margin: 0 }}>{error}</p>
          )}
        </form>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 text-center"
        style={{
          fontFamily: BODY,
          fontSize: 10,
          color: "var(--pb-ink)",
          opacity: 0.3,
          letterSpacing: "3px",
          paddingBottom: 24,
          textTransform: "uppercase",
        }}
      >
        Team Let&apos;s Read!
      </div>
    </div>
  );
}
