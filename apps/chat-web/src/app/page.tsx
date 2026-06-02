'use client';

import dynamic from 'next/dynamic';

// Dynamically import the client-only dashboard (fully disabling server side rendering)
const ChatDashboardClient = dynamic(
  () => import('./ChatDashboard'),
  { ssr: false }
);

export default function Page() {
  return <ChatDashboardClient />;
}
