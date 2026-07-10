/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "chokidar", "simple-git"],
  eslint: {
    dirs: ["src", "scripts", "tests/unit"],
  },
  // Dev-only Next.js indicator floats bottom-left by default and covered the
  // sidebar "折叠" button. Move it to the bottom-right. (Only shows in `pnpm dev`;
  // never in production builds.) To hide it entirely, set `devIndicators: false`.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
