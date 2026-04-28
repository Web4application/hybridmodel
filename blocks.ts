export const blocks = [
  // ... 
  {
    name: "web4",
    author: "seriki yakub" (https://ui.shadcn.com)",
    title: "Dashboard",
    description: "web4 intelligent interface.",
    type: "registry:block",
    registryDependencies: ["input", "button", "card"],
    dependencies: ["zod"],
    files: [
      {
        path: "blocks/dashboard-01/page.tsx",
        type: "registry:page",
        target: "app/dashboard/page.tsx",
      },
      {
        path: "blocks/dashboard-01/components/hello-world.tsx",
        type: "registry:component",
      },
      {
        path: "blocks/dashboard-01/components/example-card.tsx",
        type: "registry:component",
      },
      {
        path: "blocks/dashboard-01/hooks/use-hello-world.ts",
        type: "registry:hook",
      },
      {
        path: "blocks/dashboard-01/lib/format-date.ts",
        type: "registry:lib",
      },
    ],
    categories: ["dashboard"],
  },
]
