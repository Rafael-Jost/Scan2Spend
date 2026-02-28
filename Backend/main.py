import os
import asyncio
from wsgiref import headers
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pytesseract import pytesseract
from PIL import Image
import io
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from openai import OpenAI
import oracledb
from dotenv import load_dotenv
import json
from typing import List

load_dotenv()

client = OpenAI()

class InsertItemResponse(BaseModel):
    text: str = "Nenhum item inserido"

class ItemNota(BaseModel):
    nome_produto: str
    quantidade: float
    preco_unitario: float
    desconto: float
    preco_total: float
    unidade_medida: str
    
class NotaFiscal(BaseModel):
    data_compra: str
    itens: List[ItemNota]
    preco_final_pago: float



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

@app.post("/nota_fiscal/", response_model=InsertItemResponse)
def insert_item(payload: NotaFiscal):

    try:

        dt_compra = payload.data_compra
        preco_final_pago = payload.preco_final_pago
        

        connection = oracledb.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dsn=os.getenv("DB_SERVICE_NAME"),      
            config_dir=os.getenv("DB_WALLET_LOCATION"),
            wallet_location=os.getenv("DB_WALLET_LOCATION"),
            wallet_password=os.getenv("DB_WALLET_PASSWORD")
        )

        cursor = connection.cursor()
        
        id_var = cursor.var(int)

        cursor.execute("""
            INSERT INTO notas_fiscais (data, valor_total, usuario_id)
            VALUES (to_date(:dt_compra, 'YYYY-MM-DD'), to_number(:preco_final_pago), 1)
            RETURNING nota_fiscal_id INTO :id
        """, {"dt_compra": dt_compra, "preco_final_pago": preco_final_pago, "id": id_var})

        for produto in payload.itens:
            cursor.execute("""
                INSERT INTO nota_fiscal_itens
                (nota_fiscal_id, produto, valor, quantidade, valor_unitario, valor_desconto, unidade_medida)
                VALUES (:nota_fiscal_id, :produto, :valor, :quantidade, :valor_unitario, :valor_desconto, :unidade_medida)
            """, {
                "nota_fiscal_id": id_var.getvalue()[0],
                "produto": produto.nome_produto,
                "valor": float(produto.preco_total) if produto.preco_total else None,
                "quantidade": float(produto.quantidade) if produto.quantidade else None,
                "valor_unitario": float(produto.preco_unitario) if produto.preco_unitario else None,
                "valor_desconto": float(produto.desconto) if produto.desconto else None,
                "unidade_medida": produto.unidade_medida if produto.unidade_medida and len(produto.unidade_medida) <= 2 else None #char(2)
            })
        connection.commit()
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"Erro ao inserir item: {e}")
        return {"text": f"Erro ao inserir itens no banco de dados. {e}"}
    else:
        return {"text": "Itens inserido com sucesso no banco de dados."}


