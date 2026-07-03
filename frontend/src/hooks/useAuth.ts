import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../stores/authStore";
import type { Profile } from "../types/database.types";

/**
 * Bootstraps the auth session on mount and keeps it in sync via
 * onAuthStateChange. Also fetches the caller's own profile row —
 * RLS's "profiles_select_self_or_admin" policy guarantees this can
 * only ever be their own row (or all rows if they're an admin), never
 * another employee's data.
 */
export function useAuth() {
  const { session, profile, loading, setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    }

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!mounted) return;
      if (error) {
        // Row not found or account disabled — is_active_user() may
        // still allow reading own profile, but treat any fetch
        // failure as "cannot proceed" for safety.
        setProfile(null);
        return;
      }
      setProfile(data as Profile);
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (event === "SIGNED_IN" && newSession?.user) {
        await loadProfile(newSession.user.id);
        await supabase.rpc("record_login_event", {
          p_user_id: newSession.user.id,
          p_event_type: "login_success",
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
        });
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }

      if (event === "TOKEN_REFRESHED" && newSession?.user) {
        await loadProfile(newSession.user.id);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Best-effort failed-login logging; do not block the error surface on this.
      const { data: userLookup } = await supabase.auth.getUser();
      if (userLookup?.user) {
        await supabase.rpc("record_login_event", {
          p_user_id: userLookup.user.id,
          p_event_type: "login_failed",
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
        });
      }
      throw error;
    }
  }

  async function signOut() {
    const userId = session?.user?.id;
    if (userId) {
      await supabase.rpc("record_login_event", {
        p_user_id: userId,
        p_event_type: "logout",
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
      });
    }
    await supabase.auth.signOut();
  }

  return {
    session,
    profile,
    loading,
    isAuthenticated: Boolean(session),
    isAdmin: profile?.role === "admin",
    isActive: profile?.is_active ?? false,
    signIn,
    signOut,
  };
}
