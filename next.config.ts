import type { NextConfig } from "next";

const repoName = "Comparison-tool";
const isGithubPages = process.env.GITHUB_PAGES === "true";
/**
 * Custom domain (schoolcompass.uk) is served at the site root.
 * Opt into the legacy project-pages path with GITHUB_PAGES_PROJECT_PATH=true
 * if you need https://user.github.io/Comparison-tool/ without a CNAME.
 */
const useProjectPath =
  isGithubPages && process.env.GITHUB_PAGES_PROJECT_PATH === "true";
const basePath = useProjectPath ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(useProjectPath
    ? {
        basePath,
        assetPrefix: `${basePath}/`,
      }
    : {}),
};

export default nextConfig;
