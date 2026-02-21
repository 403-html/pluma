import type { Metadata } from 'next';
import './globals.css';
import { getMessages } from '@/i18n';

const t = getMessages();

export const metadata: Metadata = {
  title: t.metadata.title,
  description: t.metadata.description,
};

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
