import type { Metadata } from 'next';
import './globals.css';
import { getMessages } from '@/i18n';

export function generateMetadata(): Metadata {
  const t = getMessages();
  return {
    title: t.metadata.title,
    description: t.metadata.description,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
