// --- Helper: Get API Key ---
function getApiKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            if (chrome.runtime.lastError) {
                reject('Error retrieving API key: ' + chrome.runtime.lastError.message);
            } else if (result.geminiApiKey) {
                resolve(result.geminiApiKey);
            } else {
                reject('Gemini API Key not set. Please set it in the extension options.');
            }
        });
    });
}

// --- Helper: Get Google Auth Token ---
function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                reject('Could not get auth token. ' + chrome.runtime.lastError.message);
            } else if (!token) {
                 reject('Auth token received is invalid.');
            }
             else {
                resolve(token);
            }
        });
    });
}


// --- Function: Call Gemini API ---
// --- Function: Call Gemini API ---
async function callGeminiApi(apiKey, text) {
    const model = 'gemini-1.5-flash-latest'; // Or another suitable free model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
        Analyze the following text and extract event details. Provide the output ONLY as a single, valid JSON object and NOTHING ELSE. Ensure all keys and string values are enclosed in double quotes. Ensure commas are correctly placed. The JSON object MUST have these keys:
        - "summary": A concise title for the event.
        - "description": Any additional details or the original text. Use an empty string "" if none.
        - "location": The location, if mentioned. Use null if not mentioned.
        - "startDateTime": The start date and time in STRICT ISO 8601 format (YYYY-MM-DDTHH:mm:ss). Infer year/time if necessary. Use T00:00:00 for dates only. Return null if unparseable.
        - "endDateTime": The end date and time in STRICT ISO 8601 format. Calculate duration or default to 1 hour. Return null if unparseable or depends on unparseable start.

        Context: Today's date is ${new Date().toDateString()}.

        Input Text:
        "${text}"

        Valid JSON Output Only:
    `;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                "safetySettings": [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
                 ]
            }),
            
        });

        if (response.status === 400 || response.status === 403 || response.status === 401) {
            const errorData = await response.json();
            console.error("Gemini API Auth/Permission Error:", errorData);
            // Throw a specific error type for invalid key/permissions
            throw new Error('API_KEY_INVALID');
        }

        if (!response.ok) {
             const errorData = await response.json();
             console.error("Gemini API Error Response:", errorData);
            throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
             console.error("Unexpected Gemini API response structure:", data);
             throw new Error("Invalid response structure from Gemini API.");
        }

        // --- Robust JSON Extraction ---
        let rawText = data.candidates[0].content.parts[0].text;
        console.log("Raw AI Text:", rawText); // Keep this for debugging

        let jsonString = null;
        const startIndex = rawText.indexOf('{');
        const endIndex = rawText.lastIndexOf('}');

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonString = rawText.substring(startIndex, endIndex + 1);
            console.log("Extracted JSON String:", jsonString); // Debug extracted string
            try {
                // <<< Parse the extracted string >>>
                return JSON.parse(jsonString);
            } catch (parseError) {
                console.error("Failed to parse extracted JSON:", jsonString, parseError);
                // Provide more context in the error message
                throw new Error(`AI response contained JSON-like text, but it was invalid: ${parseError.message}`);
            }
        } else {
            // Handle cases where '{' or '}' are not found or in wrong order
            console.error("Could not find valid JSON block markers ({ and }) in AI response:", rawText);
            throw new Error("AI response does not appear to contain a JSON object.");
        }
        // --- End Robust JSON Extraction ---

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Ensure the error thrown clearly indicates the phase where it occurred
        throw new Error(`Error during Gemini API call or processing: ${error.message}`);
    }
}


// --- Function: Add Event to Google Calendar ---
async function addEventToCalendar(token, eventDetails) {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    // Basic validation and formatting
     if (!eventDetails.summary || !eventDetails.startDateTime || !eventDetails.endDateTime) {
        throw new Error("AI did not provide essential event details (summary, start, end).");
    }

    // Attempt to create Date objects to ensure validity before sending
    let startDate, endDate;
    try {
        startDate = new Date(eventDetails.startDateTime);
        endDate = new Date(eventDetails.endDateTime);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Invalid date format received from AI.");
        }
         // Basic check: end time should not be before start time
        if (endDate <= startDate) {
             console.warn("End date/time is not after start date/time. Adjusting end time to start + 1 hour.");
             endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
         }

    } catch(dateError){
         console.error("Error parsing dates from AI:", eventDetails.startDateTime, eventDetails.endDateTime, dateError);
         throw new Error(`Invalid date format from AI: ${dateError.message}`);
    }


    const calendarEvent = {
        summary: eventDetails.summary,
        description: eventDetails.description || '', // Optional
        location: eventDetails.location || '', // Optional
        start: {
            // Use dateTime for specific times, date for all-day events
            dateTime: startDate.toISOString(), // Use the fully parsed and validated date object
             // timeZone: 'America/Los_Angeles' // Optional: Or let Google Calendar handle it based on primary calendar's timezone
        },
        end: {
            dateTime: endDate.toISOString(),
             // timeZone: 'America/Los_Angeles' // Optional
        },
    };

     // Crude check for potential all-day event (starts and ends at midnight)
     if (startDate.getHours() === 0 && startDate.getMinutes() === 0 && startDate.getSeconds() === 0 &&
         endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getSeconds() === 0) {

         // Google Calendar API expects 'date' field for all-day, not 'dateTime'
         // And the end date should be exclusive (the day *after* the last day)
         calendarEvent.start = { date: startDate.toISOString().split('T')[0] };
         calendarEvent.end = { date: endDate.toISOString().split('T')[0] }; // End date is exclusive
     }


    console.log("Sending to Calendar API:", JSON.stringify(calendarEvent, null, 2));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(calendarEvent),
        });

        if (!response.ok) {
            const errorData = await response.json();
             console.error("Calendar API Error Response:", errorData);
            throw new Error(`Google Calendar API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Event created:', data);
        return data; // Success

    } catch (error) {
        console.error('Error adding event to Calendar:', error);
         throw error; // Re-throw
    }
}


