import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Plane, Radar, BellRing, CalendarX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const features = [
  {
    icon: Radar,
    title: "盯緊熱門航線",
    subtitle: "Always-on route watching",
    body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。",
  },
  {
    icon: BellRing,
    title: "達標自動通知",
    subtitle: "Target-price email alerts",
    body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。",
  },
  {
    icon: CalendarX,
    title: "隨時取消",
    subtitle: "Cancel anytime",
    body: "月訂閱制，不想用隨時停，沒有綁約。",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));

    // Fade-in on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <title>Flight Price Notifier — 機票降價通知</title>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Plane className="size-5 text-primary" />
            <span>Flight Price Notifier</span>
          </Link>
          <button
            onClick={() => navigate(signedIn ? "/app" : "/sign-in")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-glow transition-colors hover:bg-primary/90"
          >
            {signedIn ? "前往儀表板" : "Sign in / 登入"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-glow">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28">
          <p className="animate-fade-up text-sm font-medium tracking-widest text-primary uppercase">
            機票降價通知
          </p>
          <h1
            className="animate-fade-up mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Flight Price Notifier
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-xl text-foreground/90 sm:text-2xl"
            style={{ animationDelay: "160ms" }}
          >
            設定航線與目標價，機票降價就通知你
          </p>
          <p
            className="animate-fade-up mx-auto mt-3 max-w-xl text-base text-muted-foreground"
            style={{ animationDelay: "220ms" }}
          >
            Set a route and a target price — we email you when the fare drops.
          </p>
          <div className="animate-fade-up mt-10" style={{ animationDelay: "300ms" }}>
            <button
              onClick={() => navigate(signedIn ? "/app" : "/sign-in")}
              className="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-xl shadow-glow transition-all hover:bg-primary/90 hover:shadow-glow"
            >
              {signedIn ? "前往儀表板" : "Sign in / 登入"}
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="reveal rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent">
                  <f.icon className="size-5 text-primary" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">
                  {f.title}
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    {f.subtitle}
                  </span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
          <p className="text-sm text-muted-foreground">© 2026 Flight Price Notifier</p>
        </div>
      </footer>
    </div>
  );
}
