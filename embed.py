import os
from bs4 import BeautifulSoup
from langchain.text_splitter import TokenTextSplitter
import openai
import json
from dotenv import load_dotenv
load_dotenv()

def DataExtraction(root_path: str) -> list:
    print(f'Extracting data from webpages at: {root_path}')
    pages = []

    for subdir, dirs, files in os.walk(root_path):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(subdir, file)
                soup = BeautifulSoup(open(path), "html.parser")
                description = soup.find(class_="pos-relative js-post-content").get_text().strip()
                if soup.title:
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
    
    print(f'Webpage data extracted: {len(pages)} pages.\n')
    return pages

def TextExtraction(root_path: str) -> list:
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

def DataSplitting(pages: list) -> tuple:
    text_splitter = TokenTextSplitter(chunk_size=500, chunk_overlap=100)

    docs, metadata = [], []


    for page in pages:
        splits = text_splitter.split_text(page['page_content'])
        for i in splits:
            docs.append(i)
            metadata.append({'title': page['metadata']['title'], 'url': page['metadata']['url'],'docs':i})
        print(f"Splitted {page['metadata']['title']} into {len(splits)} chunks.")

    return docs, metadata



def GenerateEmbeddings(docs: list) -> list:
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
    root_path = './blog'
    data_from_textfile= TextExtraction('./cleandata.txt')
    data_from_pages = DataExtraction(root_path)
    pages=data_from_textfile+data_from_pages
    # print(pages_txt)

    docs, metadata = DataSplitting(pages)
    # print(metadata)

    embeddings = GenerateEmbeddings(docs)

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
    generate_file(db, 'db.json')

    chunk_size = 30
    chunks = [db['vectors'][i:i+chunk_size] for i in range(0, len(db['vectors']), chunk_size)]    
    for i, chunk in enumerate(chunks):
        filename = f'db_chunk_{i}.json'
        generate_file({'vectors': chunk}, filename)


if __name__ == '__main__':
    main()
