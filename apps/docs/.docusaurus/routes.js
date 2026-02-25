import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'f78'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'b16'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'e10'),
            routes: [
              {
                path: '/docs/getting-started',
                component: ComponentCreator('/docs/getting-started', '088'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '13e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/sdk',
                component: ComponentCreator('/docs/sdk', 'bec'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
