/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "1";
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC" },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  ...(isPages ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
  webpack(config) {
    // необязательные платёжные модули Coinbase (x402) нам не нужны — заменяем заглушками
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core": false,
      "@x402/evm": false,
      "@x402/svm": false,
    };
    return config;
  },
};
export default nextConfig;