// --- Listen for messages from popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processAndAddEvent') {
        console.log("Background script received text:", request.text);
        (async () => {
            let apiKey;
            let token;
            try {
                apiKey = await getApiKey(); // Can throw API_KEY_MISSING
                console.log("API Key retrieved from storage.");

                const eventDetails = await callGeminiApi(apiKey, request.text); // Can throw API_KEY_INVALID or other errors
                console.log("Gemini Result:", eventDetails);

                token = await getAuthToken(); // Can throw auth errors
                console.log("Auth Token retrieved.");

                const calendarResponse = await addEventToCalendar(token, eventDetails); // Can throw calendar errors
                console.log("Calendar Response:", calendarResponse);

                sendResponse({ success: true, message: `Event "${eventDetails.summary}" added successfully!`, eventLink: calendarResponse.htmlLink });

            } catch (error) {
                console.error("Error in background script:", error);
                let userMessage = `An unexpected error occurred: ${error.message || error}`; // Default message

                // <<< NEW: Specific error handling based on thrown errors >>>
                if (error === 'API_KEY_MISSING') {
                     userMessage = 'Gemini API Key not set. Please set it in the extension options.';
                     // Try to open the options page automatically
                     chrome.runtime.openOptionsPage();
                     userMessage += ' Opening options page...';
                } else if (error.message === 'API_KEY_INVALID') {
                     userMessage = 'Invalid or incorrect Gemini API Key detected. Please verify your key in the extension options.';
                     // Optionally open options page here too
                     // chrome.runtime.openOptionsPage();
                     // userMessage += ' Please check the options page.';
                 } else if (error.message && (error.message.includes('Could not get auth token') || error.message.includes('401'))) {
                     // Handle Google Auth token issues specifically if needed
                     userMessage = 'Google Calendar authorization failed. Please try again. You may need to re-authorize.';
                      // Attempt to clear potentially bad token
                      if (token) { // Check if token was obtained before failure
                           chrome.identity.removeCachedAuthToken({ token: token }, () => {
                               console.log("Attempted to remove potentially invalid cached token after error.");
                           });
                      }
                 }
                // <<< END NEW Specific error handling >>>

                sendResponse({ success: false, message: userMessage });
            }
        })();
        return true; // Indicates asynchronous response
    }
});

console.log("Background script loaded.");