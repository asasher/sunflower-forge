import { dialog } from "electron";
import path from "path";
import { readdir, stat } from "fs/promises";
import { IpcIndexPaths, IpcSelectPaths, PathNode } from "./renderer";

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
      properties: ["openDirectory", "multiSelections"],
    });
    if (canceled) {
      return;
    } else {
      return filePaths;
    }
  },
};
