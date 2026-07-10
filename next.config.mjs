/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "chokidar", "simple-git"],
  eslint: {
    dirs: ["src", "scripts", "tests/unit"],
  },
};

export default nextConfig;
