// Fetch keywords from background script
chrome.runtime.sendMessage({ type: "GET_KEYWORDS" }, (response) => {
    const keywordsContainer = document.getElementById("keywords-container");
    if (response.keywords && response.keywords.length > 0) {
        keywordsContainer.innerHTML = ""; // Clear loading text

        const technicalSkills = [];
        const softSkills = [];
        const industryTerms = [];

        response.keywords.forEach(([word, count]) => {
            if (["sql", "python", "tableau", "google analytics"].includes(word)) {
                technicalSkills.push(`${word} (${count} times)`);
            } else if (["communication", "collaboration", "problem-solving"].includes(word)) {
                softSkills.push(`${word} (${count} times)`);
            } else {
                industryTerms.push(`${word} (${count} times)`);
            }
        });

        // Add categories to the popup
        if (technicalSkills.length) {
            const techHeader = document.createElement("h3");
            techHeader.innerText = "Technical Skills";
            keywordsContainer.appendChild(techHeader);
            technicalSkills.forEach((skill) => {
                const skillElement = document.createElement("div");
                skillElement.className = "keyword";
                skillElement.textContent = skill;
                keywordsContainer.appendChild(skillElement);
            });
        }

        if (softSkills.length) {
            const softHeader = document.createElement("h3");
            softHeader.innerText = "Soft Skills";
            keywordsContainer.appendChild(softHeader);
            softSkills.forEach((skill) => {
                const skillElement = document.createElement("div");
                skillElement.className = "keyword";
                skillElement.textContent = skill;
                keywordsContainer.appendChild(skillElement);
            });
        }

        if (industryTerms.length) {
            const industryHeader = document.createElement("h3");
            industryHeader.innerText = "Industry Terms";
            keywordsContainer.appendChild(industryHeader);
            industryTerms.forEach((term) => {
                const termElement = document.createElement("div");
                termElement.className = "keyword";
                termElement.textContent = term;
                keywordsContainer.appendChild(termElement);
            });
        }
    } else {
        keywordsContainer.innerHTML = "<p>No relevant keywords found.</p>";
    }
});
