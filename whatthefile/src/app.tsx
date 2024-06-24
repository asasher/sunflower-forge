import { useState } from "react";
import { createRoot } from "react-dom/client";
import { PathNode } from "./ipcs/renderer";
import Hello from "./Hello.mdx";

const { selectFolder, indexFolder } = window.ipc;

function App() {
  const [items, setItems] = useState<PathNode[]>([]);
  const [isOver, setIsOver] = useState(false);

  console.log("items", items);
  const filesCount = items.reduce((acc, curr) => acc + curr.filesCount, 0);

  async function handleSelect(selectedPaths: string[]) {
    setItems(await indexFolder(selectedPaths));
  }

  // TODO: Copy over eslint config from t3
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-xl font-bold text-transparent">
        What The File!
      </h1>
      <div
        onDrop={(e) => {
          console.log("Drop");
          e.preventDefault();
          const droppedPaths: string[] = [];
          if (e.dataTransfer.items) {
            [...e.dataTransfer.items].forEach((item, i) => {
              if (item.kind === "file") {
                const file = item.getAsFile();
                droppedPaths.push(file.path);
              }
            });
          } else {
            [...e.dataTransfer.files].forEach((file, i) => {
              droppedPaths.push(file.path);
            });
          }
          void handleSelect(droppedPaths);
          setIsOver(false);
        }}
        onDragEnter={() => {
          console.log("Enter");
          setIsOver(true);
        }}
        onDragLeave={() => {
          console.log("Leave");
          setIsOver(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onMouseDown={async () => {
          const selectedPaths = await selectFolder();
          handleSelect(selectedPaths);
        }}
        className={`${isOver ? "border-blue-300" : "border-slate-300"} flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed`}
      >
        {items.length == 0
          ? "Drag n Drop a files or folders here 🗂️"
          : `Currently you've selected ${items.length} items with a total of ${filesCount} files`}
      </div>
      <div className="prose w-full justify-start pt-8">
        <Hello name={"World"} />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
