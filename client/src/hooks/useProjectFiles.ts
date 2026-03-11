// FILE: client/src/hooks/useProjectFiles.ts

import { useState } from "react";

export function useProjectFiles(projectId: string) {

  const [content, setContent] = useState("");

  async function openFile(path: string) {

    const res = await fetch(`/api/projects/${projectId}/file?path=${path}`);

    const json = await res.json();

    setContent(json.content);

  }

  return { content, openFile };

}