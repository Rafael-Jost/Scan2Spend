from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class ReceiptInfo(BaseModel):
    filename: str = None
    content: str = None
    size: int = 0

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

    return {
        "filename": receipt.filename,
        "size": file_length,
        "content": receipt.content_type
    }