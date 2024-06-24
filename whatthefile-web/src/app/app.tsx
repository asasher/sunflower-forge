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
  console.log(basePath);
  paths = paths.map((path) => path.replace(`${basePath}/`, "./"));
  console.log(paths);
  return paths;
}

function indexFolder(filePaths: string[]) {
  if (filePaths.length === 0) return [];

  const map = new Map<string, Set<string>>();

  const traverse = (path: string) => {
    const [parent, child, ...tail] = path.split("/");
    if (!parent || !child) {
      return;
    }
    if (!map.has(parent)) {
      map.set(parent, new Set());
    }
    if (!child.startsWith(".")) map.get(parent)?.add(child);
    traverse([child, ...tail].join("/"));
  };
  filePaths.forEach(traverse);

  const isDir = (path: string) => map.has(path);

  const toTree = (currentPath: string, basePath = "."): PathNode[] => {
    const fullPath = [basePath, currentPath].join("/");
    if (!isDir(currentPath)) {
      return [
        {
          name: currentPath,
          path: fullPath,
          filesCount: 0, // Count of files in the dir, in case of file it'll be 0
          children: [],
        },
      ];
    }
    const items = Array.from(map.get(currentPath)!);
    if (items.length === 0) {
      // This is an empty "dir"
      return [
        {
          name: currentPath,
          path: fullPath,
          filesCount: 0, // Has no files
          children: [],
        },
      ];
    }

    const children = items.flatMap((item) => toTree(item, fullPath));
    const filesCount =
      children.reduce((acc, curr) => acc + curr.filesCount, 0) +
      items.filter((item) => !isDir(item)).length;

    return [
      {
        name: currentPath,
        path: fullPath,
        filesCount,
        children,
      },
    ];
  };

  const tree = toTree(".");

  return tree.flatMap((node) => node.children);
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
    const processor = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify);
    const doc = await processor.process(content);
    const blob = (await asBlob(String(doc))) as Blob;
    await fileSave(blob, {
      fileName: "whatthefile.docx",
      extensions: [".docx"],
    });
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
