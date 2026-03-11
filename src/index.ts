// FILE: src/index.ts

import "dotenv/config"
import express from "express"
import cors from "cors"

import { AIEngine } from "./engine/ai-engine"

const app = express()

app.use(cors())
app.use(express.json())

const engine = new AIEngine()

app.get("/", (req, res) => {

  res.json({
    service: "AI Coding Engine",
    status: "running"
  })

})

app.post("/run", async (req, res) => {

  const { prompt } = req.body

  const result = await engine.run(prompt)

  res.json(result)

})

app.listen(8080, () => {

  console.log("AI Coding Engine running on port 8080")

})