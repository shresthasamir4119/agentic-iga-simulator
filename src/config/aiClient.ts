import "dotenv/config";
import OpenAI from "openai";

const baseURL = process.env.OPEN_WEIGHT_LLM_URL ?? "http://localhost:11434/v1";
const apiKey = process.env.OPEN_WEIGHT_LLM_KEY ?? "ollama";

if (baseURL.toLowerCase().includes("groq") && apiKey === "ollama") {
  console.warn(
    "OPEN_WEIGHT_LLM_URL points to Groq, but OPEN_WEIGHT_LLM_KEY is still set to the default \"ollama\" value. Configure a valid Groq API key.",
  );
}

export const aiClient = new OpenAI({
  baseURL,
  apiKey,
});
