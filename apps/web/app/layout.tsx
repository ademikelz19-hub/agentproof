import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'AgentProof — Reliability & Reputation Infrastructure for Onchain Agents',
  description: 'Continuous, independent reachability, latency, and reputation integrity evidence for autonomous agents on BNB Chain.',
  keywords: 'AgentProof, BNB Chain, ERC-8004, AI Agents, Autonomous Agents, Web3 Reliability, Smart Contracts, Decentralized AI',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  themeColor: '#060911',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
