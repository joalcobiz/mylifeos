

import { GoogleGenAI } from "@google/genai";

// Try to get key from environment
const getApiKey = () => {
    if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
    return '';
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- MOCK DATA GENERATORS ---
const getMockPlaceDetails = (query: string) => ({
    name: query || "Mock Place",
    address: "123 Example St",
    city: "San Francisco",
    state: "CA",
    website: "https://example.com",
    latitude: 37.7749,
    longitude: -122.4194,
    type: "Restaurant",
    googleInfo: {
        summary: `A popular spot matching "${query}" known for its vibrant atmosphere.`,
        vibe: "Lively and Casual",
        reviewSummary: "Visitors love the service and the signature dishes. Highly rated for weekend brunches.",
        bestTime: "Weekdays before 6 PM",
        tip: "Try the house special coffee."
    }
});

const getMockSentiment = () => 
    "The entries reflect a generally positive and productive week. Key themes include: 1) Progress on creative projects, 2) Enjoyment of outdoor activities, and 3) A focus on health and wellness.";

const getMockSubtasks = (projectName: string) => [
    `Define scope for ${projectName}`,
    "Research required resources",
    "Draft initial outline",
    "Review with stakeholders",
    "Execute phase 1",
    "Finalize documentation"
];

const getMockResearch = (query: string) => ({
    averagePrice: 99.99,
    currency: "USD",
    summary: `Based on a simulated search for ${query}, this item is highly rated for its durability and design.`,
    topBrand: "MockBrand"
});

// --- API FUNCTIONS ---

// 1. Google Maps Grounding
export const searchPlaceDetails = async (query: string): Promise<any> => {
  if (!ai) {
    console.log("Gemini API Key missing. Returning Mock Data.");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network
    return getMockPlaceDetails(query);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find details for the place: "${query}". Return a JSON object with: 
      - name
      - address
      - city
      - state
      - website (if any)
      - latitude (number)
      - longitude (number)
      - type (one of: Restaurant, Cafe, Park, Gym, Library, Museum, Theater, Shop, Office, Other)
      - googleInfo: {
          summary: "Brief 1 sentence description",
          vibe: "e.g. Cozy, Busy, Romantic",
          reviewSummary: "Summary of what people say in reviews",
          bestTime: "Best time to visit",
          tip: "One pro tip for visiting"
      }`,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });

    let text = response.text;
    if (!text) return null;
    
    text = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching place details:", error);
    return getMockPlaceDetails(query); // Fallback on error
  }
};

// 2. Gemini Intelligence (Content Analysis)
export const analyzeSentiment = async (entries: string[]): Promise<string> => {
    if (entries.length === 0) return "No data to analyze.";
    if (!ai) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getMockSentiment();
    }
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze these journal entries and provide a brief 2-sentence sentiment summary and 3 key themes. Entries: ${JSON.stringify(entries)}`
        });
        return response.text || "Could not analyze.";
    } catch (e) {
        return getMockSentiment();
    }
};

// 2. Gemini Intelligence (Generation)
export const generateSubtasks = async (projectName: string): Promise<string[]> => {
    if (!ai) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getMockSubtasks(projectName);
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate 5-7 distinct, actionable subtasks for a project named "${projectName}". Return only a JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (e) {
        return getMockSubtasks(projectName);
    }
};

// 3. Google Search Grounding (New)
export const researchItem = async (itemName: string): Promise<{ averagePrice: number, currency: string, summary: string, topBrand: string }> => {
    if (!ai) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getMockResearch(itemName);
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Research the item "${itemName}". 
            1. Find the current average market price.
            2. Summarize the general sentiment/reviews in 1 sentence.
            3. Identify the most popular brand.
            Return JSON: { "averagePrice": number, "currency": "USD", "summary": string, "topBrand": string }`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            }
        });
        
        let text = response.text;
        if (!text) return getMockResearch(itemName);
        return JSON.parse(text);
    } catch (e) {
        console.error("Error researching item:", e);
        return getMockResearch(itemName);
    }
};