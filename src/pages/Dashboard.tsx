import { useEffect, useState } from "react";
import { Link, useNavigate, useRouteLoaderData } from "react-router";
import { Plane, LogOut, Check, Loader2, CreditCard, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthenticatedLoaderData } from "@/router";

// Public HTTP API (API Gateway → Lambda). No AWS credentials live in the browser.
const API_URL = (
  import.meta.env["VITE_FLIGHT_API_URL"] ?? "https://r77h3r4jv7.execute-api.ap-southeast-1.amazonaws.com"
).replace(/\/$/, "");

type PlanName = "tokyo" | "seoul" | "london";

type SubStatus = "pending_payment" | "active" | "cancelled" | "expired";

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
  // M2 — written by save_subscription and the ECPay callbacks.
  // Rows created in M1 have no status at all; we treat those as pending_payment
  // so the user can self-migrate by paying (see M2 Step 7 migration note).
  subscription_status?: SubStatus;
  current_period_end_date?: string;
};

const PLANS: Plan[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 9325 },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 5989 },
  { name: "london", label: "台北 ✈ 倫敦", route: "TPE-LON", hint: 20353 },
];

const twd = (n: number) => `NT$${n.toLocaleString("zh-TW")}`;

const statusOf = (s?: Subscription): SubStatus | undefined =>
  s ? (s.subscription_status ?? "pending_payment") : undefined;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useRouteLoaderData("authenticated") as AuthenticatedLoaderData;
  const email = (user.email ?? "").toLowerCase();

  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("purchase");
    if (p === "success" || p === "failed") setPurchase(p);
  }, []);

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
          選一條航線、設定你的目標價（新台幣）。訂閱為月費 NT$300，付款完成後才會開始通知。
        </p>

        {purchase === "success" && (
          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            付款完成 — 訂閱狀態會在收到綠界的確認後更新，稍等一下再重新整理就會看到「已訂閱」。
          </p>
        )}
        {purchase === "failed" && (
          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            這次付款沒有完成。可以在下面的卡片按「完成付款」再試一次。
          </p>
        )}

        {loadError && (
          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            {loadError}
          </p>
        )}

        <div
          className="animate-fade-up mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
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

function StatusBadge({ status, until }: { status: SubStatus; until?: string | undefined }) {
  const base = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium";
  if (status === "active")
    return (
      <span className={`${base} bg-primary text-primary-foreground`}>
        <Check className="size-3" />
        已訂閱
      </span>
    );
  if (status === "pending_payment")
    return (
      <span className={`${base} border border-border text-muted-foreground`}>
        <CreditCard className="size-3" />
        未完成付款
      </span>
    );
  if (status === "cancelled")
    return (
      <span className={`${base} border border-border text-muted-foreground`}>
        <Clock className="size-3" />
        {until ? `有效至 ${until}` : "已取消"}
      </span>
    );
  return (
    <span className={`${base} border border-border text-muted-foreground`}>
      <XCircle className="size-3" />
      已結束
    </span>
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

  const status = statusOf(subscription);
  // active / cancelled-in-grace are already paid for: changing the target price is an
  // in-place update (JSON). Everything else sends the user to ECPay (HTML form).
  const paid = status === "active" || status === "cancelled";
  const showForm = !subscription || editing;

  // POST /subscribe answers with EITHER an ECPay auto-submit form (text/html) or a
  // JSON in-place update. Calling r.json() unconditionally breaks the HTML case.
  async function submit(price: number) {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, plan_name: plan.name, target_price: Math.round(price) }),
      });
      const ct = r.headers.get("content-type") ?? "";

      if (ct.includes("text/html")) {
        // Hand the browser to ECPay's cashier; the form auto-submits itself.
        const html = await r.text();
        document.open();
        document.write(html);
        document.close();
        return;
      }

      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        route?: string;
        target_price?: number;
        subscription_status?: SubStatus;
      };
      if (!r.ok || !data.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      onSaved({
        ...(subscription as Subscription),
        route: data.route ?? plan.route,
        target_price: data.target_price ?? Math.round(price),
        ...(data.subscription_status ? { subscription_status: data.subscription_status } : {}),
      });
      setEditing(false);
      setValue("");
    } catch {
      setError("儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) {
      setError("請輸入大於 0 的金額");
      return;
    }
    await submit(price);
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
        {status && <StatusBadge status={status} until={subscription?.current_period_end_date} />}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          載入中…
        </div>
      ) : (
        <>
          {subscription && (
            <p className="mt-6 text-sm text-foreground">
              目標價 <span className="text-lg font-semibold">{twd(subscription.target_price)}</span>
            </p>
          )}

          {status === "pending_payment" && !editing && (
            <p className="mt-2 text-xs text-muted-foreground">
              還沒付款，所以不會收到降價通知。完成付款後就會開始追蹤。
            </p>
          )}
          {status === "cancelled" && !editing && (
            <p className="mt-2 text-xs text-muted-foreground">
              已取消自動續訂，本期結束前仍會收到通知。
            </p>
          )}

          {showForm ? (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <label className="text-sm font-medium" htmlFor={`target-${plan.name}`}>
                {subscription ? "新的目標價（TWD）" : "目標價（TWD）"}
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
              {!paid && (
                <p className="text-xs text-muted-foreground">
                  按下後會前往綠界付款頁，月費 NT$300。
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {paid ? "儲存目標價" : subscription ? "前往付款" : "訂閱並付款"}
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
            <div className="mt-6 flex flex-col gap-2">
              {!paid && (
                <button
                  onClick={() => subscription && submit(subscription.target_price)}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {status === "expired" ? "重新訂閱" : "完成付款"}
                </button>
              )}
              <button
                onClick={() => {
                  setValue(String(subscription!.target_price));
                  setEditing(true);
                }}
                className="h-11 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                更新目標價
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
