import { dialog } from "electron";
import path from "path";
import { readdir, stat } from "fs/promises";
import { IpcIndexPaths, IpcSelectPaths, PathNode } from "./renderer";

async function indexPaths(fullPaths: string[]): Promise<PathNode[]> {
  return Promise.all(
    fullPaths.map(async (fullPath) => {
      const baseName = path.basename(fullPath);
      return {
        name: baseName,
        path: fullPath,
        children: await indexPath(fullPath),
      };
    }),
  );
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
          path: fullPath,
          children: [],
        },
      ];
    }
    if (stats.isDirectory()) {
      const childrenNames = await readdir(fullPath);
      const children = await Promise.all(
        childrenNames.map(async (childName) => {
          const fullPathToChild = path.join(fullPath, childName);
          return {
            name: childName,
            path: fullPathToChild,
            children: await indexPath(fullPathToChild, ignoreHidden),
          };
        }),
      );
      return [
        {
          name: baseName,
          path: fullPath,
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
      properties: ["openDirectory", "multiSelections"],
    });
    if (canceled) {
      return;
    } else {
      return filePaths;
    }
  },
};
