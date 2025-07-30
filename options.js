const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('saveButton');
const statusElement = document.getElementById('optionsStatus');

// Load saved key on page load
chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
    }
});

// Save key when button is clicked
saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
            statusElement.textContent = 'API Key saved! You can close this tab.';
            statusElement.className = 'success';
            setTimeout(() => { statusElement.textContent = ''; }, 3000);
        });
    } else {
        statusElement.textContent = 'Please enter an API Key.';
         statusElement.className = 'error';
    }
});