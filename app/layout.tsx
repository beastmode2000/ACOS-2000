import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ACOS 2000', description: 'Estate operations system for 2000' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
