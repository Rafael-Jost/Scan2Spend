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

@app.post("/upreceipt/", response_model=ReceiptInfo)
async def upload_receipt(receipt: UploadFile):
    file_bytes = await receipt.read()
    file_length = len(file_bytes)

    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)

    return {
        "filename": receipt.filename,
        "size": file_length,
        "content": receipt.content_type,
        "text": text
    }

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
        "data_compra": "2026-02-10",
        "itens": [
            {
                "nome_produto": "Leite Integral 1L",
                "quantidade": 3,
                "preco_unitario": 4.50,
                "preco_total": 13.50,
                "desconto": 1.50
            },
            {
                "nome_produto": "Pão Francês",
                "quantidade": 5,
                "preco_unitario": 0.80,
                "preco_total": 4.00,
                "desconto": 0.00
            }
        ],
        "preco_final_pago": 16.00
    }

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