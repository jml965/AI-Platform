// FILE: client/src/components/preview/preview-frame.tsx
import { useEffect, useMemo, useState } from "react";
import { devices } from "../workspace/device-switcher";
import { getProjectPreview } from "../../lib/api";

type Props = {
  projectId: string;
};

export function PreviewFrame({ projectId }: Props) {
  const [selected, setSelected] = useState("full");
  const [previewHtml, setPreviewHtml] = useState("<html><body>Loading...</body></html>");

  const currentDevice = useMemo(
    () => devices.find((d) => d.key === selected) || devices[0],
    [selected]
  );

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        const data = await getProjectPreview(projectId);
        if (active) {
          setPreviewHtml(data.html);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadPreview();
  }, [projectId]);

  const frameStyle =
    currentDevice.key === "full"
      ? { width: "100%", height: "100%" }
      : {
          width: `${currentDevice.width}px`,
          height: `${currentDevice.height}px`
        };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-zinc-800 bg-[#0b0f17] px-4 flex items-center justify-between">
        <div className="text-sm text-zinc-300">Preview</div>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-10 rounded-xl bg-[#121826] border border-zinc-700 px-3 text-sm"
        >
          {devices.map((device) => (
            <option key={device.key} value={device.key}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto bg-[#0d1320] p-6 flex items-start justify-center">
        <div
          className="rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl bg-white"
          style={frameStyle}
        >
          <iframe
            title="preview"
            srcDoc={previewHtml}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}