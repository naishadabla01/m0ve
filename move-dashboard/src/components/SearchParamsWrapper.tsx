"use client";

import { Suspense, ReactNode } from "react";

interface SearchParamsWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function SearchParamsWrapper({ 
  children, 
  fallback 
}: SearchParamsWrapperProps) {
  const defaultFallback = (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-400">Loading...</div>
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}