// server/debug-ai.js
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    console.log("🔑 Testing API Key...");
    // 1. Just try to get the model list
    // This is the cleanest way to see what you have access to
    console.log("📋 Fetching available models...");
    
    // Note: We use the raw API call style here if the SDK helper is tricky, 
    // but let's try a direct test first.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Test");
    console.log("✅ SUCCESS! gemini-1.5-flash is working.");
    
  } catch (error) {
    console.log("\n❌ ERROR DETECTED:");
    console.log(error.message);
    
    // If that failed, let's try to guess why
    if (error.message.includes("404")) {
      console.log("\n💡 DIAGNOSIS: The model name is wrong or your API key is restricted.");
      console.log("👉 Try changing 'server/index.js' line 28 to use: 'gemini-1.0-pro'");
    }
    if (error.message.includes("400")) {
      console.log("\n💡 DIAGNOSIS: Invalid API Key.");
      console.log("👉 Check your .env file for spaces.");
    }
  }
}

listModels();