import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Resolve the monorepo root (two levels up from apps/web)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../../');

// Load .env.local from the monorepo root so DATABASE_URL and other
// shared secrets are available both during `next dev` and `next build`.
// Next.js auto-loads .env.local only from the app directory, so we
// explicitly load from the monorepo root here.
config({ path: path.join(monorepoRoot, '.env.local') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
