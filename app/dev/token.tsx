// app/dev/token.tsx
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, ScrollView, Text, View } from "react-native";
import { supabase } from "../../src/lib/supabase";

type Session = import("@supabase/supabase-js").Session | null;

export default function DevTokenPage() {
  const [session, setSession] = useState<Session>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);

  const calcExpiresIn = (sess: Session) => {
    if (!sess?.expires_at) return null;
    return Math.max(0, sess.expires_at - Math.floor(Date.now() / 1000));
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session ?? null);
    setExpiresIn(calcExpiresIn(data.session ?? null));
  };

  useEffect(() => {
    // initial load
    refresh();

    // keep UI in sync if session changes (sign in/out, refresh, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setExpiresIn(calcExpiresIn(sess));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const bearer =
    session?.access_token
      ? `Bearer ${session.access_token}`
      : "(no session — sign in on the Home tab first)";

  const copyHeader = async () => {
    setCopying(true);
    await Clipboard.setStringAsync(bearer);
    setCopying(false);
    Alert.alert("Copied", "Authorization header copied to clipboard.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setExpiresIn(null);
    Alert.alert("Signed out", "Local session cleared.");
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Test token</Text>

      <View
        style={{
          backgroundColor: "#0B1220",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <Text selectable style={{ color: "#9BB0C2" }}>
          {JSON.stringify(
            {
              userId: session?.user?.id ?? null,
              expiresIn,
            },
            null,
            2
          )}
        </Text>
      </View>

      <Text>Use this in Authorization header:</Text>

      <View
        style={{
          backgroundColor: "#121821",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <Text selectable style={{ color: session ? "#8af18a" : "#8af18a" }}>
          {bearer}
        </Text>
      </View>

      <Button
        title={copying ? "Copying…" : "Copy header"}
        onPress={copyHeader}
        disabled={!session || copying}
      />

      <Button title="Refresh" onPress={refresh} />

      {session ? (
        <Button title="Sign out (clear session)" onPress={signOut} />
      ) : null}

      <Button title="Go to Home" onPress={() => router.replace("/")} />
    </ScrollView>
  );
}
