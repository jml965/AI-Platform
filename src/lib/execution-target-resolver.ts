// FILE: src/lib/execution-target-resolver.ts

export class ExecutionTargetResolver {

  resolve(files: Array<{ path: string; content: string }>) {
    const entryCandidates = [
      "src/app.ts",
      "src/index.ts",
      "app.ts",
      "index.ts",
      "src/app.js",
      "src/index.js",
      "app.js",
      "index.js"
    ]

    const generatedPaths = files.map((f) => f.path)

    const matched = entryCandidates.find((c) => generatedPaths.includes(c))

    if (!matched) {
      return {
        command: "",
        reason: "No executable entry file found in generated files"
      }
    }

    if (matched.endsWith(".ts")) {
      return {
        entryFile: matched,
        runtime: "tsx",
        command: `npx tsx ${matched}`,
        reason: ""
      }
    }

    return {
      entryFile: matched,
      runtime: "node",
      command: `node ${matched}`,
      reason: ""
    }
  }

}