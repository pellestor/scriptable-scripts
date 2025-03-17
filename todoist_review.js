// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: magic;

// Fetch API keys securely from Scriptable’s Keychain
const TODOIST_API_KEY = Keychain.get("TODOIST_API_KEY");
const OPENAI_API_KEY = Keychain.get("OPENAI_API_KEY");

// Define project and section IDs
const INBOX_PROJECT_ID = "2240869572";  // Replace with your Inbox project ID
const REVIEWED_SECTION_ID = "185733968";  // Replace with your REVIEWED section ID

const axios = importModule("axios");  // Import axios for HTTP requests

// Check if API keys exist
if (!TODOIST_API_KEY || !OPENAI_API_KEY) {
    console.error("❌ ERROR: Missing API Keys in Keychain.");
    console.error("Store them using: Keychain.set('TODOIST_API_KEY', 'your_key')");
    return;
}

// Function to fetch tasks from Todoist Inbox
async function fetchInboxTasks() {
    try {
        const response = await axios.get("https://api.todoist.com/rest/v2/tasks", {
            headers: { "Authorization": `Bearer ${TODOIST_API_KEY}` }
        });

        return response.data.filter(task => task.project_id === INBOX_PROJECT_ID && !task.section_id);
    } catch (error) {
        console.error("❌ Error fetching tasks:", error);
        return [];
    }
}

// Function to process task text using OpenAI
async function processTaskText(text) {
    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4",
            messages: [{
                role: "system",
                content: "Fix spelling and grammar, translate to French if needed, and ensure it does not exceed 255 characters."
            }, {
                role: "user",
                content: text
            }],
            max_tokens: 256
        }, {
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("❌ Error processing text:", error);
        return text;  // Return original text if API fails
    }
}

// Function to update task content in Todoist
async function updateTaskContent(taskId, newContent) {
    try {
        await axios.post(`https://api.todoist.com/rest/v2/tasks/${taskId}`, {
            content: newContent
        }, {
            headers: {
                "Authorization": `Bearer ${TODOIST_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        console.log(`✅ Task Updated: ${newContent}`);
    } catch (error) {
        console.error("❌ Error updating task:", error);
    }
}

// Function to move the task to the "REVIEWED" section
async function moveTaskToReviewed(taskId) {
    try {
        await axios.post(`https://api.todoist.com/rest/v2/tasks/${taskId}/move`, {
            section_id: REVIEWED_SECTION_ID
        }, {
            headers: {
                "Authorization": `Bearer ${TODOIST_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        console.log(`📂 Task moved to 'REVIEWED' section.`);
    } catch (error) {
        console.error("❌ Error moving task:", error);
    }
}

// Function to process all inbox tasks
async function processInboxTasks() {
    const tasks = await fetchInboxTasks();

    if (tasks.length === 0) {
        console.log("No tasks to process.");
        return;
    }

    console.log(`📌 Processing ${tasks.length} tasks...`);

    for (let task of tasks) {
        const newText = await processTaskText(task.content);
        await updateTaskContent(task.id, newText);
        await moveTaskToReviewed(task.id);
    }

    console.log("🎉 All tasks reviewed and moved to 'REVIEWED' section.");
}

// Execute script
await processInboxTasks();
