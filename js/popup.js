document.addEventListener("DOMContentLoaded", function () {
    // Get references to the buttons
    const loginButton = document.getElementById("login");
    const createTemplateButton = document.getElementById('createTemplateButton');
    const autofillButton = document.getElementById("autofill");
    const logoutButton = document.getElementById("logout");
    const templateSection = document.getElementById("templateSection");
    const form = document.getElementById("jobApplicationForm");

    // Function to send a message to background.js to get auth token
    function getAuthToken(callback) {
        chrome.runtime.sendMessage({ action: 'getAuthToken' }, function (token) {
            callback(token);
        });
    }

    // Function to send a message to background.js to perform logout
    function performLogout() {
        chrome.runtime.sendMessage({ action: 'performLogout' }, function (response) {
            if (response && response.success) {
                // Logout was successful
                console.log("Logout successful.");
                // Hide the "logout" button and show the "login" button
                logoutButton.style.display = "none";
                loginButton.style.display = "block";
                // Hide the "createTemplateButton" and "autofillButton"
                createTemplateButton.style.display = "none";
                autofillButton.style.display = "none";
            } else {
                // Logout failed
                console.error("Logout failed.");
            }
        });
    }

    // Check the user's authentication status when the popup is opened
    getAuthToken(function (token) {
        if (token) {
            // User is authenticated
            console.log("User is authenticated. Token:", token);
            // Hide the "login" button and show the "logout" button
            loginButton.style.display = "none";
            logoutButton.style.display = "block";
            // Show the "createTemplateButton" and "autofillButton"
            createTemplateButton.style.display = "block";
            autofillButton.style.display = "block";
        } else {
            // User is not authenticated
            console.log("User is not authenticated.");
            // Show the "login" button and hide the "logout" button
            loginButton.style.display = "block";
            logoutButton.style.display = "none";
            // Hide the "createTemplateButton" and "autofillButton"
            createTemplateButton.style.display = "none";
            autofillButton.style.display = "none";
        }
    });


    // Add event listener for login button
    loginButton.addEventListener("click", function () {
        // Handle login using getAuthToken
        getAuthToken(function (token) {
            // Use the token for further actions or API requests
            if (token) {
                // User is authenticated
                console.log("User is authenticated. Token:", token);
                // Hide the "login" button and show the "logout" button
                loginButton.style.display = "none";
                logoutButton.style.display = "block";
                // Show the "createTemplateButton" and "autofillButton"
                createTemplateButton.style.display = "block";
                autofillButton.style.display = "block";
            } else {
                // Authentication failed
                console.log("Authentication failed.");
            }
        });
    });

    // Add a click event listener to the button
    createTemplateButton.addEventListener('click', function () {
        if (templateSection.style.display === "none" || templateSection.style.display === "") {
            templateSection.style.display = "block";
            document.body.classList.add('popup-large');
        } else {
            templateSection.style.display = "none";
            document.body.classList.remove('popup-large');
        }
    });

    // Add event listener for autofill button
    autofillButton.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            let activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, { message: "start_autofill" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.error(JSON.stringify(chrome.runtime.lastError, null, 2));
                } else {
                    console.log("Response from content script:", response);
                }
            });
            
        });
    });

    // Add event listener for the "logout" button
    logoutButton.addEventListener("click", function () {
        // Call the performLogout function to initiate logout
        performLogout();
    });

    // Add event listener for form submission
    form.addEventListener("submit", function (event) {
        console.log("Form submitted");
        templateSection.style.display = "none";
        document.body.classList.remove('popup-large');
        event.preventDefault(); // Prevent the default form submission

        // Gather form data from elements with the "database" class
        const formDataObject = {};
        console.log("start gathering data from form");
        const databaseInputs = document.querySelectorAll(".database");
        
        databaseInputs.forEach((input) => {
            formDataObject[input.id] = input.value;
        });

        console.log("form data collected:", formDataObject);

        // Send the form data to the content script
        sendFormDataToBackgroundScript(formDataObject);
    });

    // Function to send form data to background script
    function sendFormDataToBackgroundScript(formData) {
        chrome.runtime.sendMessage({ message: "template_submit", formData: formData }, function (response) {
            if (chrome.runtime.lastError) {
                console.error(JSON.stringify(chrome.runtime.lastError, null, 2));
            } else {
                console.log("Response from background script:", response);
            }
        });

    }


});
