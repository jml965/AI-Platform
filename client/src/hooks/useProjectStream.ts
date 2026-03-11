// FILE: client/src/hooks/useProjectStream.ts

import { useEffect } from "react";

export function useProjectStream(projectId: string, onEvent: (data: any) => void) {

  useEffect(() => {

    if (!projectId) return;

    const source = new EventSource(`/api/projects/${projectId}/stream`);

    source.onmessage = (event) => {
      onEvent(JSON.parse(event.data));
    };

    return () => source.close();

  }, [projectId]);

}