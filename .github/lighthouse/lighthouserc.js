/** @type {import('@lhci/cli').LighthouseConfig} */
module.exports = {
  ci: {
    collect: {
      // Serve the pre-built Vite frontend — run `npm run build` before LHCI
      // Exclude stats.html — it is the Rollup bundle visualiser output, not an app page.
      staticDistDir: "./dist",
      url: ["http://localhost/index.html"],
      numberOfRuns: 3,   // Average over 3 runs for stable scores
      settings: {
        // Simulate a typical mobile connection (Fast 3G)
        // Matches Lighthouse's "mobile" preset for realistic CWV scores
        throttlingMethod: "simulate",
        formFactor: "desktop",    // Desktop for SPA; change to 'mobile' for PWA audit
        screenEmulation: { disabled: true },
      },
    },

    assert: {
      preset: "lighthouse:no-pwa", // No PWA checks required
      assertions: {
        // ── Minimum score thresholds ──────────────────────────────────────
        "categories:performance":    ["error", { minScore: 0.9 }],
        "categories:accessibility":  ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo":            ["warn",  { minScore: 0.8 }],

        // ── Core Web Vitals (numeric budgets) ─────────────────────────────
        // LCP  — Largest Contentful Paint
        "largest-contentful-paint":  ["error", { maxNumericValue: 2500 }],
        // FCP  — First Contentful Paint (relaxed to 2500ms to handle CI variance)
        "first-contentful-paint":    ["error", { maxNumericValue: 2500 }],
        // TBT  — Total Blocking Time (proxy for FID/INP in lab)
        "total-blocking-time":       ["error", { maxNumericValue: 200 }],
        // CLS  — Cumulative Layout Shift
        "cumulative-layout-shift":   ["error", { maxNumericValue: 0.1 }],
        // SI   — Speed Index
        "speed-index":               ["warn",  { maxNumericValue: 3400 }],

        // ── Best practice checks ──────────────────────────────────────────
        "uses-https":                     ["off"],  // not relevant in preview
        "uses-http2":                     ["warn"],
        "render-blocking-resources":      ["warn"],
        "unused-javascript":              ["warn", { maxLength: 1 }],
        "uses-optimized-images":          ["warn"],
        // Responsive images: warn only — Logo.png is served from public/ without resize
        "uses-responsive-images":         ["warn", { maxLength: 1 }],
        // Modern formats: warn only (PNG logo in public/)
        "modern-image-formats":           ["warn", { maxLength: 1 }],
        // Legacy JS: warn only (Sentry polyfills inject legacy transforms)
        "legacy-javascript":              ["warn", { maxLength: 1 }],

        // ── Audits that never return a numeric score — use correct assertion ──
        // These audits return informational/opportunity items, not a 0-1 score.
        // minScore on them always evaluates to NaN which causes spurious failures.
        "lcp-lazy-loaded":             ["warn"],  // informational only
        "non-composited-animations":   ["warn"],  // informational only
        "prioritize-lcp-image":        ["warn"],  // informational only

        // ── Disable checks inapplicable to static SPA preview ─────────────
        // Backend API calls fail in static preview → console errors expected
        "errors-in-console":           ["warn"],
        // Source maps intentionally stripped from production builds
        "valid-source-maps":           ["off"],
        // Vite minifies JS; unminified-javascript is a false positive on stats.html
        "unminified-javascript":       ["warn"],

        // ── Heading order — enforced ──────────────────────────────────────
        "heading-order":               ["error", { minScore: 0.9 }],
      },
    },

    upload: {
      // Free temporary public storage — no server setup needed.
      // Results are available for 7 days via a shareable URL.
      target: "temporary-public-storage",
    },
  },
};
