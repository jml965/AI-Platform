// FILE: client/src/components/workspace/file-tree.tsx
import { useEffect, useState } from "react";
import { getProjectFiles } from "../../lib/api";
import { Folder, FileText } from "lucide-react";

type Props = {
  projectId: string;
};

type ProjectFile = {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
};

export function FileTree({ projectId }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadFiles() {
      try {
        const data = await getProjectFiles(projectId);
        if (active) {
          setFiles(data.files);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFiles();
  }, [projectId]);

  if (loading) {
    return <div className="p-4 text-sm text-zinc-400">جاري تحميل الملفات...</div>;
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="space-y-0.5">
        {files.map((file) => (
          <button
            key={file.id}
            className="w-full text-right px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
          >
            {file.type === "folder" ? (
              <Folder size={14} className="text-blue-400" />
            ) : (
              <FileText size={14} className="text-zinc-500" />
            )}
            <span className="flex-1 text-right">{file.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}