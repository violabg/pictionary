// src/contexts/SupabaseProvider.tsx
"use client";
import { supabase } from "@/lib/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

interface SupabaseContextType {
  channel: RealtimeChannel | null;
  isConnected: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({
  channel: null,
  isConnected: false,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel("drawing_room");

    channel
      .on("presence", { event: "sync" }, () => {
        setIsConnected(true);
      })
      .subscribe();

    setChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ channel, isConnected }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => useContext(SupabaseContext);
