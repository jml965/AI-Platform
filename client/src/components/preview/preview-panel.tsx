// FILE: client/src/components/preview/preview-panel.tsx
import { useMemo, useState } from "react";
import { devices } from "../workspace/device-switcher";

type PreviewFile = {
  path: string;
  content: string;
  language?: string;
};

type Props = {
  previewUrl?: string;
  files?: PreviewFile[];
};

function normalizePath(path?: string) {
  return String(path || "").trim().toLowerCase();
}

function findHtmlFile(files?: PreviewFile[]) {
  if (!Array.isArray(files)) return null;

  const normalized = files.filter(Boolean);

  const exactIndex = normalized.find((file) => normalizePath(file.path) === "index.html");
  if (exactIndex) return exactIndex;

  const anyHtml = normalized.find((file) => {
    const path = normalizePath(file.path);
    return path.endsWith(".html") || path.endsWith(".htm");
  });

  return anyHtml ?? null;
}

function findCssFile(files?: PreviewFile[]) {
  if (!Array.isArray(files)) return null;

  const exact = files.find((file) => normalizePath(file.path) === "style.css");
  if (exact) return exact;

  return files.find((file) => normalizePath(file.path).endsWith(".css")) ?? null;
}

function findJsFile(files?: PreviewFile[]) {
  if (!Array.isArray(files)) return null;

  const exact = files.find((file) => normalizePath(file.path) === "script.js");
  if (exact) return exact;

  return files.find((file) => {
    const path = normalizePath(file.path);
    return path.endsWith(".js") || path.endsWith(".mjs");
  }) ?? null;
}

function injectAssetsIntoHtml(html: string, css?: string, js?: string) {
  let output = html;

  if (css && !/<style[\s>]/i.test(output)) {
    if (/<\/head>/i.test(output)) {
      output = output.replace(/<\/head>/i, `<style>${css}</style></head>`);
    } else {
      output = `<style>${css}</style>${output}`;
    }
  }

  if (js && !/<script[\s>]/i.test(output)) {
    if (/<\/body>/i.test(output)) {
      output = output.replace(/<\/body>/i, `<script>${js}<\/script></body>`);
    } else {
      output = `${output}<script>${js}<\/script>`;
    }
  }

  return output;
}

export function PreviewPanel({ previewUrl, files }: Props) {
  const [selected, setSelected] = useState("full");

  const currentDevice = useMemo(
    () => devices.find((d) => d.key === selected) || devices[0],
    [selected]
  );

  const srcDoc = useMemo(() => {
    if (previewUrl) return undefined;

    const htmlFile = findHtmlFile(files);
    if (!htmlFile?.content) return undefined;

    const cssFile = findCssFile(files);
    const jsFile = findJsFile(files);

    return injectAssetsIntoHtml(
      htmlFile.content,
      cssFile?.content,
      jsFile?.content
    );
  }, [previewUrl, files]);

  const frameStyle =
    currentDevice.key === "full"
      ? { width: "100%", height: "100%" }
      : {
          width: `${currentDevice.width}px`,
          height: `${currentDevice.height}px`
        };

  const hasContent = previewUrl || srcDoc;

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-zinc-800 bg-[#0b0f17] px-4 flex items-center justify-between">
        <div className="text-sm text-zinc-300">Preview</div>

        <select
          data-testid="select-device"
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
        {hasContent ? (
          <div
            className="rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl bg-white"
            style={frameStyle}
          >
            {previewUrl ? (
              <iframe
                data-testid="preview-iframe"
                title="preview"
                src={previewUrl}
                className="w-full h-full border-0"
              />
            ) : (
              <iframe
                data-testid="preview-iframe"
                title="preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full h-full border-0"
              />
            )}
          </div>
        ) : (
          <div className="text-zinc-500 text-sm mt-20">
            لا توجد معاينة بعد
          </div>
        )}
      </div>
    </div>
  );
}
