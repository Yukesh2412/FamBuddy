import os
from bs4 import BeautifulSoup
from langchain.text_splitter import TokenTextSplitter
import openai
import json

def extract_data(root_path: str) -> list:
    print(f'Extracting data from webpages at: {root_path}')
    pages = []

    for subdir, dirs, files in os.walk(root_path):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(subdir, file)
                soup = BeautifulSoup(open(path), "html.parser")
                description = soup.find(class_="pos-relative js-post-content").get_text().strip()
                if soup.title:
                    # title = str(soup.title.string)
                    title=title = soup.find("h1").get_text()
                else:
                    title = ""
                url = 'https://famapp.in' + path[len(root_path):]

                pages.append({
                    'page_content': description,
                    'metadata': {
                        'title': title,
                        'url': url
                    }
                })
    
    print(f'Extracted data from {len(pages)} pages.\n')
    return pages

def extract_txt(root_path: str) -> list:
    print(f'Extracting data from txt files at: {root_path}')
    f = open('./cleandata.txt', 'r')
    data = json.load(f)
    pages = []
    url = 'https://famapp.in/faqs'
    for d in data:
        title = d['title']
        description=d['answer']
        pages.append({
            'page_content': description+ '\n\n',
                    'metadata': {
                        'title': title,
                        'url': url
                    }
            
        })

    f.close()
    return pages

def split_data(pages: list) -> tuple:
    text_splitter = TokenTextSplitter(chunk_size=500, chunk_overlap=100)

    docs, metadata = [], []


    for page in pages:
        splits = text_splitter.split_text(page['page_content'])
        for i in splits:
            docs.append(i)
            metadata.append({'title': page['metadata']['title'], 'url': page['metadata']['url'],'docs':i})
        print(f"Splitted {page['metadata']['title']} into {len(splits)} chunks.")

    return docs, metadata



def get_embeddings(docs: list) -> list:
    # openai.api_key ="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"
    openai.api_key=os.environ.get('OPENAI_API')
    
    try:
        response = openai.Embedding.create(
            input = docs,
            model = 'text-embedding-ada-002'
        )
    except Exception as e:
        print(e)


    embeddings = [record['embedding'] for record in response['data']]

    with open('embeds.txt', 'w') as f1:
        f1.write(str(embeddings))

    with open('response.txt', 'w') as f0:
        f0.write(str(response))
    
    return embeddings

def generate_file(data: dict, filename: str) -> None:
    with open(filename, 'w') as f:
        json.dump(data, f, indent=4)

def main():
    # root_path = './help.mydukaan.io'
    root_path = './blog'
    pages_txt= extract_txt('./cleandata.txt')
    pages_site = extract_data(root_path)
    pages=pages_txt+pages_site

    docs, metadata = split_data(pages)

 
    embeddings = get_embeddings(docs)

    db = {'vectors':[]}
    arr=[]
    for i in range(len(embeddings)):
        document = {
            'id': str(i),
            'metadata': metadata[i],
            'values': embeddings[i]
        }
        arr.append(document)
    db['vectors']=arr
    # print(db)
    generate_file(db, 'db.json')

    chunk_size = 30
    chunks = [db['vectors'][i:i+chunk_size] for i in range(0, len(db['vectors']), chunk_size)]    
    for i, chunk in enumerate(chunks):
        filename = f'db_chunk_{i}.json'
        generate_file({'vectors': chunk}, filename)


if __name__ == '__main__':
    main()