import { IpcMainInvokeEvent, ipcMain, ipcRenderer } from "electron";

export type IpcChannel<P extends unknown[] = unknown[], R = void> = {
  name: string;
  handler: (...args: P) => Promise<R>;
};

export function registerIpc<P extends unknown[], R>(
  channel: IpcChannel<P, R>,
): void {
  ipcMain.handle(
    channel.name,
    (_event: IpcMainInvokeEvent, ...args: unknown[]) =>
      channel.handler(...(args as P)),
  );
}

// export function invokeIpc<P extends unknown[], R>(
//   channel: IpcChannel<P, R>,
//   ...args: P
// ): Promise<R> {
//   return ipcRenderer.invoke(channel.name, ...args) as Promise<R>;
// }

export function invokeIpc<C extends IpcChannel<unknown[], unknown>>(
  name: C["name"],
  ...args: Parameters<C["handler"]>
): ReturnType<C["handler"]> {
  return ipcRenderer.invoke(name, ...args) as ReturnType<C["handler"]>;
}
