// app/+not-found.tsx
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    (async () => {
      // Get the URL that launched the app/screen
      const url = await Linking.getInitialURL();
      // Try to extract ?code=XXXX from the URL (works for http://..., move://..., exp://...)
      const parsed = url ? Linking.parse(url) : null;
      const code = (parsed?.queryParams?.code as string | undefined) || "";

      if (code) {
        router.replace({ pathname: "/scan", params: { code } });
      } else {
        router.replace("/scan");
      }
    })();
  }, []);

  // Render nothing; we immediately redirect
  return null;
}
