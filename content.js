let lastExtractedJob = null; // Cache the last extracted job to prevent duplicates
let observerActive = false; // Track if MutationObserver is active

// Extract job details from JSON-LD structured data
function extractFromJSONLD() {
    try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (let script of scripts) {
            const jsonData = JSON.parse(script.textContent);
            if (jsonData["@type"] === "JobPosting") {
                const companyName = jsonData.hiringOrganization?.name || "Unknown Company";
                const positionTitle = jsonData.title || "Unknown Position";
                console.log("Extracted from JSON-LD:", { companyName, positionTitle });
                return { companyName, positionTitle };
            }
        }
    } catch (error) {
        console.error("Error extracting JSON-LD data:", error);
    }
    return { companyName: null, positionTitle: null };
}

// Extract job details from metadata
function extractFromMetadata() {
    let companyName = null;
    let positionTitle = null;

    try {
        const metaTitle = document.querySelector('meta[property="og:title"], meta[name="title"], meta[name="jobTitle"]');
        const metaCompany = document.querySelector('meta[property="og:site_name"], meta[name="application-name"], meta[name="company"]');

        if (metaTitle) {
            positionTitle = metaTitle.content.trim();
            console.log("Position extracted from metadata:", positionTitle);
        }
        if (metaCompany) {
            companyName = metaCompany.content.trim();
            console.log("Company extracted from metadata:", companyName);
        }

        // Filter out irrelevant or generic data
        if (companyName && /(Glassdoor|Review|Companies)/i.test(companyName)) {
            companyName = null;
        }
        if (positionTitle && /(Glassdoor|Jobs|Search)/i.test(positionTitle)) {
            positionTitle = null;
        }
    } catch (error) {
        console.error("Error extracting metadata:", error);
    }

    return { companyName, positionTitle };
}

// Extract job details using heuristic text analysis
function heuristicExtractJobDetails() {
    const rawText = document.body.innerText.split('\n').map(line => line.trim());

    let companyName = null;
    let positionTitle = null;

    rawText.forEach((line, index) => {
        if (!companyName && /(company|employer|organization)/i.test(line)) {
            companyName = rawText[index + 1] || line;
        }
        if (!positionTitle && /(job title|position|role)/i.test(line)) {
            positionTitle = rawText[index + 1] || line;
        }
    });

    // Filter out irrelevant Glassdoor-specific terms
    if (companyName && /(Glassdoor|Review|Companies)/i.test(companyName)) {
        companyName = null;
    }
    if (positionTitle && /(Glassdoor|Jobs|Search)/i.test(positionTitle)) {
        positionTitle = null;
    }

    return {
        companyName: companyName ? companyName.replace(/[^a-zA-Z0-9\s]/g, '').trim() : null,
        positionTitle: positionTitle ? positionTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim() : null
    };
}

// Unified extraction function
function extractJobDetails() {
    // 1. Try JSON-LD structured data
    const jsonLD = extractFromJSONLD();
    if (jsonLD.companyName && jsonLD.positionTitle) return jsonLD;

    // 2. Try metadata with filtering
    const metadataDetails = extractFromMetadata();
    if (metadataDetails.companyName && metadataDetails.positionTitle) return metadataDetails;

    // 3. Fallback to heuristic text analysis
    const heuristicDetails = heuristicExtractJobDetails();
    return heuristicDetails;
}

// Check if job details are duplicates
function isDuplicate(jobDetails) {
    if (!lastExtractedJob) return false; // No previous job details to compare
    return (
        jobDetails.companyName === lastExtractedJob.companyName &&
        jobDetails.positionTitle === lastExtractedJob.positionTitle
    );
}

// Add event listener to "Apply" buttons
function addClickListeners() {
    const applyButtons = document.querySelectorAll('button, a');
    applyButtons.forEach(button => {
        if (button.innerText.toLowerCase().includes("apply")) {
            button.addEventListener("click", () => {
                console.log("Apply button clicked. Extracting job details...");
                const jobDetails = extractJobDetails();

                if (jobDetails.companyName && jobDetails.positionTitle) {
                    if (!isDuplicate(jobDetails)) {
                        lastExtractedJob = jobDetails; // Cache the last job details
                        console.log("Extracted Job Details:", jobDetails);
                        chrome.runtime.sendMessage({
                            type: "SAVE_JOB",
                            data: jobDetails
                        });
                    } else {
                        console.log("Duplicate job details detected. Skipping save.");
                    }
                } else {
                    console.error("Failed to extract job details.");
                }
            });
        }
    });
}

// Monitor dynamically loaded content for "Apply" buttons
const observer = new MutationObserver(() => {
    if (!observerActive) {
        observerActive = true;
        console.log("Observing dynamic content for Apply buttons...");
        addClickListeners(); // Add listeners to dynamically loaded buttons
        setTimeout(() => {
            observerActive = false; // Reset observer state after 5 seconds
        }, 5000);
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Extract job descriptions from the page
function extractJobDescription() {
    // Select specific elements that likely contain the job description
    const jobDescriptionElements = document.querySelectorAll('.job-description, .job-details, .responsibilities, .requirements, .skills'); 
    let jobDescriptionText = "";

    jobDescriptionElements.forEach((el) => {
        jobDescriptionText += el.innerText + " ";
    });

    console.log("Refined Job Description Text:", jobDescriptionText);
    return jobDescriptionText;
}

// Analyze and find keywords
function findKeywords(jobDescription) {
    const stopWords = [
        "the", "and", "to", "of", "in", "a", "for", "with", "on", "is", "are", "as", "at", "by", "this", "that", "an", "or",
        "our", "your", "you", "site", "click", "agree", "decline", "manage", "preferences", "content", "partners",
        "use", "such", "cookies", "information", "summary", "access", "technologies"
    ]; // Add irrelevant terms to this list
    const wordFrequency = {};

    const words = jobDescription
        .toLowerCase()
        .replace(/[^a-z\s]/g, "") // Remove non-alphabetical characters
        .split(/\s+/); // Split by whitespace

    words.forEach((word) => {
        if (!stopWords.includes(word) && word.length > 2) {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
    });

    // Sort keywords by frequency
    const sortedKeywords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Top 20 keywords

    console.log("Filtered Top Keywords:", sortedKeywords);
    return sortedKeywords;
}

// Send keywords to the popup
function sendKeywordsToPopup() {
    const jobDescription = extractJobDescription();
    const keywords = findKeywords(jobDescription);

    // Send keywords to background script
    chrome.runtime.sendMessage(
        { type: "UPDATE_KEYWORDS", keywords },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending keywords to popup:", chrome.runtime.lastError);
            } else {
                console.log("Keywords sent to popup:", response);
            }
        }
    );
}

// Automatically extract and send keywords when content script loads
console.log("Content script loaded.");
sendKeywordsToPopup();
