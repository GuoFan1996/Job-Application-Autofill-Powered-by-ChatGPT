
console.log("Content script loaded!");

// This array will store all the text labels and is declared globally
const labelMap = new Map();
// Function to call the GPT API
async function callGPTAPI(identifiers) {
    try {
        const formData = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['formData'], (result) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError.message);
                }
                resolve(result.formData);
            });
        });

        // Combine storage data with the prompt
        const combinedData = {
            identifiers: identifiers,
            storageData: JSON.stringify(formData)
        };

        // Then, make the fetch request using the combined data
        let response = await fetch('http://localhost:3000/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(combinedData)
        });

        // Check if the fetch request was successful
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        // Retrieve the generated text from the response directly
        const responseData = await response.json();

        // Check if the response data is in the expected format
        if (!responseData || !responseData.text) {
            throw new Error('Unexpected response format from OpenAI.');
        }

        // Process the response data
        const responseText = responseData.text;
        // Extract JSON string using a regular expression
        const jsonMatch = responseText.match(/{[^}]+}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in the response.');
        }

        // Parse the extracted JSON string
        const jsonPart = jsonMatch[0];
        const parsedJson = JSON.parse(jsonPart);

        console.log("Parsed JSON:", parsedJson);
        return parsedJson;

    } catch (error) {
        console.error('Error while calling OpenAI:', error);
        throw error;
    }
}

function autofill(processedData) {
    // Iterate over the processData keys
    Object.keys(processedData).forEach(label => {
        // Get the corresponding element ID or name from the labelMap
        const formElementIdentifier = labelMap.get(label);

        if (formElementIdentifier) {
            // Find the form element by ID or name
            let formElement = document.getElementById(formElementIdentifier);

            // If not found by ID, try to find it by name
            if (!formElement) {
                formElement = document.querySelector(`[name="${formElementIdentifier}"]`);
            }
            // If the form element is found, set its value
            if (formElement) {
                if (formElement.type && (formElement.type === 'checkbox' || formElement.type === 'radio')) {
                    // For checkboxes and radio buttons, you might want to match on value
                    if (formElement.value === processedData[label]) {
                        formElement.checked = true;
                    }
                } else if (formElement.type === 'file') {
                    // Skip file inputs for security reasons
                    console.warn(`Cannot programmatically set value for file input: ${formElementIdentifier}`);
                }
                else {
                    // For other input types, just set the value property
                    formElement.value = processedData[label];
                }
            } else {
                console.warn(`Form element for label "${label}" not found.`);
            }
        } else {
            console.warn(`Label "${label}" not found in labelMap.`);
        }
    });
}

chrome.runtime.onMessage.addListener(async function(request, _sender, sendResponse) {
    console.log("content.js received message:", request.message);
    if (request.message === "start_autofill") {

        // Collect all label elements in the document
        let labelElements = document.querySelectorAll('label');

        // Iterate over each label element
        labelElements.forEach(function(labelElement) {
            // Get the text content of the label element, trimming whitespace and limiting to 200 characters
            let labelText = labelElement.textContent.trim();
            if (labelText.length > 200) {
                labelText = labelText.substring(0, 197) + '...'; // Truncate and add ellipsis
            }

            // Get the associated form element using the 'for' attribute of the label
            let formElement = document.querySelector('#' + labelElement.getAttribute('for'));

            // If no form element was found with the 'for' attribute, check for nested inputs
            if (!formElement) {
                formElement = labelElement.querySelector('input, select, textarea');
            }

            // If a form element is found, store the association in the map
            if (formElement) {
                labelMap.set(labelText, formElement.id || formElement.name) ; // Use name if id is not available
            }
        });

        const keysArray = [...labelMap.keys()];
        console.log("labelMap: ",labelMap);
        // Output the allIdentifiers array to the console
        console.log("allLabels parsed successfully: ", keysArray);
        // Call the GPT API by invoking the callGPTAPI function
        const processedData = await callGPTAPI(keysArray);
        console.log("processedData :" ,processedData);
        autofill(processedData);

        sendResponse({ status: 'done' });  
    }
    
});

