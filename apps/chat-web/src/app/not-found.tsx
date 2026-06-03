'use client';

import Link from 'next/link';
import React from 'react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[#070a13] text-[#f8fafc] font-sans">
      <h2 className="text-3xl font-bold">404</h2>
      <p className="text-[var(--text-muted)] text-[15px]">The requested workspace route does not exist.</p>
      <Link href="/" className="text-[var(--accent-primary)] no-underline font-semibold border border-[var(--accent-ring)] px-5 py-2.5 rounded-lg bg-[var(--theme-btn)] transition-all duration-200 hover:bg-[var(--theme-btn-hover)]">
        Return Home
      </Link>
    </div>
  );
}
