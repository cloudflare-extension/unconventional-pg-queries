import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Unconventional PG Queries",
  description: "A lightweight query builder for postgres",
  appearance: {
    initialValue: 'dark'
  },
  markdown: {
    toc: { level: [1, 2, 3] }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Actions', 
            items: [
              { text: 'Select', link: '/actions/select' },
              { text: 'Select Many', link: '/actions/select-many' },
              { text: 'Insert', link: '/actions/insert' },
              { text: 'Update', link: '/actions/update' },
              { text: 'Update Many', link: '/actions/update-many' },
              { text: 'Delete', link: '/actions/delete' },
            ] 
          },
          { text: 'Concepts', 
            items: [
              { text: 'Where', link: '/concepts/where' },
              { text: 'Relations', link: '/concepts/relations' }
            ] 
          },
          { text: 'Examples', link: '/examples' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/cloudflare-extension/unconventional-pg-queries' }
    ],
    outline: { level: [2,3] },
    search: {
      provider: 'local'
    }
  }
})
