import OpenAI from "openai";

const customKey = process.env.CUSTOM_OPENAI_API_KEY;
const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const integrationBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const apiKey = customKey || integrationKey;

if (!apiKey) {
  throw new Error(
    "No OpenAI API key found. Set CUSTOM_OPENAI_API_KEY or provision the OpenAI AI integration.",
  );
}

export const openai = new OpenAI({
  apiKey,
  ...(customKey ? {} : { baseURL: integrationBaseUrl }),
});
