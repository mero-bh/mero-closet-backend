
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '../../.env' });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; 
    // Actually there is a listModels method on the client usually, but unrelated to specific model instance.
    // The SDK structure might be different.
    // Let's check available models via direct API call if SDK doesn't expose it easily in this version or use a known list script.
    
    // Using fetch for listing
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
        console.log("Available Models:");
        data.models.forEach(m => {
            if(m.name.includes("gemini")) console.log(`- ${m.name}`);
        });
    } else {
        console.log("No models found or error:", data);
    }

  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
