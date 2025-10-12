"use client";

import { useFormStatus } from "react-dom";
import Spinner from "@/components/Spinner";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2 font-medium text-black hover:bg-green-400 disabled:opacity-60"
    >
      {pending && <Spinner />} <span>Sign up</span>
    </button>
  );
}
