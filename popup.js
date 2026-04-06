const eventTextInput = document.getElementById('eventText');
const addEventButton = document.getElementById('addEventButton');
const statusElement = document.getElementById('status');
const mainContent = document.querySelector('body'); // Or a specific container div

// --- NEW: Function to display the API key prompt ---
function showApiKeyPrompt() {
    // Check if prompt already exists
    if (document.getElementById('apiKeyPrompt')) {
        return;
    }

    const promptDiv = document.createElement('div');
    promptDiv.id = 'apiKeyPrompt';
    promptDiv.style.padding = '10px';
    promptDiv.style.backgroundColor = '#fff3cd'; // Light yellow background
    promptDiv.style.border = '1px solid #ffeeba';
    promptDiv.style.borderRadius = '4px';
    promptDiv.style.marginBottom = '10px';
    promptDiv.style.fontSize = '0.9em';

    promptDiv.innerHTML = `
        <strong>API Key Needed:</strong> Please set your Google AI (Gemini) API key first.
        <button id="goToOptionsButton" style="margin-left: 10px; padding: 3px 8px; cursor: pointer;">Go to Options</button>
    `;

    // Insert prompt before the textarea
    mainContent.insertBefore(promptDiv, mainContent.firstChild);

    // Add listener to the new button
    document.getElementById('goToOptionsButton').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Disable main controls
    eventTextInput.disabled = true;
    addEventButton.disabled = true;
    eventTextInput.placeholder = "Set API Key in Options first...";
}

// --- NEW: Check for API key when popup loads ---
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (!result.geminiApiKey || result.geminiApiKey.trim() === "") {
            showApiKeyPrompt();
        } else {
            // Key exists, ensure controls are enabled (in case they were disabled before)
            eventTextInput.disabled = false;
            addEventButton.disabled = false;
            eventTextInput.placeholder = "e.g., Team meeting next Tuesday at 3pm..."; // Reset placeholder
        }
    });
});
// --- END NEW Checks ---


// Ctrl+Enter / Cmd+Enter submits without leaving the textarea
eventTextInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!addEventButton.disabled) {
            addEventButton.click();
        }
    }
});

addEventButton.addEventListener('click', () => {
    const text = eventTextInput.value.trim();
    // Don't check for API key here again, background script handles it.
    // Just check if text is empty.
    if (!text) {
        statusElement.textContent = 'Please paste some event text.';
        statusElement.className = 'error';
        return;
    }

    statusElement.textContent = 'Processing with AI...';
    statusElement.className = '';
    addEventButton.disabled = true; // Prevent multiple clicks

    chrome.runtime.sendMessage({ action: 'processAndAddEvent', text: text }, (response) => {
        // ... (rest of the response handling is unchanged) ...
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            statusElement.textContent = 'Error communicating with background script: ' + chrome.runtime.lastError.message;
            statusElement.className = 'error';
        } else if (response) {
             if (response.success) {
                 statusElement.textContent = response.message;
                 statusElement.className = 'success';
                 if (response.eventLink) {
                     statusElement.innerHTML += ` <a href="${response.eventLink}" target="_blank">[View Event]</a>`;
                 }
                  // Clear text area on success
                  eventTextInput.value = '';
             } else {
                 statusElement.textContent = response.message; // Display specific error from background
                 statusElement.className = 'error';
             }
        } else {
            statusElement.textContent = 'Received an empty response from the background script.';
            statusElement.className = 'error';
        }
        // Re-enable button only if API key exists (check again in case options were opened)
         chrome.storage.sync.get(['geminiApiKey'], (result) => {
             if (result.geminiApiKey && result.geminiApiKey.trim() !== "") {
                  addEventButton.disabled = false;
             } else {
                 // If key is STILL missing, keep button disabled and maybe show prompt again
                 showApiKeyPrompt();
             }
         });
    });
});