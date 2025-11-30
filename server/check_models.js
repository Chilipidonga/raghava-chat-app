// server/check_models.js
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

console.log("\n🔍 --- DIAGNOSTIC START ---");

// 1. Check Key Format
if (!apiKey) {
    console.error("❌ ERROR: No API Key found in .env file.");
    process.exit(1);
}

console.log(`✅ API Key Loaded: ${apiKey.substring(0, 8)}...`);
console.log(`📏 Key Length: ${apiKey.length} characters`);

if (apiKey.includes(" ")) {
    console.error("❌ CRITICAL ERROR: Your API Key contains a SPACE. Please remove it in .env!");
} else {
    console.log("✅ No hidden spaces detected.");
}

// 2. Ask Google for Available Models
async function getModels() {
    console.log("\n📡 Connecting to Google Servers to list models...");
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("\n❌ GOOGLE API ERROR:");
            console.error(`Code: ${data.error.code}`);
            console.error(`Message: ${data.error.message}`);
        } else {
            console.log("\n✅ SUCCESS! Here are the models your key can use:");
            console.log("------------------------------------------------");
            // Filter only 'generateContent' models
            const chatModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
            
            chatModels.forEach(m => {
                // We strip 'models/' from the name so we know exactly what to put in code
                console.log(`👉 "${m.name.replace('models/', '')}"`);
            });
            console.log("------------------------------------------------");
            console.log("Use one of the names above in your index.js file.");
        }
    } catch (err) {
        console.error("❌ NETWORK ERROR:", err.message);
    }
}

getModels();