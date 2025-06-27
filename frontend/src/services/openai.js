import schema from '../schema.json';
import { createTestValue } from '../utils/schema';
import config from '../config/config';

const SYSTEM_PROMPT = `You are a message encoder that helps convert natural language messages into a structured format according to a specific schema. Your response must be in JSON format. The schema defines specific actions, targets, time formats, locations, and flags.

The schema is:
${JSON.stringify(schema, null, 2)}

Your task is to:
1. Take a natural language message
2. Match it to the closest available options in the schema
3. Return a JSON response with:
   - The matched values from the schema (using exact values from the schema entries)
   - A human-readable explanation of how the message was interpreted

Rules:
1. All fields must match exactly to values in the schema entries
2. Time must be in 24-hour format (00:00-23:59)
3. Time modifiers must be one of: "exact" (0), "before" (1), "after" (2), or "approximate" (3)
4. Location must match one of the schema locations exactly
5. Flags must be either "stealth" (0) or "urgent" (1)
6. For each field, you must return the exact string from the schema entries
7. For action and target, you must find the closest matching entry from the schema

Example input: "Urgently need to activate the beacon at exactly 15:30 at HQ"
Example JSON output: {
  "matches": {
    "action": "activate",
    "actionIndex": 1,
    "target": "beacon",
    "targetIndex": 8,
    "when": "15:30",
    "timeModifier": "exact",
    "timeModifierIndex": 0,
    "where": "HQ",
    "whereIndex": 0,
    "flags": "urgent",
    "flagsIndex": 1
  },
  "explanation": "Interpreted as an urgent activation of the beacon, scheduled for exactly 15:30 at HQ."
}

Remember to always return your response in valid JSON format.`;

// Helper function to extract hour and minute from time string
const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

// Helper function to find index of a value in schema entries
const findSchemaIndex = (field, value) => {
  const entries = schema.fields[field].entries;
  return Object.entries(entries).find(([_, v]) => v === value)?.[0] || '0';
};

export const openai = {
  interpretMessage: async (message) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4-0125-preview",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: `Please convert the following message to JSON format according to the schema: "${message}"`
            }
          ],
          temperature: 0.1, // Low temperature for more consistent outputs
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to interpret message');
      }

      const data = await response.json();
      const interpretation = JSON.parse(data.choices[0].message.content);

      // Extract indices and time components
      const { hours, minutes } = parseTime(interpretation.matches.when);
      const actionIndex = parseInt(interpretation.matches.actionIndex);
      const targetIndex = parseInt(interpretation.matches.targetIndex);
      const whereIndex = parseInt(interpretation.matches.whereIndex);
      const timeModifierIndex = parseInt(interpretation.matches.timeModifierIndex);
      const flagsIndex = parseInt(interpretation.matches.flagsIndex);

      // Generate the cm value using createTestValue
      const cm = createTestValue(
        actionIndex,
        targetIndex,
        hours,
        minutes,
        whereIndex,
        flagsIndex,
        timeModifierIndex
      );

      return {
        ...interpretation,
        cm: cm.toString()
      };
    } catch (error) {
      console.error('Error interpreting message:', error);
      throw error;
    }
  }
}; 