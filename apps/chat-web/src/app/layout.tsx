import './global.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'RelayFlow Chat - Instant Glassmorphic Messenger',
  description: 'Stateless HTTP Gateway and REST boundaries with high fidelity socket communication',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
