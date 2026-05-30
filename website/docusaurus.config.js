// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'DevPulse',
  tagline: 'AI-Powered DevSecOps Operations Platform',
  favicon: 'img/favicon.ico',

  // Future flags
  future: {
    v4: true,
  },

  url: 'https://devpulse.dev',
  baseUrl: '/',

  organizationName: 'SSSahil15',
  projectName: 'devpulse',

  onBrokenLinks: 'ignore', // Avoid failing build on relative cross-file links
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: '../docs',
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/SSSahil15/devpulse/tree/main/docs/',
        },
        blog: false, // Disable default blog to keep docs-focused
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'DevPulse',
        logo: {
          alt: 'DevPulse Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/SSSahil15/devpulse',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Guides',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/getting-started/installation',
              },
              {
                label: 'Quick Start',
                to: '/docs/getting-started/quick-start',
              },
              {
                label: 'User Guide',
                to: '/docs/user-guide/dashboard',
              },
            ],
          },
          {
            title: 'Technical Info',
            items: [
              {
                label: 'Architecture',
                to: '/docs/developer-guide/architecture',
              },
              {
                label: 'Security & Compliance',
                to: '/docs/security/architecture',
              },
              {
                label: 'API Reference',
                to: '/docs/api-docs/endpoints',
              },
            ],
          },
          {
            title: 'Project Info',
            items: [
              {
                label: 'Changelog',
                to: '/docs/changelog',
              },
              {
                label: 'GitHub Repository',
                href: 'https://github.com/SSSahil15/devpulse',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} DevPulse, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
