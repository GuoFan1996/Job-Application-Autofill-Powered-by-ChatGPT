// background.js
console.log("background.js script loaded!")

// Initialize Google OAuth Configuration
const googleOAuthConfig = {
    client_id: '412156803566-0afifv5ameino15ngl1jekqtcodb2q7j.apps.googleusercontent.com',
    scope: 'openid email profile',
};

// Function to handle Google OAuth sign-in
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

// Function to process the response from GPT
async function processGPTResponse(databaseKeysArray) {
    try {
        // Retrieve formData from local storage
        const getFormData = () => {
            return new Promise((resolve, reject) => {
                chrome.storage.local.get({formData: {}}, function(result) {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Error retrieving formData from local storage.'));
                    } else {
                        resolve(result.formData);
                    }
                });
            });
        };

        const formData = await getFormData();
        const processedData = [];

        // Iterate over the databaseKeysArray
        for (const item of databaseKeysArray) {
            // Check if the item is an array of keys
            if (Array.isArray(item)) {
                // Concatenate the elements into a string
                const combinedValues = item.map(k => formData[k] || "not found").join(" ");
                processedData.push(combinedValues);
            } else {
                // Push the single value or "not found"
                processedData.push(formData[item] || "not found");
            }
        }

        return processedData;
    } catch (error) {
        console.error("Error processing GPT response:", error);
        throw error;
    }
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
    } else if (message.message === "template_submit") {
        console.log("background.js received message from popup.js: template_submit");
    
        // 从本地存储中获取现有的 formData
        chrome.storage.local.get({formData: {}}, function(result) {
            const storedFormData = result.formData;
            const incomingFormData = message.formData;
    
            // 更新存储的 formData
            for (const key in incomingFormData) {
                if (incomingFormData.hasOwnProperty(key)) {
                    storedFormData[key] = incomingFormData[key];
                }
            }
    
            // 将更新后的 formData 保存回本地存储
            chrome.storage.local.set({formData: storedFormData}, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error saving form data to chrome.storage:", chrome.runtime.lastError);
                    sendResponse({ success: false, error: "Failed to save form data." });
                } else {
                    console.log("Form data saved to chrome.storage:", storedFormData);
                    sendResponse({ success: true });
                }
            });
        });
    
        return true; // Indicates that you wish to send a response asynchronously
    }
     else if (message.message === "GPT_response") {
        (async () => {
            try {

                // Process the GPT response to obtain processedData
                const processedData = await processGPTResponse(message.GPTresponse);
    
                // You can now use the processedData as needed in your background script
                console.log("Processed Data:", processedData);
    
                //send a response back to the content script
                sendResponse({ status: "GPT response processed successfully", result: processedData });
            } catch (error) {
                console.error("Error processing GPT response:", error);
                sendResponse({ status: "Error processing GPT response", error: error.toString() });
            }
        })();
        return true;  // Keeps the message channel open until sendResponse is called
    }
    
});

