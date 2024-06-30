"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, FolderDown } from "lucide-react";
import { directoryOpen, fileSave } from "browser-fs-access";
import { FilesTree, type PathNode } from "./FilesTree";
import type { IndexResponse, MakeBlobResponse } from "~/worker";
import { set } from "zod";

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

const FOLDER_DEFAULT_TEXT = "Click here to select a folder 🗂️";
const SELECTING_FOLDER_TEXT = "Selecting a folder...";
const WORKING_TEXT = "Working on it, this may take a while...";

export default function App() {
  const [uniquePaths, setUniquePaths] = useState<string[]>([]);
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);
  const [blob, setBlob] = useState<Blob | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [buttonText, setButtonText] = useState<string>(FOLDER_DEFAULT_TEXT);
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const workerRef = useRef<Worker>();

  function clear() {
    setButtonText(FOLDER_DEFAULT_TEXT);
    setUniquePaths([]);
    setPathNodes([]);
    setBlob(undefined);
    setMessage(undefined);
    setErrorMessage(undefined);
    setIsLoading(false);
  }

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("~/worker/index.tsx", import.meta.url),
    );
    workerRef.current.onmessage = async (
      event: MessageEvent<IndexResponse | MakeBlobResponse>,
    ) => {
      console.log("Got response from worker.");

      if (event.data.type === "index") {
        console.log("Indexing done.");
        setPathNodes(event.data.data);
        setMessage(undefined);
      }

      if (event.data.type === "makeBlob") {
        console.log("File is ready to be saved");
        setBlob(event.data.data);
        setIsLoading(false);
      }
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
      setIsLoading(true);
      setButtonText(SELECTING_FOLDER_TEXT);
      const selectedPaths = await selectFolder();
      const uniquePaths = Array.from(new Set(selectedPaths));
      setUniquePaths(uniquePaths);
      setMessage(
        `There are ${uniquePaths.length} files in total. If you're browser complains about page being unresponsive, just select wait.`,
      );
      setButtonText(WORKING_TEXT);
      console.log("Sent selected paths to worker");
      void index(uniquePaths);
    } catch (e) {
      console.error(e);
      clear();
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
    <div
      className={`${pathNodes.length <= 0 ? "max-w-md" : ""} flex w-full flex-col gap-4 p-8`}
    >
      <h1 className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-xl font-bold text-transparent">
        What The File!
      </h1>
      {pathNodes.length <= 0 && (
        <>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              void handleSelect();
            }}
            className={`${isLoading ? "animate-pulse" : ""} flex max-w-sm cursor-pointer flex-col items-center justify-center rounded-lg bg-blue-400 p-4 font-bold text-white hover:bg-blue-500 disabled:bg-slate-300`}
            disabled={isLoading}
          >
            {buttonText}
          </button>
          {message && (
            <p className="max-w-md text-sm text-sky-500">{message}</p>
          )}
          {errorMessage && (
            <p className="max-w-md text-sm text-red-500">{errorMessage}</p>
          )}
          <p className="max-w-md text-sm text-slate-500">
            Make sure you are using{" "}
            <a
              href="https://www.google.com/chrome/"
              className="font-bold text-amber-500 underline"
            >
              Chrome
            </a>
            ,{" "}
            <a
              href="https://www.microsoft.com/en-us/edge"
              className="font-bold text-cyan-500 underline"
            >
              Edge
            </a>
            , or better yet{" "}
            <a
              href="https://arc.net/"
              className="font-bold text-purple-500 underline"
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
      {pathNodes.length > 0 && (
        <div className="flex w-full flex-col justify-start gap-4 rounded-lg border-2">
          <div className="flex w-full flex-wrap justify-end gap-4 rounded-t-lg bg-slate-100 p-4">
            <button
              onClick={() => {
                clear();
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-400 px-4 py-1 align-baseline text-sm text-white hover:bg-blue-500"
            >
              <ChevronLeft className="h-4 w-4" />
              Go Back
            </button>
            <button
              onClick={() => void handleSaveToWord()}
              className={`${isLoading ? "animate-pulse" : ""} flex items-center justify-center gap-2 rounded-lg bg-blue-400 px-4 py-1 text-sm text-white hover:bg-blue-500 disabled:bg-slate-300`}
              disabled={!blob}
            >
              <FolderDown className="h-4 w-4" />
              Save as Microsoft Word
            </button>
          </div>
          {message && (
            <div className="p-4">
              <p className="max-w-md text-sm text-sky-500">{message}</p>
            </div>
          )}
          <div className="prose p-4">
            <FilesTree pathNodes={pathNodes} filesCount={uniquePaths.length} />
          </div>
        </div>
      )}
    </div>
  );
}
