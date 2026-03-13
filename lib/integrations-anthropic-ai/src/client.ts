import Anthropic from "@anthropic-ai/sdk";

const customKey = process.env.CUSTOM_ANTHROPIC_API_KEY;
const integrationKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
const integrationBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

const apiKey = customKey || integrationKey;

if (!apiKey) {
  throw new Error(
    "No Anthropic API key found. Set CUSTOM_ANTHROPIC_API_KEY or provision the Anthropic AI integration.",
  );
}

export const anthropic = new Anthropic({
  apiKey,
  ...(customKey ? {} : { baseURL: integrationBaseUrl }),
});
