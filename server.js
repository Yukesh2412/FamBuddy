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

function query_database(query_prompt) {
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

function apply_prompt_template(question) {
  // const prompt = `Assume you are chatbot and Understand the context of data given and this is the question=${question}. Provide the link of this information(if available) as "to find out more".
  //     if its a follow up question, understand all previous chat's context which relevant to fampay queries.
  //     You should tone in supportive,problem solving, more human, friendly, humourous and easy. (Note: Response should be precise,clear,in points and emojis if possible).
  // If question is irrelevant to fampay and related information, then politefully ignore or change the topic.
  // `;

  const prompt = `based on the above context(refer the context it as Fampay FAQ), answer the question: ${question}, also provide the source of this information(if available) as "to find out more".
 Be supportive,problem solving, more human, friendly, humourous and easy. Use simple, precise and clear language and avoid jargon or technical terms. Be creative and funny with emojis.
  If the question is irrelevant to fampay and related information, then politefully ignore or change the topic.
  `;

  return prompt;
}

async function call_chatgpt_api(user_question, chunks) {
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

  const question = apply_prompt_template(user_question);
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

async function ask(user_question) {
  try {
    const resp = await openai.createEmbedding({
      input: user_question,
      model: "text-embedding-ada-002",
    });

    const embeddings = resp.data.data[0].embedding;

    // Query the database with the embeddings and get the result
    const chunks_response = await query_database(embeddings);

    let chunks = [];

    // Loop through the matches in the chunks response and get the metadata for each match
    for (let match of chunks_response.matches) {
      let metadata = match.metadata || {};
      chunks.push(metadata);
    }

    const response = await call_chatgpt_api(user_question, chunks);

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return "Sorry, something went wrong.";
  }
}

// console.log(ask("what is fam"));

wss.on("connection", function connection(ws) {
  ws.on("message", async function incoming(data) {
    console.log("TYPING");
    // ws.send("typing..");
    var msg = await ask(data.toString());
    // ws.send("typing..");
    ws.send(msg);
  });
});

server.listen(port, function () {
  console.log(`Server is listening on ${port}!`);
});
