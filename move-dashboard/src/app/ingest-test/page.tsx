"use client";
import { useState } from "react";
import { sendIngest } from "@/lib/ingest";

export default function IngestTest() {
  const [out, setOut] = useState<string>("");

  const fire = async () => {
    try {
      const res = await sendIngest({
        eventId: "a40daf1b-025b-4f08-b0bf-5871227df044",
        accel: 1.4,
        steps: 0,
      });
      setOut(JSON.stringify(res));
    } catch (e:any) {
      setOut(e.message ?? String(e));
    }
  };

  return (
    <main className="p-6">
      <h1 className="text-xl mb-4">Ingest Test</h1>
      <button onClick={fire} className="px-4 py-2 rounded bg-black text-white">Send Event</button>
      <pre className="mt-4 whitespace-pre-wrap break-all">{out}</pre>
    </main>
  );
}
