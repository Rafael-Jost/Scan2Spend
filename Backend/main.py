from fastapi import FastAPI, UploadFile
from pydantic import BaseModel

class ReceiptInfo(BaseModel):
    filename: str = None
    content: str = None
    size: int = 0

app = FastAPI()

@app.get("/")
def root():
    return {"Scan2Spend"}

@app.post("/upreceipt/", response_model=ReceiptInfo)
async def upload_receipt(receipt: UploadFile):
    file = await receipt.read()
    file_lenght = len(file)
    return {"filename": receipt.filename, "size": file_lenght, "content": file_content}