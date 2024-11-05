"use client";

import { createClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface SupabaseContextType {
  supabase: typeof supabase;
  isConnected: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase,
  isConnected: false,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel("system");

    channel.subscribe((status) => {
      setIsConnected(status === "SUBSCRIBED");
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase, isConnected }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => useContext(SupabaseContext);
