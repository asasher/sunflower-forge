// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge } from "electron";
import { api } from "./ipcs/renderer";

const API_KEY = "ipc" as const;

contextBridge.exposeInMainWorld(API_KEY, api);

declare global {
  interface Window {
    [API_KEY]: typeof api;
  }
}
