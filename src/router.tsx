import { createBrowserRouter, Navigate, Outlet, redirect } from "react-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import LandingPage from "./pages/Landing";
import AuthPage from "./pages/Auth";
import DashboardPage from "./pages/Dashboard";
import { ErrorPage, NotFoundPage } from "./pages/Errors";

export type AuthenticatedLoaderData = { user: User };

// Client-side auth guard: runs before any /app route renders.
async function requireUser(): Promise<AuthenticatedLoaderData> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect("/sign-in");
  return { user: data.user };
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: <div className="min-h-screen bg-background" />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "sign-in", element: <AuthPage mode="sign-in" /> },
      { path: "sign-up", element: <AuthPage mode="sign-up" /> },
      // Legacy URL from the TanStack version.
      { path: "auth", element: <Navigate to="/sign-in" replace /> },
      {
        id: "authenticated",
        loader: requireUser,
        element: <Outlet />,
        children: [{ path: "app", element: <DashboardPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
