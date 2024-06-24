export const IPC_SELECT_PATHS_NAME = "dialog:selectPaths" as const;
export const IPC_INDEX_PATHS = "fs:indexPaths" as const;
export const IPC_OPEN_FILE_EXPLORER = "shell:openFileExplorer" as const;
export const IPC_OPEN_EXTERNAL = "shell:openExternal" as const;
import { invokeIpc } from ".";

export type IpcSelectPaths = {
  name: typeof IPC_SELECT_PATHS_NAME;
  handler: () => Promise<string[]>;
};

export type PathNode = {
  name: string;
  path: string;
  filesCount: number;
  children: PathNode[];
};
export type IpcIndexPaths = {
  name: typeof IPC_INDEX_PATHS;
  handler: (paths: string[]) => Promise<PathNode[]>;
};

export type IpcOpenFileExplorer = {
  name: typeof IPC_OPEN_FILE_EXPLORER;
  handler: (path: string) => Promise<void>;
};

export type IpcOpenExternal = {
  name: typeof IPC_OPEN_EXTERNAL;
  handler: (url: string) => Promise<void>;
};

const selectFolder = async () =>
  invokeIpc<IpcSelectPaths>("dialog:selectPaths");
const indexFolder = async (paths: string[]) =>
  invokeIpc<IpcIndexPaths>("fs:indexPaths", paths);
const openFileExplorer = async (path: string) =>
  invokeIpc<IpcOpenFileExplorer>("shell:openFileExplorer", path);
const openExternal = async (url: string) =>
  invokeIpc<IpcOpenExternal>("shell:openExternal", url);

export const api = {
  selectFolder,
  indexFolder,
  openFileExplorer,
  openExternal,
};
