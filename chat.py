import openai
import logging
import json
import os
from typing import Any,Dict,List
import requests

def query_database(query_prompt) -> Dict[str, Any]:
    url = f"https://fam-bb05ce2.svc.asia-northeast1-gcp.pinecone.io/query"
    headers = {
        "Content-Type": "application/json",
        "accept": "application/json",
        "Api-Key": "d6fbd995-a60c-423a-b071-c7b4d3b05f93",
    }
    data = {"vector": query_prompt, "top_k": 5, "includeMetadata": True, "namespace": ""}
    response = requests.post(url, json=data, headers=headers)

    if response.status_code == 200:
        result = response.json()
        return result
    else:
        raise ValueError(f"Error: {response.status_code} : {response.content}")


def apply_prompt_template(question: str) -> str:
    # prompt = f"""
    #     based on the above context(refer the context it as FamApp FAQ and documentation), answer the question: {question}, also provide the link of this information(if available) as "to find out more" and be as elaborative as possible. 
    #     You should answer in follow up questions and answer must be
    #     very supportive, friendly, humourous and easy. (Note: Response should be short and clear)
    # """
    prompt=f"""
    Understand the context of data above and question={question} as FampApp support team. Provide the link of this information(if available) as "to find out more".
    You should tone in supportive,problem solving, more human, friendly, humourous and easy. (Note: Response should be precise,clear,in points and emojis if possible). If 
    question is irrelevant to fampay and related information, then politefully ignore or change the topic.
    """
    return prompt

def call_chatgpt_api(user_question: str, chunks: List[str]) -> Dict[str, Any]:
    messages = list(
        map(lambda chunk: {
            "role": "user",
            "content": chunk
        }, chunks))
    question = apply_prompt_template(user_question)
    messages.append({"role": "user", "content": question})
    print("fuck",messages)
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return response
def ask(user_question: str) -> Dict[str, Any]:
    openai.api_key="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"

    response = openai.Embedding.create(
        input=user_question,
        model='text-embedding-ada-002'
    )
    embeddings = response['data'][0]['embedding']
    chunks_response = query_database(embeddings)
    chunks = []
    for match in chunks_response["matches"]:
        metadata = match.get('metadata', {})
        chunks.append(str(metadata))
    print("User's questions: %s", user_question)
    print("Retrieved chunks: %s", chunks)

    response = call_chatgpt_api(user_question, chunks)
    print("response is",response)
    # logging.info("Response: %s", response)

    # return response["choices"][0]["message"]["content"]


ask("who is hitler and what he did?")