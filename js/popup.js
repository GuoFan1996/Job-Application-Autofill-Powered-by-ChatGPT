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

    function loadDataToForm() {
        // 或者使用chrome.storage
        chrome.storage.local.get('formData', function(result) {
            if (result.formData) {
                const savedData = result.formData;
                populateFormWithData(savedData);
            }
        });
    }

    function populateFormWithData(formData) {
        // Iterate over all entries in the formData
        Object.keys(formData).forEach(key => {
            // Find the form element with the corresponding 'id' or 'name'
            const element = document.getElementById(key) || document.getElementsByName(key)[0];
    
            // Check if the element exists
            if (element) {
                // Handle checkboxes separately
                if (element.type === "checkbox") {
                    // Set the 'checked' property according to the formData value
                    element.checked = formData[key] === "true" || formData[key] === true;
                }
                // Handle select elements separately
                else if (element.tagName === "SELECT") {
                    // Find and select the option that matches the value from formData
                    Array.from(element.options).forEach(option => {
                        if (option.value === formData[key]) {
                            option.selected = true;
                        }
                    });
                }
                // Handle radio buttons separately
                else if (element.type === "radio") {
                    // Check the radio button that corresponds to the formData value
                    const radioToCheck = document.querySelector(`input[type="radio"][name="${key}"][value="${formData[key]}"]`);
                    if (radioToCheck) {
                        radioToCheck.checked = true;
                    }
                }
                // Handle other input types (including text, email, tel, etc.)
                else if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
                    // Set the value of the input based on formData
                    element.value = formData[key];
                }
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
                loadDataToForm();
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
            loadDataToForm(); //display data
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
    // Add event listener for form submission
    form.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevent the default form submission
        console.log("Form submitted");

        // Hide the template section and adjust body class
        templateSection.style.display = "none";
        document.body.classList.remove('popup-large');

        // Gather form data with corresponding label text and input values
        const formDataObject = {};
        console.log("start gathering data from form");

        const formGroups = document.querySelectorAll(".form-group");

        formGroups.forEach((group) => {
            const label = group.querySelector("label")?.innerText.trim(); // Use optional chaining in case label is not found
            let value;

            // Include input[type="text"], input[type="tel"], input[type="email"], textarea, selected radio, or select
            const input = group.querySelector("input[type='text'], input[type='tel'], input[type='email'], textarea, select, input[type='checkbox'], input[type='radio']:checked");

            if (input) {
                if (input.type === 'checkbox') {
                    value = input.checked ? 'yes' : 'no'; // Or any other value you want to store for checkboxes
                } else if (input.type === 'radio') {
                    value = input.checked ? input.value : null;
                } else {
                    value = input.value;
                }
            } else {
                value = null;
            }

            if (label) {
                formDataObject[label] = value;
            }
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
