import Anthropic from "@anthropic-ai/sdk";

const customKey = process.env.CUSTOM_ANTHROPIC_API_KEY;
const integrationKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
const integrationBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

const apiKey = customKey || integrationKey;

if (!apiKey) {
  console.warn(
    "WARNING: No Anthropic API key found. AI features will not work. Set CUSTOM_ANTHROPIC_API_KEY or provision the Anthropic AI integration.",
  );
}

export const anthropic = apiKey
  ? new Anthropic({
      apiKey,
      ...(customKey ? {} : { baseURL: integrationBaseUrl }),
    })
  : (null as unknown as Anthropic);
