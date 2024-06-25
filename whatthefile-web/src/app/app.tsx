"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { ChevronLeft, FolderDown } from "lucide-react";
import remarkRehype from "remark-rehype";
import { asBlob } from "html-docx-js-typescript";
import rehypeStringify from "rehype-stringify";
import { directoryOpen, fileSave } from "browser-fs-access";
import remarkStringify from "node_modules/remark-stringify/lib";

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

export default function App() {
  const [content, setContent] = useState<string | undefined>();
  const [blob, setBlob] = useState<Blob | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL("../worker", import.meta.url));
    workerRef.current.onmessage = async (event: MessageEvent<unknown>) => {
      // Lol, probably didn't need to do this since it's
      // actually the rendering to Markdown that's taking time
      // oh well. At least I can set a loading state this way easily.
      console.log("Got response from worker.");

      console.log("Converting to Markdown");
      const content = unified()
        .use(remarkStringify)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        .stringify(event.data as any);

      console.log("Content is ready to be rendered");

      console.log("Also converting to blob so it's ready to be saved");
      console.log("Converting to Docx");
      const processor = unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeStringify);
      const doc = await processor.process(content);
      const blob = (await asBlob(String(doc))) as Blob;
      console.log("Blob is ready to be saved");

      setContent(String(content));
      setBlob(blob);

      setIsLoading(false);
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const index = useCallback(async (selectedPaths: string[]) => {
    workerRef.current?.postMessage(selectedPaths);
  }, []);

  async function handleSelect() {
    try {
      const selectedPaths = await selectFolder();
      setIsLoading(true);
      console.log("Sent selected paths to worker");
      void index(selectedPaths);
    } catch (e) {
      console.error(e);
      setErrorMessage(
        "It seemed I couldn't access your folder, try again later. If you're trying to select One Drive or Google Drive, make sure they are available offline.",
      );
      setTimeout(() => {
        setErrorMessage(undefined);
      }, 5000);
    }
  }

  async function handleSaveToWord() {
    if (!blob) {
      console.error("No blob to save");
      return;
    }
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
      {!content && (
        <>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              void handleSelect();
            }}
            className={`${isLoading ? "animate-pulse" : ""} flex max-w-sm cursor-pointer flex-col items-center justify-center rounded-lg bg-blue-400 p-4 font-bold text-white hover:bg-blue-500 disabled:bg-slate-300`}
            disabled={isLoading}
          >
            {isLoading
              ? "Working on it, this may take a minute..."
              : "Click here to select a folder 🗂️"}
          </button>
          {errorMessage && (
            <p className="max-w-md text-sm text-red-500">{errorMessage}</p>
          )}
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
                setContent(undefined);
                setBlob(undefined);
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
