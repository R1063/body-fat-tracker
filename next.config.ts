import type { NextConfig } from "next";

// GitHub Actions 上のビルドは GitHub Pages 向け。
// 公開先が https://<user>.github.io/body-fat-tracker/ になるため basePath が必要。
const onGitHubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: onGitHubActions ? "/body-fat-tracker" : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
