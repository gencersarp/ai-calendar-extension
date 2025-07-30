// content.js - Relatively simple for this use case
console.log("Calendar Event content script loaded.");

// No active listeners needed if relying on background context menu's info.selectionText
// If you needed more complex interaction (e.g., getting specific DOM elements),
// you would add message listeners here:
/*
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelection") {
    sendResponse({ selection: window.getSelection().toString() });
  }
});
*/