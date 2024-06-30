export type PathNode = {
  name: string;
  path: string;
  children: PathNode[];
};

function FilesList({ pathNodes }: { pathNodes: PathNode[] }) {
  return (
    <ol>
      {pathNodes.map((node) => (
        <li key={node.path}>
          <a href={node.path}>{node.name}</a>
          <FilesList pathNodes={node.children} />
        </li>
      ))}
    </ol>
  );
}

export function FilesTree({
  pathNodes,
  filesCount,
}: {
  pathNodes: PathNode[];
  filesCount: number;
}) {
  return (
    <>
      <h1>Index</h1>
      <p>
        This is a list of all the files in the current folder and subfolders.{" "}
        <strong>There are {filesCount} files in total.</strong>
      </p>
      <p>
        Files are also linked to the originals. In the generated word document,
        you can click on an entry to open it.
      </p>
      <p>
        Links are relative to the folder you selected. So make sure you place
        the word document inside it.
      </p>
      <FilesList pathNodes={pathNodes} />
    </>
  );
}
