export type PathNode = {
  name: string;
  path: string;
  filesCount: number;
  children: PathNode[];
};

function indexFolder(filePaths: string[]) {
  if (filePaths.length === 0) return [];

  const map = new Map<string, PathNode>();
  const childrenOfParents = new Map<string, Set<string>>();

  filePaths.forEach((path) => {
    const segments = path.split("/");

    if (segments.length < 1) {
      console.log("Got 0 or 1 segments. This should not happen", path);
      console.log(
        "Webkit will only return files paths so empty folders won't be here",
      );
      return;
    }

    for (let i = 0; i < segments.length; i++) {
      const child = segments.slice(0, segments.length - i).join("/");
      const parent = segments.slice(0, segments.length - i - 1).join("/");
      if (!parent) continue;

      if (!map.has(parent)) {
        map.set(parent, {
          name: parent.split("/").slice(-1)[0]!,
          path: parent,
          filesCount: 0,
          children: [],
        });
        childrenOfParents.set(parent, new Set());
      }
      const parentNode = map.get(parent)!;

      if (!map.has(child)) {
        map.set(child, {
          name: child.split("/").slice(-1)[0]!,
          path: child,
          filesCount: 0,
          children: [],
        });
        childrenOfParents.set(child, new Set());
      }
      const childNode = map.get(child)!;
      if (!childrenOfParents.get(parent)!.has(child)) {
        parentNode.children.push(childNode);
        // This can probably be done in a more efficient way
        // But it's fine for now
        parentNode.filesCount =
          parentNode.children.filter((c) => c.children.length === 0).length +
          parentNode.children.reduce((acc, curr) => acc + curr.filesCount, 0);
        childrenOfParents.get(parent)!.add(child);
      }
    }
  });

  return map.has(".") ? map.get(".")!.children : [];
}

function toMdast(nodes: PathNode[]): unknown {
  if (nodes.length === 0) {
    return {
      type: "root",
      children: [],
    };
  }
  const itemsCount =
    nodes.reduce((acc, curr) => acc + curr.filesCount, 0) +
    nodes.filter((x) => x.children.length === 0).length;
  return {
    type: "root",
    children: [
      {
        type: "heading",
        depth: 1,
        children: [{ type: "text", value: "Index" }],
      },
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            value: `This is a list of all the files in the current folder and subfolders.`,
          },
          { type: "text", value: " " },
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: `There are ${itemsCount} files in total.`,
              },
            ],
          },
          { type: "text", value: "\n\n" },
          {
            type: "text",
            value: `Files are also linked to the originals. In the generated word document, you can click on an entry to open it.`,
          },
          { type: "text", value: "\n\n" },
          {
            type: "emphasis",
            children: [
              {
                type: "text",
                value:
                  "Links are relative to the folder you selected. So make sure you place the word document inside it.",
              },
            ],
          },
        ],
      },
      toMdastList(nodes),
    ],
  };
}

function toMdastList(nodes: PathNode[]): unknown {
  const list = {
    type: "list",
    ordered: true,
    start: 1,
    spread: false,
    children: nodes.map((node) => {
      let children = [];
      if (node.children.length === 0) {
        children = [
          {
            type: "link",
            url: node.path,
            children: [{ type: "text", value: node.name }],
          },
        ];
      } else {
        children = [
          {
            type: "link",
            url: node.path,
            children: [{ type: "text", value: node.name }],
          },
          toMdastList(node.children),
        ];
      }
      return {
        type: "listItem",
        spread: false,
        children,
      };
    }),
  };
  return list;
}

(function (global) {
  global!.document = global!.document || {};
})(typeof global !== "undefined" ? global : this);

addEventListener("message", (event: MessageEvent<string[]>) => {
  console.log("Got message form main thread.");
  const nodes = indexFolder(event.data);
  console.log("Indexing done. Converting to markdown.");

  const mdast = toMdast(nodes);
  console.log("Mdast ready. Posting to main thread.");

  postMessage(mdast);
});
