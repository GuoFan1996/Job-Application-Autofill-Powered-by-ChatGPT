// background.js
console.log("background.js script loaded!")

// Initialize Google OAuth Configuration
const googleOAuthConfig = {
    client_id: '412156803566-0afifv5ameino15ngl1jekqtcodb2q7j.apps.googleusercontent.com',
    scope: 'openid email profile',
};

/**
 * Handles Google OAuth2 sign-in process to get an authentication token.
 * @param {function} callback - The function to call with the token or null on error.
 */
function handleGoogleSignIn(callback) {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
        if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError.message); // Log the error message
            callback(null);
        } else {
            // Token obtained, you can now make requests to Google APIs with the token
            callback(token);
        }        
    });
}

// Function to perform logout
function performLogout(callback) {
    // Clear the authentication token
    chrome.identity.getAuthToken({ interactive: false }, function (currentToken) {
        if (!chrome.runtime.lastError && currentToken) {
            // Remove the cached authentication token
            chrome.identity.removeCachedAuthToken({ token: currentToken }, function () {
                if (chrome.runtime.lastError) {
                    console.error('Error clearing token:', chrome.runtime.lastError.message);
                    callback(false);
                } else {
                    // Token cleared successfully
                    console.log('Token cleared successfully.');
                    callback(true);
                }
            });
        } else {
            console.error('Error:', chrome.runtime.lastError ? chrome.runtime.lastError.message : 'No token found.');
            callback(false);
        }
    });
}

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'getAuthToken') {
        handleGoogleSignIn(function (token) {
            sendResponse(token);
        });
        return true; // Return true to indicate that we will respond asynchronously
    } else if (message.action === 'performLogout') {
        performLogout(function (success) {
            sendResponse({ success });
        });
        return true;
    } // Check if the message received is a "template_submit" action.
    else if (message.message === "template_submit") {
        // Log that we've received a message from the popup script to submit the template.
        console.log("background.js received message from popup.js: template_submit");
    
        // Retrieve the existing formData from local storage.
        chrome.storage.local.get({formData: {}}, function(result) {
            const storedFormData = result.formData; // Current form data stored.
            const incomingFormData = message.formData; // New form data to be stored.
    
            // Update the stored formData with the new values.
            for (const key in incomingFormData) {
                // Check if the key exists on the incomingFormData object to prevent prototype pollution.
                if (incomingFormData.hasOwnProperty(key)) {
                    storedFormData[key] = incomingFormData[key]; // Assign new data to the stored data.
                }
            }
    
            // Save the updated formData back to local storage.
            chrome.storage.local.set({formData: storedFormData}, function() {
                // Check if there was an error during the save process.
                if (chrome.runtime.lastError) {
                    // Log the error and send a response indicating failure to save the form data.
                    console.error("Error saving form data to chrome.storage:", chrome.runtime.lastError);
                    sendResponse({ success: false, error: "Failed to save form data." });
                } else {
                    // Log success and send a response indicating the form data was saved successfully.
                    console.log("Form data saved to chrome.storage:", storedFormData);
                    sendResponse({ success: true });
                }
            });
        });
    
        // Return true to indicate that the response will be sent asynchronously.
        return true;
    }
    
    
});

