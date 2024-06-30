import { renderToString } from "react-dom/server";
import { asBlob } from "html-docx-js-typescript";
import { FilesTree, type PathNode } from "~/app/_components/FilesTree";

function indexFolder(filePaths: string[]) {
  if (filePaths.length === 0) return [];

  const map = new Map<string, PathNode>();
  const childrenOfParents = new Map<string, Set<string>>();

  filePaths.forEach((path) => {
    const segments = path.split("/");

    if (segments.length < 1) {
      console.log("Got 0 or 1 segments. This should not happen", path);
      console.log(
        "Webkit will only return files paths so empty folders won't be here",
      );
      return;
    }

    for (let i = 0; i < segments.length; i++) {
      const child = segments.slice(0, segments.length - i).join("/");
      const parent = segments.slice(0, segments.length - i - 1).join("/");
      if (!parent) continue;

      if (!map.has(parent)) {
        map.set(parent, {
          name: parent.split("/").slice(-1)[0]!,
          path: parent,
          children: [],
        });
        childrenOfParents.set(parent, new Set());
      }
      const parentNode = map.get(parent)!;

      if (!map.has(child)) {
        map.set(child, {
          name: child.split("/").slice(-1)[0]!,
          path: child,
          children: [],
        });
        childrenOfParents.set(child, new Set());
      }
      const childNode = map.get(child)!;
      if (!childrenOfParents.get(parent)!.has(child)) {
        parentNode.children.push(childNode);
        childrenOfParents.get(parent)!.add(child);
      }
    }
  });

  return map.has(".") ? map.get(".")!.children : [];
}

type WorkerResponse<K, T> = {
  type: K;
  data: T;
};

export type IndexResponse = WorkerResponse<"index", PathNode[]>;
export type MakeBlobResponse = WorkerResponse<"makeBlob", Blob>;

async function handleMessage(event: MessageEvent<string[]>) {
  console.log("Got message form main thread.");

  const nodes = indexFolder(event.data);
  postMessage({
    type: "index",
    data: nodes,
  } satisfies IndexResponse);

  const doc = renderToString(
    <FilesTree pathNodes={nodes} filesCount={event.data.length} />,
  );
  const blob = await asBlob(doc);
  postMessage({
    type: "makeBlob",
    data: blob as Blob,
  } satisfies MakeBlobResponse);
}

addEventListener("message", (event: MessageEvent<string[]>) => {
  void handleMessage(event);
});
