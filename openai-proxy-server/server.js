const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Import the cors module

const app = express();
const PORT = 3000;

require("dotenv").config();


const apikey = process.env.OPENAI_API_KEY;
console.log(process.env.OPENAI_API_KEY);


// Middleware to handle JSON payloads
app.use(express.json());

// Use cors middleware to enable CORS (this allows any origin by default)
// In production, you might want to restrict the origins that are allowed
app.use(cors());

const client = axios.create({
    headers: {
        'Authorization': 'Bearer ' + apikey,
    },
});

// Define the constant prompt
const inititialPrompt = `
You have two sets of information: 
1. 'databaseFields': an array containing all database fields.
2. 'identifiers': an array of identifiers obtained from web form elements.
'databaseFields':
[
    "firstName", "middleName", "lastName", "phoneNumber", "email", "altPhoneNumber",
    "streetAddress", "city", "state", "zipCode", "country", "positionAppliedFor",
    "desiredSalary", "dateAvailableToStart", "institutionName", "fieldOfStudy", "educationDate",
    "company", "jobTitle", "startDate", "endDate", "jobResponsibilities", "skills",
    "legalWorkStatus", "relocateYes", "relocateNo", "travelYes", "travelNo", "convictedYes",
    "convictedNo", "howDidYouHear", "languagesSpoken", "professionalAssociations",
    "consentCheckbox", "submitButton"
]
'identifiers'(this is just for example, I will give a real one in the end):
[
    "Resume/CV","Full name✱", "Email✱", "Phone ✱", "Current company ✱", "LinkedIn URL✱"
]
Your task is to match each element in 'identifiers' to a corresponding field in 'databaseFields' based on the provided information. Return an array of matched database fields.
If no matching field is found for a specific element in 'identifiers', label it as 'not found'.
Your output array should have same length of 'identifiers' I give you later. For example 'identifiers' I gave you, your output should resemble this:
[
    "not found",
    ["firstName", "middleName", "lastName"],
    "email",
    "phoneNumber",
    "company",
    "not found"
]
Explaination: no maching field for "Resume/CV" so it's "not found",for "Full name✱", all these three field ["firstName", "middleName", "lastName"] forms "Full name✱",  "Email✱" maches to "email", "Phone ✱" matches to "phoneNumber","Current company ✱" matches to "company", and no maching field for "LinkedIn URL✱". the length of result array = the length of 'identifiers', in this example ,it's 6.
Please provide the desired result (only array, no more other words) of given databaseFields above and following 'identifiers':
`;


app.post('/api/openai', async (req, res) => {
    const { prompt } = req.body;
    const stringPrompt = "['" + prompt.join("','") + "']";
    console.log("post openai get request: ", prompt);

    try {
        const openaiResponse = await client.post('https://api.openai.com/v1/completions', {
            prompt: inititialPrompt + stringPrompt,
            model: "gpt-3.5-turbo-instruct",
            max_tokens: 1000,
            temperature:0,
            // Add other parameters as needed
        });
        
        // Extract the 'text' from the response and send it to the client
        const generatedText = openaiResponse.data.choices[0].text;
        console.log("GPT generated text: ", generatedText)
        res.json({ text: generatedText });

    } catch (error) {
        console.error('Error calling OpenAI:', error.response.data || error.message);
        res.status(500).json({ error: 'Failed to fetch from OpenAI' });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
