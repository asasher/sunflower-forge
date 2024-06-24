export const IPC_SELECT_PATHS_NAME = "dialog:selectPaths" as const;
export const IPC_INDEX_PATHS = "fs:indexPaths" as const;
import { invokeIpc } from ".";

export type IpcSelectPaths = {
  name: typeof IPC_SELECT_PATHS_NAME;
  handler: () => Promise<string[]>;
};

export type PathNode = {
  name: string;
  path: string;
  children: PathNode[];
};
export type IpcIndexPaths = {
  name: typeof IPC_INDEX_PATHS;
  handler: (paths: string[]) => Promise<PathNode[]>;
};

const selectFolder = async () =>
  invokeIpc<IpcSelectPaths>("dialog:selectPaths");
const indexFolder = async (paths: string[]) =>
  invokeIpc<IpcIndexPaths>("fs:indexPaths", paths);

export const api = {
  selectFolder,
  indexFolder,
};
