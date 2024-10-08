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


app.post('/api/openai', async (req, res) => {
    const body = req.body;
    let fullPrompt;

    // Determine the type of request and construct the prompt
    if ('identifiers' in body) {
        // Handle the first type of call
        const { identifiers, storageData } = body;
        fullPrompt = constructPromptString(identifiers, storageData);
    } else if ('companyDescription' in body) {
        // Handle the second type of call
        const { companyDescription, jobDescription, openQuestion, relatedPoints, requirements } = body;
        fullPrompt = constructPromptStringForOpenQuestion(companyDescription, jobDescription, openQuestion, relatedPoints, requirements);
    } else {
        return res.status(400).json({ error: 'Invalid request structure' });
    }

    console.log("Full OpenAI Prompt: ", fullPrompt);

    try {
        const openaiResponse = await client.post('https://api.openai.com/v1/completions', {
            prompt: fullPrompt,
            model: "gpt-3.5-turbo-instruct",
            max_tokens: 2000,
            temperature: 1,
        });
        
        // Extract the 'text' from the response and send it to the client
        const generatedText = openaiResponse.data.choices[0].text;
        console.log("GPT generated text: ", generatedText);
        res.json({ text: generatedText });

    } catch (error) {
        console.error('Error calling OpenAI:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch from OpenAI' });
    }
});

// Helper function to construct the string for the prompt
function constructPromptString(identifiers, storageData) {
    const identifiersStr = "['" + identifiers.join("','") + "']";
    const res =  `
    You have two sets of information: 
    1. (a key-value pairs to store user's data) 'storageData': `
    + storageData +
    `
    2. (an array of fields user need to fill) 'identifiers':
    `
    + identifiersStr +
    `
    Your task is to find corresponding value of key in 'storageData' to answer each element in 'identifiers' based on the provided information. Return a map where key is element in 'identifiers' and value is potential answer you find in values of  'storageData'.
    Reqirement: 
1.If no matching key is found or the corresponding found value is 'null' for a specific element in 'identifiers',you can either set value as "", or generate a answer based on storageData.
2.Your output nust is a json format:
3.Please provide the desired result (only json itself, no more other words) and this result should be a valid JSON string.
`;

    return res;
}

function constructPromptStringForOpenQuestion(companyDescription, jobDescription, openQuestion, relatedPoints, requirements){
    const principles = `
    1. Study the job description carefully.
    2. Provide relevant examples.
    3. Reflect my personality.
    4. Keep answers short, but in-depth and specific.`
    const example = "Questions:Why should we employ you? Answer:I have been following your company for a while now. The information I gathered from the job description and my research on your company shows I am more than qualified for this role. I value collaboration and have a verifiable track record of meeting and exceeding sales quotas. I believe my experience, skills, and achievements have prepared me adequately for this role. If given the opportunity, I will use my experience and skills to improve the revenue generation of your company. "
    const res = 
    `Write a answer for me for this question: ` 
    + openQuestion + 
    ` The company description is: `
    + companyDescription +
    ` The job description is: `
    + jobDescription +
    ` You need to mention some following points in your answer: `
    + relatedPoints +
    ` Please make sure your answer satisfy following principles and requirements: `
    + principles + requirements
    ;

    return res;
}
    


app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