@app.get("/receiptExpenses/", response_model=ReceiptExpenses)
async def analyze_receipt(QRurl: str):

    try:
        # Usa Playwright sync em thread porque o async pode falhar no Windows/py3.14
        # com NotImplementedError; assim evitamos conflito com o event loop do FastAPI.
        def fetch_html_with_playwright(url: str) -> str:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-blink-features=AutomationControlled",
                    ],
                )
                context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0 Safari/537.36"
                    ),
                    locale="pt-BR",
                )
                page = context.new_page()
                response = page.goto(url, wait_until="domcontentloaded", timeout=60000)
                if response is None:
                    raise RuntimeError("Navegacao sem resposta")
                if response.status >= 400:
                    raise RuntimeError(f"Status {response.status} ao acessar {page.url}")
                try:
                    page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    pass
                html = page.content()
                context.close()
                browser.close()
                return html

        receipt_html = await asyncio.to_thread(fetch_html_with_playwright, QRurl)

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Falha ao acessar portal da NFC-e: ({type(e).__name__}) {repr(e)}"
        )
    
    soup = BeautifulSoup(receipt_html, 'html.parser')
    receipt_text = soup.get_text()

    prompt = """
    Você é um extractor de ITENS de nota fiscal a partir de TEXTO BRUTO extraído de HTML. Seu objetivo: identificar apenas linhas de produtos e retornar um JSON estrito com os campos pedidos.

    REGRAS GERAIS

    - Considere produto somente se a linha contiver quantidade e valor unitário ou valor total. Caso contrário IGNORE.

    - Ignore qualquer texto institucional ou administrativo (nome do cliente, CPF/CNPJ, endereço, telefones, loja, QR, chave, protocolo, TOTAL/ SUBTOTAL que sejam cabeçalho/rodapé, datas soltas, caixas com texto “CLIENTE”, “CONSUMIDOR”, “OPERADOR”, “CAIXA”).

   -  Preserve a linha original do produto ao preencher nome_produto, exceto quando a linha terminar com um token de unidade isolado (ex.: KG, G, UN, LT, M, CX). Nesse caso: remova esse token do nome_produto e coloque-o em unidade_medida.

    - Se a descrição contiver peso/medida acoplada (ex.: Abacate 1KG, Arroz 5kg), extraia quantidade como número e unidade como unidade_medida quando for claro; se não for claro, preserve a descrição e deixe unidade_medida como null.

    - Nomes que sejam somente números ou contenham palavras proibidas (CLIENTE, CNPJ, ENDEREÇO, TOTAL, CAIXA, OPERADOR) não são produtos.

    REGRAS DE EXTRAÇÃO DE CAMPOS

    - nome_produto: texto da linha do item (com a regra de unidade acima). Não invente nomes.

    - unidade_medida: se houver (KG, UN, LT, m, g, CX, pct, etc.), padronize para maiúsculas sem pontos; caso contrário null.

    - quantidade: número (float) extraído da linha; se não existir → NÃO é item.

    - preco_unitario: número (float) com ponto decimal; se não aparecer, null.

    - preco_total: número (float) com ponto decimal; se não aparecer, null.

    - desconto: número (float) se houver desconto explícito na linha; senão null.

    - Valores monetários: aceite formatos comuns 18,90 ou 18.90 e normalizar para 18.90 (float). Ignore símbolos R$ na conversão.

    - Quantidade: aceite 1, 1,00, 1 KG, 2x, 2 un — normalize para número (float). Se o token for 2x interpretar como 2.

    REGRAS PARA preco_final_pago

    - Procure explicitamente linhas rotuladas TOTAL, TOTAL PAGO, VALOR PAGO, VALOR A PAGAR, TOTAL NOTA FISCAL, VALOR PAGO EM e retorne esse valor.

    - IGNORE valores acompanhados das palavras TROCO, ENTREGUE, DINHEIRO ENTREGUE, RECEBIDO se estiverem claramente relacionados ao pagamento em espécie (ex.: “ENTREGUE 100,00”); não use esses como preco_final_pago.

    - Se houver múltiplos “TOTAL”, prefira a linha que contenha PAGO/PAGAMENTO/NOTA ou a que esteja mais próxima da palavra TOTAL seguida de valores; se ainda assim ambíguo, use a ocorrência que aparece após o bloco de itens (ou seja, em direção ao fim do documento).

    - Se não houver um TOTAL claramente rotulado, coloque preco_final_pago: null.

    NORMALIZAÇÃO OBRIGATÓRIA DE UNIDADE DE MEDIDA

    unidade_medida deve SEMPRE ser CHAR(2) (string com 2 caracteres).

    Converter unidades variadas para o padrão:
    KG, KILO, QUILO → "KG"
    G, GRAMA → "GR"
    LT, LITRO → "LT"
    MIL, ML → "ML"
    UN, UNID, UNIDADE → "UN"

    Conversões semânticas (embalagens viram unidade):
    PCT (Pacote) → "UN"
    PC, PÇ → "UN"
    BDJ (Bandeja) → "UN"
    GRF (Garrafa) → "UN"
    LAT (Lata) → "UN"
    CX (Caixa) → "UN"
    FD (Fardo) → "UN"
    EMB, EMBALAGEM → "UN"

    Qualquer unidade que represente contagem física deve virar "UN".

    Se a unidade não puder ser identificada com segurança, usar "UN" como padrão.

    Nunca retornar unidade com mais de 2 caracteres.

    Nunca retornar descrição longa como unidade.

    Nunca deixar unidade_medida nulo — sempre normalize.

    REGRAS PARA DATA

    - Busque datas próximas às palavras DATA, EMISSÃO, COMPRA. Aceite DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD e variações com hora. Padronize para DD/MM/YYYY como string.

    Se houver mais de uma data, escolha a que estiver rotulada como DATA, EMISSAO ou DATA COMPRA. Se não for possível determinar, null.

    VALIDAÇÃO E FORMATO

    - Retorne apenas o JSON exatamente neste formato (sem texto extra, sem markdown, sem quebras extras). Use null quando o campo não existir.

    - Todos os valores numéricos (quantidade, preco_unitario, preco_total, desconto, preco_final_pago) devem ser números (float) ou null.

    - itens deve ser um array; se nenhum item válido for encontrado, itens: [].

    - Não faça somas, não invente preços nem altere descrições além das regras de unidade explicadas.

    FORMATO DE SAÍDA (EXATO)
    Retorne exatamente:
    {
        "data_compra": "...",
        "itens": [
            {
            "nome_produto": "...",
            "unidade_medida": "...",
            "quantidade": ...,
            "preco_unitario": ...,
            "preco_total": ...,
            "desconto": ...
            }
        ],
        "preco_final_pago": ...
        }

    EXTRA

    - Se uma linha contiver apenas descrição e preço mas sem quantidade explícita (ex.: “Pão 1,50”), considere não ser item.

    - Se houver linhas com x entre quantidade e descrição (2 x Pão), parse como quantidade 2.

    RETORNE APENAS O JSON. Sem explicações. Sem nada além do JSON.

    TEXTO BRUTO DA NOTA FISCAL PARA ANÁLISE:
    """

    prompt = prompt + receipt_text

    response = client.responses.create(
        model="gpt-4o-mini",
        input= prompt
    )

    return{
        "text": response.output_text
    }