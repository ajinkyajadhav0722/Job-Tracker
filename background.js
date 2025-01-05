function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
       iconUrl: "refresh.png",
        title: title,
        message: message,
        priority: 2
    });
}

// Listener for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SAVE_JOB") {
        const { companyName, positionTitle } = message.data;

        const scriptURL = 'https://script.google.com/macros/s/AKfycbyI9zfx5eYZNuUavACnuKqMdHMPmDeUkAVRKK8iwbwn16tvUjLSpvENHoIdRD7F2g0pNQ/exec'; // Replace with your Web App URL

        // Send data to Google Sheets
        fetch(scriptURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyName, positionTitle })
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    showNotification("Success", `Job saved: ${positionTitle} at ${companyName}`);
                    sendResponse({ status: "success" });
                } else {
                    showNotification("Error", `Failed to save job: ${data.message}`);
                    sendResponse({ status: "error", message: data.message });
                }
            })
            .catch((error) => {
                showNotification("Error", "Error sending data to Google Sheets.");
                console.error("Error sending data to Google Sheets:", error);
                sendResponse({ status: "error", message: error.message });
            });

        // Indicate that we will respond asynchronously
        return true;
    }
});

let extractedKeywords = []; // Cache keywords for the popup

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UPDATE_KEYWORDS") {
        extractedKeywords = message.keywords;
        console.log("Keywords updated in background script:", extractedKeywords);
        sendResponse({ status: "success" });
    }
});

// Provide the cached keywords to the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_KEYWORDS") {
        sendResponse({ keywords: extractedKeywords });
    }
});
