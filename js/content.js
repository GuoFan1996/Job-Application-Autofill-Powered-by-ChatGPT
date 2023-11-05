console.log("Content script loaded!");


// Function to call the GPT API
async function callGPTAPI(prompt) {
    try {
        let response = await fetch('http://localhost:3000/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: prompt })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        // Directly retrieve the generated text from the response
        const responseData = await response.json();

        console.log("gpt generated: ", responseData);

        if (!responseData || !responseData.text) {
            throw new Error('Unexpected response format from OpenAI.');
        }

        // Extract the 'text' attribute from responseData
        const responseText = responseData.text;
        console.log(responseText);
        // Replace single quotes with double quotes
        const formattedResponse = responseText.replace(/'/g, '"');

        // Convert the formatted string into an array
        const databaseKeysArray = JSON.parse(formattedResponse);
        console.log("formattedResponse is: ",databaseKeysArray);
        return databaseKeysArray; // return the parsed array directly

    } catch (error) {
        console.error('Error calling OpenAI:', error);
        throw error;
    }
}




function autofill(processedDataArray) {
    // Select all label elements on the current web page
    const labelElements = document.querySelectorAll('label');

    // Check if labelElements length is the same as processedDataArray length
    if (labelElements.length === processedDataArray.length) {
        labelElements.forEach(function (labelElement, index) {
            // Get the text content of the label element
            const labelText = labelElement.textContent.trim();

            // Check if the corresponding processData is not "not found"
            if (processedDataArray[index] !== "Not found in database") {
                // Find the corresponding input field associated with this label
                const inputField = document.getElementById(labelText);
                if (inputField) {
                    inputField.value = processedDataArray[index];
                    console.log(`Autofilled "${labelText}": ${processedDataArray[index]}`);
                }
            }
        });
    } else {
        console.error("Label elements and processed data array have different lengths.");
    }
}


chrome.runtime.onMessage.addListener(async function(request, _sender, sendResponse) {
    console.log("content.js received message:", request.message);
    if (request.message === "start_autofill") {
        // Collect all label elements in the document
        let labelElements = document.querySelectorAll('label');

        // This array will store all the text labels
        let allIdentifiers = [];

        // Iterate over each label element
        labelElements.forEach(function(labelElement) {
            // Get the text content of the label element
            let labelText = labelElement.textContent.trim();

            // Limit the labelText to 200 characters
            if (labelText.length > 200) {
                labelText = labelText.substring(0, 197) + '...'; // Truncate and add ellipsis
            }

            // Add the text label to the allIdentifiers array
            allIdentifiers.push(labelText);
            
        });

        // Output the allIdentifiers array to the console
        console.log("allIdentifiers parsed successfully: ", allIdentifiers);
        // Call the GPT API by invoking the callGPTAPI function
        const GPTresponse = await callGPTAPI(allIdentifiers);

        // Send the GPT response directly to the background script and await its response
        chrome.runtime.sendMessage({ message: "GPT_response", GPTresponse }, function(response) {
            if (response.status === "GPT response processed successfully") {
                const processedData = response.result;
                console.log("Processed data from background:", processedData);
                // Autofill the label elements with the processed data
                autofill(processedData);
            } else {
                console.error("Error processing data:", response.status);
            }
        });

        sendResponse({ status: 'done' });  
    }
    
});

