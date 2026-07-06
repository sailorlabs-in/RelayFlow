import './global.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PWARegister } from '../components/PWARegister';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'RelayFlow — Real-Time Messenger',
  description:
    'Ultra-fast real-time messaging powered by NestJS WebSocket Gateway and Next.js 15.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Google Fonts — loaded here to avoid CSS @import ordering conflicts with Tailwind v4 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Inline script runs before paint to avoid FOUC on theme restore */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('rf-theme') || 'system';
                document.documentElement.setAttribute('data-theme', t);
                var s = localStorage.getItem('rf-theme-schema') || 'arctic_glass';
                document.documentElement.setAttribute('data-theme-schema', s);
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-sans">
        <PWARegister />
        {children}
        <ToastContainer
          position="top-right"
          autoClose={7000}
          hideProgressBar={false}
        />
      </body>
    </html>
  );
}
