import { dialog, shell } from "electron";
import path from "path";
import { readdir, stat } from "fs/promises";
import {
  IpcIndexPaths,
  IpcOpenExternal,
  IpcOpenFileExplorer,
  IpcSelectPaths,
  PathNode,
} from "./renderer";

async function indexPaths(
  fullPaths: string[],
  ignoreHidden = true,
): Promise<PathNode[]> {
  return (
    await Promise.all(
      fullPaths.flatMap(async (fullPath) => indexPath(fullPath, ignoreHidden)),
    )
  ).flat();
}

async function indexPath(
  fullPath: string,
  ignoreHidden = true,
): Promise<PathNode[]> {
  try {
    if (ignoreHidden && path.basename(fullPath).startsWith(".")) {
      return [];
    }
    const baseName = path.basename(fullPath);
    const stats = await stat(fullPath);
    if (stats.isFile()) {
      return [
        {
          name: baseName,
          filesCount: 1,
          path: fullPath,
          children: [],
        },
      ];
    }
    if (stats.isDirectory()) {
      const childrenNames = await readdir(fullPath);
      const childrenPaths = childrenNames.map((childName) =>
        path.join(fullPath, childName),
      );
      const children = await indexPaths(childrenPaths, ignoreHidden);
      const filesCount = children.reduce(
        (acc, curr) => acc + curr.filesCount,
        0,
      );
      return [
        {
          name: baseName,
          path: fullPath,
          filesCount,
          children,
        },
      ];
    }
    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export const ipcIndexPaths: IpcIndexPaths = {
  name: "fs:indexPaths",
  handler: indexPaths,
};

export const ipcSelectPaths: IpcSelectPaths = {
  name: "dialog:selectPaths",
  handler: async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["multiSelections", "openDirectory", "openFile"],
    });
    if (canceled) {
      return [];
    } else {
      return filePaths;
    }
  },
};

export const ipcOpenFileExplorer: IpcOpenFileExplorer = {
  name: "shell:openFileExplorer",
  handler: async (filePath: string) => {
    try {
      const decodedPath = decodeURI(filePath);
      await shell.showItemInFolder(decodedPath);
    } catch (e) {
      console.error(e);
    }
  },
};

export const ipcOpenExternal: IpcOpenExternal = {
  name: "shell:openExternal",
  handler: async (url: string) => {
    try {
      await shell.openExternal(url);
    } catch (e) {
      console.error(e);
    }
  },
};
