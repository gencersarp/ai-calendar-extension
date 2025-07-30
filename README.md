# AI Event Adder for Google Calendar

This Chrome extension uses AI to extract event details from selected text and adds them to your Google Calendar.

## Features

*   Parses natural language text to identify event summaries, dates, times, and locations.
*   Uses the Gemini API for AI-powered text analysis.
*   Integrates with Google Calendar for one-click event creation.

## Setup

To use this extension, you'll need to set up your own Google Cloud credentials and a Gemini API key.

### 1. Google Cloud OAuth 2.0 Client ID

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Go to **APIs & Services > Credentials**.
4.  Click **Create Credentials > OAuth client ID**.
5.  Select **Chrome App** as the application type.
6.  Give it a name (e.g., "AI Calendar Extension").
7.  Enter your extension's ID in the "Application ID" field. You can find this in Chrome's extension management page (`chrome://extensions`) after you've loaded the extension for the first time in developer mode.
8.  Click **Create**.
9.  Copy the **Client ID**.
10. Open the `manifest.json` file in this project.
11. Replace `"YOUR_CLIENT_ID_HERE"` with the Client ID you just copied.

### 2. Gemini API Key

1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click **Create API key**.
3.  Copy the generated API key.

### 3. Install the Extension in Chrome

1.  Clone or download this repository.
2.  Open Chrome and go to `chrome://extensions`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `caledar_extension` directory.
6.  Once the extension is loaded, click on its icon in the Chrome toolbar.
7.  Go to the options page and paste your Gemini API key.

## How to Use

1.  Highlight any text on a webpage that describes an event (e.g., "Meet with the team tomorrow at 2 PM").
2.  Click the extension's icon in the toolbar.
3.  The extension will pre-fill the text area with the highlighted text.
4.  Click "Add Event". The extension will use AI to parse the text and create an event in your primary Google Calendar.
