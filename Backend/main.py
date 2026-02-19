from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pytesseract import pytesseract
from PIL import Image
import io
import requests
from bs4 import BeautifulSoup
from openai import OpenAI

client = OpenAI()

class ReceiptInfo(BaseModel):
    filename: str = None
    content: str = None
    size: int = 0
    text: str = "Nenhum texto extraído"

class ReceiptExpenses(BaseModel):
    text: str = "Nenhuma informação extraída da nota fiscal"

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"Scan2Spend"}


@app.get("/receiptExpenses/", response_model=ReceiptExpenses)
async def analyze_receipt(QRurl: str):

    response = requests.get(QRurl)
    soup = BeautifulSoup(response.text, 'html.parser')
    receipt_text = soup.get_text()

    prompt = """
    CVocê está analisando o TEXTO BRUTO de uma nota fiscal brasileira obtido extraindo o texto de um html.
    O texto contém cabeçalho, dados do cliente, rodapé e linhas de itens misturados.

    TAREFA:
    Extraia APENAS as informações reais de itens comprados.

    IMPORTANTE:
    Considere como PRODUTO somente textos que representem mercadorias.
    Ignore completamente qualquer informação institucional.

    NÃO SÃO PRODUTOS:
    - Nome do cliente
    - CPF/CNPJ
    - Endereço
    - Telefones
    - "Cliente", "Consumidor", "Operador", "Caixa"
    - Nome da loja ou empresa
    - Datas isoladas
    - QR Code / protocolo / chave NF
    - Totais gerais (ex: TOTAL, SUBTOTAL)
    - Linhas sem quantidade ou valor monetário
    - Qualquer texto administrativo

    REGRAS PARA IDENTIFICAR UM ITEM:
    Uma linha de item geralmente contém:
    - descrição do produto + quantidade + valor unitário OU valor total

    Se não houver preço ou quantidade → NÃO é item.

    O nome do produto deve:
    - ser algo fisicamente comprável
    - não pode ser apenas números
    - não pode conter palavras como:
    CLIENTE, CONSUMIDOR, CNPJ, ENDEREÇO, TOTAL, CAIXA, OPERADOR

    FORMATO DE SAÍDA (JSON VÁLIDO):
    Retorne exatamente:

    {{
        "data_compra": "...",
        "itens": [
            {{
                "nome_produto": "...",
                "unidade_medida": "...",
                "quantidade": ...,
                "preco_unitario": ...,
                "preco_total": ...,
                "desconto": ...
            }}
        ],
        "preco_final_pago": ...
    }}

    REGRAS DE PREENCHIMENTO:
    - Use null quando o campo não existir no texto.
    - Preserve exatamente o que estiver na linha do item.

    SAÍDA:
    Retorne APENAS o JSON.
    Sem explicações.
    Sem markdown.
    Sem quebras de linha extras.
    Sem texto antes ou depois.

    TEXTO DA NOTA:
    """

    prompt = prompt + receipt_text

    response = client.responses.create(
        model="gpt-4o-mini",
        input= prompt
    )

    return{
        "text": response.output_text
    }