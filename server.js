const express = require("express");
const app = express();
const axios = require("axios");
const { Configuration, OpenAIApi } = require("openai");
const http = require("http");
const WebSocket = require("ws");
const port = 3000;
const server = http.createServer(express);
const wss = new WebSocket.Server({ server });

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

function query_database(query_prompt) {
  const url = "https://fam-bb05ce2.svc.asia-northeast1-gcp.pinecone.io/query";
  const headers = {
    "Content-Type": "application/json",
    accept: "application/json",
    "Api-Key": "d6fbd995-a60c-423a-b071-c7b4d3b05f93",
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
  const prompt = ` Understand  whether it is start of chat or follow up question, if start of chat, then follow this
     and Understand the question first ${question}and
      Understand the context of all data above and this is the question=${question} and answer it as FampApp support team. Provide the link of this information(if available) as "to find out more".
      if its a follow up question, understand all previous chat's context which relevant to fampay queries.
      You should tone in supportive,problem solving, more human, friendly, humourous and easy. (Note: Response should be precise,clear,in points and emojis if possible).
  If question is irrelevant to fampay and related information, then politefully ignore or change the topic.
  `;
  //   const prompt = ` if question "${question}" is irrelevant to FamPay, then politely ignore or change the topic. if it is ending note then close the chat. Iif not, then Understand and answer the context of all data above and answer it as FampApp support team. Provide the link of this information(if available) as "to find out more".
  //  . Be informative, supportive, and enthusiastic about FamPay's spending account, UPI, card, and rewards. Use simple, precise and clear language and avoid jargon or technical terms. Be creative and funny with emojis.  .`;

  //   const prompt = `
  // If the question ${question} is irrelevant to FamPay, then politely ignore or change the topic. For example, you can say "Sorry, I can't help you with that. But I can tell you more about FamPay's awesome features. Do you want to know more?"
  // Else if the question ${question} is an ending note, then close the chat. For example, you can say "Thank you for chatting with me. I hope you have a great day. Bye for now!"
  // Else if the question ${question} is relevant to FamPay, then understand and answer the context of all data above and answer it as FampApp support team. Provide the link of this information (if available) as "to find out more". Be informative, supportive, and enthusiastic about FamPay's spending account, UPI, card, and rewards. Use simple, precise and clear language and avoid jargon or technical terms. Be creative and funny with emojis. For example, you can say "FamPay is the best way to spend your money online and offline. You can get your own UPI and card without a bank account and earn amazing rewards on every transaction. To find out more, visit famapp.in or download the app from the Play Store or App Store. Trust me, you won't regret it! 😎"
  // `;

  return prompt;
}

async function call_chatgpt_api(user_question, chunks) {
  const messages = chunks.map((chunk) => ({
    role: "user",
    content: chunk,
  }));

  const question = apply_prompt_template(user_question);
  messages.push({ role: "user", content: question });
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

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
      chunks.push(String(metadata));
    }

    const response = await call_chatgpt_api(user_question, chunks);

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return "Sorry, something went wrong.";
  }
}

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
