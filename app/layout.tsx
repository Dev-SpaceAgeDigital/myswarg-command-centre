import type { Metadata } from 'next';
import { Inter, Lexend } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MySwarg Command Centre',
  description: 'Society management platform administration',
  icons: { icon: '/brand/mark.png', apple: '/brand/apple-icon.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${lexend.variable}`}>
      <body className="min-h-full antialiased font-sans">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors toastOptions={{ style: { borderRadius: 14 } }} />
        </AuthProvider>
      </body>
    </html>
  );
}
