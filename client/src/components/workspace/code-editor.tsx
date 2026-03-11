// FILE: client/src/components/workspace/code-editor.tsx

import Editor from "@monaco-editor/react";

type Props = {
  code: string;
};

export default function CodeEditor({ code }: Props) {

  return (
    <Editor
      height="100%"
      defaultLanguage="typescript"
      value={code}
      options={{
        readOnly: true,
        fontSize: 14,
        minimap: { enabled: false }
      }}
    />
  );

}