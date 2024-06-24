import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const { selectFolder, indexFolder } = window.ipc;

function App() {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    (async () => {
      setItems(await indexFolder(selectedPaths));
    })();
  }, [selectedPaths]);

  // TODO: Copy over eslint config from t3
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-xl font-bold text-transparent">
        What The File!
      </h1>
      <div
        onDrop={(e) => {
          console.log("Drop");

          // Prevent default behavior (Prevent file from being opened)
          e.preventDefault();

          const droppedPaths: string[] = [];

          if (e.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            [...e.dataTransfer.items].forEach((item, i) => {
              // If dropped items aren't files, reject them
              if (item.kind === "file") {
                const file = item.getAsFile();
                droppedPaths.push(file.path);
                console.log(`… file[${i}].name = ${file.name}`);
              }
            });
          } else {
            // Use DataTransfer interface to access the file(s)
            [...e.dataTransfer.files].forEach((file, i) => {
              droppedPaths.push(file.path);
            });
          }
          setSelectedPaths(droppedPaths);
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
          setSelectedPaths(selectedPaths);
        }}
        className={`${isOver ? "border-blue-300" : "border-slate-300"} flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed`}
      >
        {selectedPaths.length == 0
          ? "Drag n Drop a files or folders here 🗂️"
          : `Currently you've ${selectedPaths.length} files and folders with a total of ${items.length} items`}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
