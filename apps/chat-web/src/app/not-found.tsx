'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      gap: '16px', 
      background: '#070a13', 
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ fontSize: '32px', fontWeight: '700' }}>404</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>The requested workspace route does not exist.</p>
      <Link href="/" style={{ 
        color: 'var(--accent-primary)', 
        textDecoration: 'none',
        fontWeight: '600',
        border: '1px solid var(--accent-ring)',
        padding: '10px 20px',
        borderRadius: '8px',
        background: 'var(--theme-btn)',
        transition: 'all 0.2s ease'
      }}>
        Return Home
      </Link>
    </div>
  );
}
