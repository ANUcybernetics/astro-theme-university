import type { PortableTextBlockConfig } from "emdash";

/** Block types the plugin adds to EmDash's rich-text editor. Each `action_id`
 *  becomes a property on the saved node, so renaming one orphans content
 *  already saved under the old name: treat it as a breaking change. */
export const portableTextBlocks: PortableTextBlockConfig[] = [
  {
    type: "callout",
    label: "Callout",
    icon: "info",
    description: "A highlighted note, tip, warning or error",
    category: "Sections",
    fields: [
      {
        type: "text_input",
        action_id: "text",
        label: "Text",
        multiline: true,
        placeholder: "Links as [text](https://…), **bold**, *emphasis*",
      },
      {
        type: "select",
        action_id: "tone",
        label: "Tone",
        options: [
          { label: "Info", value: "info" },
          { label: "Tip", value: "tip" },
          { label: "Warning", value: "warning" },
          { label: "Error", value: "error" },
        ],
        initial_value: "info",
      },
    ],
  },
  {
    type: "cta",
    label: "Button",
    icon: "link",
    description: "A call-to-action button linking to a page or file",
    category: "Sections",
    fields: [
      { type: "text_input", action_id: "text", label: "Label" },
      { type: "text_input", action_id: "url", label: "Link", placeholder: "/apply/ or https://…" },
      {
        type: "select",
        action_id: "variant",
        label: "Style",
        options: [
          { label: "Solid", value: "solid" },
          { label: "Outline", value: "outline" },
        ],
        initial_value: "solid",
      },
    ],
  },
];
