const functions = require("firebase-functions");
const { openaiClient } = require("../openai/client");
const { HttpsError } = require("firebase-functions/v1/https");
const { runtimeConfigSecret } = require("../../runtimeConfig");

async function getSummary(textToSummarize, options = {}) {
  const { type = "chat", maxWords = 4 } = options;

  console.log(`Summarizing ${type}: "${textToSummarize.substring(0, 30)}..."`);

  if (!textToSummarize || typeof textToSummarize !== "string") {
    throw new Error("Invalid text provided for summarization.");
  }

  // Different prompts for different use cases
  const prompts = {
    chat: `You are a title generator. Create concise titles (${maxWords} words max) for conversation openers. Return ONLY the title with no prefixes, labels, or extra text.\n\nExamples:\nText: "Can you help me debug this JavaScript function?"\nTitle: JavaScript debugging\n\nText: "What's the weather like today in New York?"\nTitle: New York weather\n\nText: "I'm struggling with my math homework on calculus"\nTitle: Calculus homework\n\nText: "I need help with medication dosing calculations and recommendations"\nTitle: Medication dosing\n\nNow create a title for this text:\n${textToSummarize}`,

    chartmind: `Create a concise clinical encounter title (8-12 words). Use ONLY information explicitly stated in the transcript. DO NOT assume, infer, or make up any details. Do NOT add a possible or presumed diagnosis—describe the encounter only (chief complaint, key findings). If age/sex/demographics are not mentioned, omit them. Use clinical abbreviations. Return ONLY the title with no prefixes or labels.\n\nExamples:\nTranscript: "52yo male presents with 3 days of sore throat, fever 101F, painful swallowing. PE shows tonsillar enlargement."\nTitle: 52yo M, 3d sore throat, fever 101F, tonsillar enlargement\n\nTranscript: "Patient presents with severe right lower quadrant pain x 6 hours, nausea. McBurney's point tenderness."\nTitle: Severe RLQ pain x 6hr, nausea, McBurney's point tenderness\n\nTranscript: "Chest pressure radiating to left arm, started 2 hours ago. Diaphoretic, mild SOB."\nTitle: 2hr chest pressure radiating to L arm, diaphoresis, SOB\n\nNow create a title for this encounter:\n${textToSummarize}`,
  };

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompts[type] || prompts.chat,
        },
      ],
      max_tokens: type === "chartmind" ? 100 : 50,
      temperature: 0.3,
    });

    const generatedSummary = response.choices[0]?.message?.content
      ?.trim()
      .replace(/^"(.*)"$/, "$1")
      .replace(/^Title:\s*/i, "")
      .replace(/^Topic:\s*/i, "")
      .replace(/^Summary:\s*/i, "");

    if (!generatedSummary) {
      throw new Error("OpenAI did not return a valid summary.");
    }

    return generatedSummary;
  } catch (error) {
    console.error("Error during OpenAI summarization:", error);
    throw new Error(`Failed to get summary from OpenAI: ${error.message}`);
  }
}

exports.summarizeText = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  const textToSummarize = data.text;
  const type = data.type || "chat"; // 'chat' or 'chartmind'
  const maxWords = data.maxWords;

  if (!textToSummarize || typeof textToSummarize !== "string") {
    throw new HttpsError(
      "invalid-argument",
      'The function must be called with one argument "text" containing the string to summarize.',
    );
  }

  try {
    const summary = await getSummary(textToSummarize, { type, maxWords });
    return { summary: summary };
  } catch (error) {
    console.error("Failed to summarize text via HTTPS call:", error);
    throw new HttpsError(
      "internal",
      "Failed to summarize text due to an internal error.",
      error.message,
    );
  }
  });

exports.getSummary = getSummary;
