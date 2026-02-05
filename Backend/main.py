from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pytesseract import pytesseract
from PIL import Image
import io

class ReceiptInfo(BaseModel):
    filename: str = None
    content: str = None
    size: int = 0
    text: str = "Nenhum texto extraído"

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