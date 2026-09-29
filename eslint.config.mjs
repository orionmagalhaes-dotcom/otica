import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", ".open-next/**", ".wrangler/**", "node_modules/**", "next-env.d.ts", "cloudflare-env.d.ts", "coverage/**", "playwright-report/**", "test-results/**"] },
  ...nextVitals,
  ...nextTypeScript,
  { rules: { "@typescript-eslint/no-explicit-any": "off" } },
];

export default config;
