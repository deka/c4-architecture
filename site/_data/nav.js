// Sidebar navigation, in reading order.
export default [
  {
    section: "Start",
    pages: [
      { url: "/", title: "Overview" },
      { url: "/c4-model/", title: "The C4 model" },
      { url: "/tutorial/", title: "Tutorial" },
      { url: "/examples/", title: "Examples" },
    ],
  },
  {
    section: "Guides",
    pages: [
      { url: "/views/", title: "Views" },
      { url: "/styles/", title: "Tags and styles" },
      { url: "/includes/", title: "Splitting a model" },
      { url: "/cli/", title: "Command line" },
      { url: "/claude-code/", title: "Claude Code plugin" },
    ],
  },
  {
    section: "Reference",
    pages: [
      { url: "/schema/", title: "JSON schema" },
      { url: "/validation/", title: "Validation rules" },
      { url: "/structurizr/", title: "Compared to Structurizr" },
    ],
  },
];
