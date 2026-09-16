import { Link, useNavigate, useRouteLoaderData } from "react-router";
import { Plane, LogOut, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthenticatedLoaderData } from "@/router";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useRouteLoaderData("authenticated") as AuthenticatedLoaderData;

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

        <div
          className="animate-fade-up mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent">
            <Compass className="size-7 text-primary" />
          </div>
          <p className="mt-6 max-w-md text-lg font-medium text-foreground">
            你的航線追蹤儀表板即將上線
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            下一個里程碑會加上訂閱航線的功能。
          </p>
          <p className="mt-4 max-w-md text-xs text-muted-foreground">
            Your dashboard is coming soon. Route-subscription will be added in the next milestone.
          </p>
        </div>
      </main>
    </div>
  );
}
