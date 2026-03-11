// FILE: src/agents/debugger-agent.ts

export class DebuggerAgent {

  async run(error: string) {

    const notes: string[] = []

    if (error.includes("Cannot find module")) {
      notes.push("Missing dependency or missing file")
    }

    if (error.includes("SyntaxError")) {
      notes.push("Syntax error in generated code")
    }

    if (error.includes("Unknown file extension")) {
      notes.push("Execution engine selected an unsupported runtime for the generated file type")
    }

    if (error.includes("timeout")) {
      notes.push("Execution exceeded allowed time limit")
    }

    if (error.includes("No executable entry file found")) {
      notes.push("Generated files do not contain a runnable entry point")
      notes.push("Expected one of: src/app.ts, src/index.ts, app.ts, index.ts, src/app.js, src/index.js, app.js, index.js")
    }

    if (notes.length === 0) {
      notes.push("Unknown execution failure")
    }

    return notes

  }

}