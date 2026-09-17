import { useEffect, useState } from "react";
import { Link, useNavigate, useRouteLoaderData } from "react-router";
import { Plane, LogOut, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthenticatedLoaderData } from "@/router";

// Public HTTP API (API Gateway → Lambda). No AWS credentials live in the browser.
const API_URL = (
  import.meta.env["VITE_FLIGHT_API_URL"] ?? "https://r77h3r4jv7.execute-api.ap-southeast-1.amazonaws.com"
).replace(/\/$/, "");

type PlanName = "tokyo" | "seoul";

type Plan = {
  name: PlanName;
  label: string;
  route: string;
  hint: number;
};

type Subscription = {
  email: string;
  route: string;
  plan_name: PlanName;
  target_price: number;
  currency: "TWD";
  updated_at: string;
};

const PLANS: Plan[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 9325 },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 5989 },
];

const twd = (n: number) => `NT$${n.toLocaleString("zh-TW")}`;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useRouteLoaderData("authenticated") as AuthenticatedLoaderData;
  const email = (user.email ?? "").toLowerCase();

  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    fetch(`${API_URL}/subscriptions?email=${encodeURIComponent(email)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ subscriptions: Subscription[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setSubs(Object.fromEntries(data.subscriptions.map((s) => [s.route, s])));
      })
      .catch(() => !cancelled && setLoadError("無法載入你的訂閱，請稍後重新整理。"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [email]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <title>Dashboard — Flight Price Notifier</title>
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Plane className="size-5 text-primary" />
            <span>Flight Price Notifier</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" />
            Sign Out 登出
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:px-6">
        <h1 className="animate-fade-up text-2xl font-bold tracking-tight sm:text-3xl">
          Hi {user.email}
        </h1>
        <p className="animate-fade-up mt-2 text-sm text-muted-foreground">
          選一條航線、設定你的目標價（新台幣）。票價低於目標時，我們會寄 email 通知你。
        </p>

        {loadError && (
          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            {loadError}
          </p>
        )}

        <div
          className="animate-fade-up mt-8 grid gap-6 sm:grid-cols-2"
          style={{ animationDelay: "120ms" }}
        >
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              email={email}
              loading={loading}
              subscription={subs[plan.route]}
              onSaved={(s) => setSubs((prev) => ({ ...prev, [s.route]: s }))}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function PlanCard({
  plan,
  email,
  loading,
  subscription,
  onSaved,
}: {
  plan: Plan;
  email: string;
  loading: boolean;
  subscription?: Subscription | undefined;
  onSaved: (s: Subscription) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribed = Boolean(subscription);
  const showForm = !subscribed || editing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) {
      setError("請輸入大於 0 的金額");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, plan_name: plan.name, target_price: Math.round(price) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.subscription) throw new Error(data.error ?? `HTTP ${r.status}`);
      onSaved(data.subscription as Subscription);
      setEditing(false);
      setValue("");
    } catch {
      setError("儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{plan.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.route} · 參考最低價約 {twd(plan.hint)}
          </p>
        </div>
        {subscribed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            <Check className="size-3" />
            已訂閱
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          載入中…
        </div>
      ) : (
        <>
          {subscribed && (
            <p className="mt-6 text-sm text-foreground">
              目標價 <span className="text-lg font-semibold">{twd(subscription!.target_price)}</span>
            </p>
          )}

          {showForm ? (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <label className="text-sm font-medium" htmlFor={`target-${plan.name}`}>
                {subscribed ? "新的目標價（TWD）" : "目標價（TWD）"}
              </label>
              <input
                id={`target-${plan.name}`}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                placeholder={`例如 ${plan.hint + 700}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-11 rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {subscribed ? "儲存目標價" : "開始追蹤"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setError(null);
                    }}
                    className="h-11 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setValue(String(subscription!.target_price));
                setEditing(true);
              }}
              className="mt-6 h-11 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              更新目標價
            </button>
          )}
        </>
      )}
    </div>
  );
}
