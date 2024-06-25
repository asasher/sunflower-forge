"use client";

import { useState } from "react";
import { toMarkdown } from "mdast-util-to-markdown";
import Markdown from "react-markdown";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { ChevronLeft, FolderDown } from "lucide-react";
import remarkRehype from "remark-rehype";
import { asBlob } from "html-docx-js-typescript";
import rehypeStringify from "rehype-stringify";
import { directoryOpen, fileSave } from "browser-fs-access";

export type PathNode = {
  name: string;
  path: string;
  filesCount: number;
  children: PathNode[];
};

async function selectFolder() {
  const result = await directoryOpen({
    recursive: true,
  });
  let paths = result
    .map((file) => {
      if (file instanceof FileSystemDirectoryHandle) return;
      return file.webkitRelativePath;
    })
    .filter((x) => !!x) as string[];
  const basePath = paths[0]!.split("/")[0]!;
  paths = paths.map((path) => path.replace(`${basePath}/`, "./"));
  console.log(`${paths.length} files selected`);
  return paths;
}

function indexFolder(filePaths: string[]) {
  if (filePaths.length === 0) return [];

  const map = new Map<string, PathNode>();
  const childrenOfParents = new Map<string, Set<string>>();

  filePaths.forEach((path) => {
    const segments = path.split("/");

    if (segments.length < 0) {
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
  const itemsCount = nodes.reduce((acc, curr) => acc + curr.filesCount, 0);
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

export default function App() {
  const [items, setItems] = useState<PathNode[]>([]);

  function handleSelect(selectedPaths: string[]) {
    setItems(indexFolder(selectedPaths));
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  const content = toMarkdown(toMdast(items) as any);

  async function handleSaveToWord() {
    console.log("Converting to Docx");
    const processor = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify);
    const doc = await processor.process(content);
    const blob = (await asBlob(String(doc))) as Blob;
    console.log("Blob is ready to be saved");
    try {
      await fileSave(blob, {
        fileName: "Index.docx",
        extensions: [".docx"],
      });
    } catch (e) {
      console.error(e);
    }
  }

  // TODO: Copy over eslint config from t3
  return (
    <div className="flex min-h-svh w-full flex-col gap-4 p-8">
      <h1 className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-xl font-bold text-transparent">
        What The File!
      </h1>
      {items.length === 0 && (
        <>
          <div
            onMouseDown={async (e) => {
              e.preventDefault();
              const selectedPaths = await selectFolder();
              handleSelect(selectedPaths);
            }}
            className="flex max-w-sm cursor-pointer flex-col items-center justify-center rounded-lg bg-blue-400 p-4 font-bold text-white hover:bg-blue-500"
          >
            Click here to select a folder 🗂️
          </div>
          <p className="max-w-md text-sm text-slate-500">
            Make sure you are using{" "}
            <a
              href="https://www.google.com/chrome/"
              className="font-bold text-amber-400 text-amber-500 underline"
            >
              Chrome
            </a>
            , or better yet{" "}
            <a
              href="https://arc.net/"
              className="font-bold text-blue-400 text-purple-500 underline"
            >
              Arc
            </a>{" "}
            as your browser.
          </p>
          <p className="max-w-md text-sm text-slate-500">
            This will index all the files in the folder, link them to originals
            and let you download the index as a Word document.
          </p>
          <p className="max-w-md text-sm text-slate-500">
            All of this happens on your machine and no data is sent anywhere.
            All the source code is available{" "}
            <a
              href="https://github.com/asasher/sunflower-forge"
              target="_blank"
              className="font-bold text-blue-400 underline"
            >
              here
            </a>{" "}
            under the MIT license.
          </p>
        </>
      )}
      {content && (
        <div className="flex w-full flex-col justify-start gap-4 rounded-lg border-2">
          <div className="flex w-full justify-end gap-4 rounded-t-lg bg-slate-100 p-4">
            <button
              onClick={() => {
                setItems([]);
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-400 px-4 py-1 align-baseline text-sm text-white hover:bg-blue-500"
            >
              <ChevronLeft className="h-4 w-4" />
              Go Back
            </button>
            <button
              onClick={() => void handleSaveToWord()}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-400 px-4 py-1 text-sm text-white hover:bg-blue-500"
            >
              <FolderDown className="h-4 w-4" />
              Save as Microsoft Word
            </button>
          </div>
          <Markdown
            className="prose flex w-full max-w-none flex-col justify-start rounded-lg border-blue-300 p-4"
            components={{
              a(props) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { children, className, node, href, ...rest } = props;
                return (
                  <a
                    {...rest}
                    href={`file://${href}`}
                    className={`${className} cursor-none border-b border-dashed border-blue-300 no-underline`}
                    onClick={(e) => e.preventDefault()}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {content}
          </Markdown>
        </div>
      )}
    </div>
  );
}
