// FILE: client/src/components/layout/right-panel.tsx
import { FileTree } from "../workspace/file-tree";

type Props = {
  projectId: string;
};

export function RightPanel({ projectId }: Props) {
  return (
    <aside className="h-full bg-[#0b0f17] flex flex-col">
      <div className="px-4 py-4 border-b border-zinc-800">
        <input
          placeholder="Search files"
          className="w-full h-11 rounded-xl bg-[#121826] border border-zinc-800 px-3 outline-none text-sm"
        />
      </div>

      <FileTree projectId={projectId} />
    </aside>
  );
}