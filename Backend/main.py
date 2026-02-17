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
    Com base no seguinte texto extraído de uma nota fiscal, extraia as seguintes informações: 
    - Nome do produto
    - Quantidade
    - Preço unitário
    - preço total
    - desconto (se houver)
    - Data da compra
    - Preço final pago

    Informações adicionais:
    - Gostaria que as informações fossem apresentadas em formato JSON, seguindo o exemplo abaixo :

    {
        "data_compra": "15/09/2023",
        "itens": [
            {
                "nome_produto": "Leite Integral 1L",
                "unidade_medida": "UN",
                "quantidade": 3,
                "preco_unitario": 4.50,
                "preco_total": 13.50,
                "desconto": 1.50
            },
            {
                "nome_produto": "Pão Francês",
                "unidade_medida": "KG",
                "quantidade": 5,
                "preco_unitario": 0.80,
                "preco_total": 4.00,
                "desconto": null
            }
        ],
        "preco_final_pago": 16.00
    }

    - Me devolva apenas o JSON, sem explicações ou texto adicional, sem quebras de linhas e nenhum outro caractere adicional antes ou depois.
    - O nome do produto deve ser o nome de algo comprável, e não nome de uma pessoa, empresa ou números. 
    - Se o texto da nota fiscal não contiver informações suficientes para extrair um campo específico, por favor, deixe esse campo como null no JSON.

    Texto da nota fiscal:
    """

    prompt = prompt + receipt_text

    response = client.responses.create(
        model="gpt-4o-mini",
        input= prompt
    )

    return{
        "text": response.output_text
    }