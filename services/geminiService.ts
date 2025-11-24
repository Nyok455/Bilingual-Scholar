
import { GoogleGenAI, Type } from "@google/genai";
import { StudySection } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to chunk text safely respecting delimiters
function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by specific markers to preserve slide/page context
  const lines = text.split('\n');

  for (const line of lines) {
    // If adding this line exceeds max length, push current chunk
    if ((currentChunk.length + line.length) > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += line + "\n";
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

export const generateStudyGuide = async (text: string): Promise<StudySection[]> => {
  const model = "gemini-2.5-flash";
  // Reduced chunk size to 4000 to strictly prevent XHR/timeout errors in browser
  const CHUNK_SIZE = 4000; 

  const systemInstruction = `
    Act as a bilingual academic expert. 
    Analyze the provided raw text (from PDF/PPTX) and generate a comprehensive study guide.
    
    The input text contains markers like "--- Slide X ---".
    
    RULES:
    1. Content: Deep-dive academic notes. No simple summaries. Include examples.
    2. Topic: Must include the source marker (e.g., "Slide 5: Title").
    3. Output: JSON format.
    4. Exam: Generate 2 MCQs per section.
    5. Visuals: Describe expected diagrams in 'visualSummary'.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { 
              type: Type.STRING, 
              description: "Main topic with Slide/Page Ref" 
            },
            visualSummary: {
              type: Type.STRING,
              description: "Caption for visuals",
              nullable: true
            },
            content: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  english: { type: Type.STRING, description: "Detailed English notes (Markdown)" },
                  chinese: { type: Type.STRING, description: "Detailed Chinese notes (Markdown)" },
                  keyTerm: { type: Type.STRING, nullable: true },
                },
                required: ["english", "chinese"]
              }
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["topic", "content"]
        }
      }
    },
    required: ["sections"]
  };

  const chunks = chunkText(text, CHUNK_SIZE);
  let allSections: StudySection[] = [];
  let errorCount = 0;

  console.log(`Processing document in ${chunks.length} parts...`);

  for (let i = 0; i < chunks.length; i++) {
    let retries = 0;
    const maxRetries = 3;
    let success = false;

    while (retries < maxRetries && !success) {
      try {
        // Backoff delay: 1s, 3s, 5s...
        const delay = 1000 + (retries * 2000);
        if (i > 0 || retries > 0) await new Promise(resolve => setTimeout(resolve, delay));

        const response = await ai.models.generateContent({
          model: model,
          contents: [
            {
              role: "user",
              parts: [{ text: `Analyze Part ${i + 1}/${chunks.length}:\n\n${chunks[i]}` }]
            }
          ],
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          }
        });

        const responseText = response.text;
        if (responseText) {
          const data = JSON.parse(responseText);
          if (data.sections && Array.isArray(data.sections)) {
            allSections = [...allSections, ...data.sections];
            success = true;
          } else {
             throw new Error("Invalid JSON structure");
          }
        }
      } catch (error) {
        console.warn(`Chunk ${i + 1} failed (Attempt ${retries + 1}):`, error);
        retries++;
        if (retries >= maxRetries) {
          errorCount++;
        }
      }
    }
  }

  if (allSections.length === 0) {
    if (errorCount > 0) {
        throw new Error(`Connection failed. Processed 0/${chunks.length} parts. Please try a smaller file.`);
    }
    throw new Error("No content generated. The document might be empty or unreadable.");
  }

  return allSections;
};
