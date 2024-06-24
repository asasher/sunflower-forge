import { useState } from "react";
import { createRoot } from "react-dom/client";
import { PathNode } from "./ipcs/renderer";
import { toMarkdown } from "mdast-util-to-markdown";
import Markdown from "react-markdown";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { saveAs } from "file-saver";
import { ChevronLeft, FolderDown } from "lucide-react";
import remarkRehype from "remark-rehype";
import { asBlob } from "html-docx-js-typescript";
import rehypeStringify from "rehype-stringify";

const { selectFolder, indexFolder, openFileExplorer, openExternal } =
  window.ipc;

function toMdast(nodes: PathNode[]): any {
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
            value: `This is a list of all the files in the current folder and subfolders. You can click on a file to open it. There are ${itemsCount} files in total.`,
          },
        ],
      },
      toMdastList(nodes),
    ],
  };
}

function toMdastList(nodes: PathNode[]): any {
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

function App() {
  const [items, setItems] = useState<PathNode[]>([]);
  const [isOver, setIsOver] = useState(false);

  const filesCount = items.reduce((acc, curr) => acc + curr.filesCount, 0);

  async function handleSelect(selectedPaths: string[]) {
    setItems(await indexFolder(selectedPaths));
  }

  const content = toMarkdown(toMdast(items) as any);

  async function handleSaveToWord() {
    const processor = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify);
    const doc = await processor.process(content);
    const blob = (await asBlob(String(doc))) as Blob;
    saveAs(blob, "whatthefile.docx");
  }

  // TODO: Copy over eslint config from t3
  return (
    <div className="flex min-h-svh w-full flex-col gap-4 p-8">
      <h1 className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-xl font-bold text-transparent">
        What The File!
      </h1>
      {items.length === 0 && (
        <>
          <div
            onDrop={(e) => {
              e.preventDefault();
              const droppedPaths: string[] = [];
              if (e.dataTransfer.items) {
                [...e.dataTransfer.items].forEach((item, i) => {
                  if (item.kind === "file") {
                    const file = item.getAsFile();
                    droppedPaths.push(file.path);
                  }
                });
              } else {
                [...e.dataTransfer.files].forEach((file, i) => {
                  droppedPaths.push(file.path);
                });
              }
              void handleSelect(droppedPaths);
              setIsOver(false);
            }}
            onDragEnter={() => {
              setIsOver(true);
            }}
            onDragLeave={() => {
              setIsOver(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onMouseDown={async (e) => {
              e.preventDefault();
              const selectedPaths = await selectFolder();
              handleSelect(selectedPaths);
            }}
            className={`${isOver ? "border-blue-300" : "border-slate-300"} flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-slate-700`}
          >
            {items.length == 0
              ? "Drag n Drop files or folders here 🗂️ or click to select!"
              : `Currently you've selected ${items.length} items with a total of ${filesCount} files`}
          </div>
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
              className="text-blue-400 underline"
              onClick={(e) => {
                e.preventDefault();
                void openExternal("https://github.com/asasher/sunflower-forge");
              }}
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
                const { children, className, node, href, ...rest } = props;
                return (
                  <a
                    {...rest}
                    href={`file:/${props.href}`}
                    className={className}
                    onClick={(e) => {
                      e.preventDefault();
                      void openFileExplorer(props.href);
                    }}
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

const root = createRoot(document.getElementById("root"));
root.render(<App />);
