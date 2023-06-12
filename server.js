require("dotenv").config();
const express = require("express");
const app = express();
const axios = require("axios");
const { Configuration, OpenAIApi } = require("openai");
const http = require("http");
const WebSocket = require("ws");
const server = http.createServer(express);

const wss = new WebSocket.Server({ server });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API,
});
const openai = new OpenAIApi(configuration);
const port = 3000 || process.env.PORT;

function QueryDB(query_prompt) {
  const url = process.env.PINECONE_URL;
  const headers = {
    "Content-Type": "application/json",
    accept: "application/json",
    "Api-Key": process.env.PINECONE_API,
  };
  const data = {
    vector: query_prompt,
    top_k: 5,
    includeMetadata: true,
    namespace: "",
  };

  return axios
    .post(url, data, { headers: headers })
    .then((response) => {
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`Error: ${response.status} : ${response.data}`);
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

function PromptEnhancement(question, previous) {
  const prompt = `
Assume you are chatbot and you have answered to the previous question=${previous}, and understand the context of previous question and follow up question=${question}
based on the above all data and context(refer the data it as Fampay FAQ), answer the follow up question, also provide the link of this information(if available) as "to find out more".
Be supportive,problem solving, more human, friendly, humourous and easy. Use simple, precise and clear language and avoid jargon or technical terms. Be creative and funny with emojis.
If the question is irrelevant to fampay and related information, then politefully ignore or change the topic

`;

  return prompt;
}

async function GPT_Api_Call(user_question, chunks, previous) {
  var messages = chunks.map((chunk) => {
    if (chunk.docs) {
      return {
        role: "user",
        content: chunk.docs,
      };
    }
    return null;
  });
  messages = messages.filter((item) => item !== null);

  const question = PromptEnhancement(user_question, previous);
  messages.push({ role: "user", content: question });

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    max_tokens: 512,
    temperature: 0.7,
  });

  console.log(messages);
  return response;
}

async function GenerateResponse(user_question, previous) {
  try {
    const resp = await openai.createEmbedding({
      input: user_question,
      model: "text-embedding-ada-002",
    });

    const embeddings = resp.data.data[0].embedding;

    // query the database with the embeddings and get the result
    const chunks_response = await QueryDB(embeddings);

    let chunks = [];

    // loop through the matches in the chunks response and get the metadata for each match
    for (let match of chunks_response.matches) {
      let metadata = match.metadata || {};
      chunks.push(metadata);
    }

    const response = await GPT_Api_Call(user_question, chunks, previous);

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return "Snaps!!.. Oh something went wrong!!";
  }
}

wss.on("connection", function connection(ws) {
  ws.on("message", async function incoming(data) {
    try {
      console.log("TYPING");
      var d = JSON.parse(data);
      var msg = await GenerateResponse(d.current, d.previous);
      ws.send(msg);
    } catch (err) {
      console.log(err);
    }
  });
});

server.listen(port, function () {
  console.log(`Server is listening on ${port}!`);
});
