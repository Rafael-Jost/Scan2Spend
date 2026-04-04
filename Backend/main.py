import os
import asyncio
from pathlib import Path
from wsgiref import headers
from fastapi import FastAPI, HTTPException, UploadFile, Response, Request
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
import jwt
from datetime import datetime, timedelta, timezone

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PROMPT_FILE = BASE_DIR / "utils" / "prompt_analise_nf.txt"

client = OpenAI()


class DespesasResponse(BaseModel):
    data: str
    despesa: float

class DespesasCategoriasResponse(BaseModel):
    name: str
    value: float
    fill: str

class InsertItemResponse(BaseModel):
    text: str = "Nenhum item inserido"

class ItemNota(BaseModel):
    nome_produto: str
    quantidade: float
    preco_unitario: float
    desconto: float
    preco_total: float
    unidade_medida: str
    categoria: str
    
class NotaFiscalDetalhes(BaseModel):
    usuario_id: int
    data_compra: str
    itens: List[ItemNota]
    preco_final_pago: float
    desconto_total: float

class NotaFiscalGet(BaseModel):
    nota_fiscal_id: int
    data_compra: str
    quantidade_itens: int
    preco_final_pago: float
    desconto_total: float

class NotaFiscalItensGet(BaseModel):
    itens: List[ItemNota]


class ReceiptExpenses(BaseModel):
    text: str = "Nenhuma informação extraída da nota fiscal"

class Login(BaseModel):
    login: str
    senha: str

class LoginResponse(BaseModel):
    msg: str

class CadastroUsuario(BaseModel):
    nome: str
    sobrenome: str
    email: str
    senha: str

class CadastroUsuarioResponse(BaseModel):
    msg: str

class MeResponse(BaseModel):
    nome: str
    sobrenome: str
    email: str
    usuario_id: int

# //////////////////////////
# Inicializacao do FastAPI //
# //////////////////////////

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

# ///////////////////////
# Funcoes utilitarias //
# /////////////////////

def makeDBconnection():
    try:
        connection = oracledb.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dsn=os.getenv("DB_SERVICE_NAME"),      
            config_dir=os.getenv("DB_WALLET_LOCATION"),
            wallet_location=os.getenv("DB_WALLET_LOCATION"),
            wallet_password=os.getenv("DB_WALLET_PASSWORD")
        )
    
    except Exception as e:
        print(f"Erro ao estabelecer conexão com o banco de dados: {e}")
        return 'Erro ao estabelecer conexão: ' + str(e)
    
    else:
        return connection

@app.get("/")
def root():
    return {"Scan2Spend"}

# ///////////////////////////////
# Funções de autenticacao (JWT) //
# ///////////////////////////////

def gerar_token_login(usuario_id):

    SECRET_KEY = os.getenv("SECRET_KEY")
    payload ={
        "usuario_id": usuario_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=41)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def validar_token_login(token):

    SECRET_KEY = os.getenv("SECRET_KEY")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["usuario_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ///////////////////////////////
# Endpoints de autenticacao    //
# //////////////////////////////

@app.post('/cadastrarUsuario/', response_model = CadastroUsuarioResponse)
def cadastroUsuario(dados_usuario: CadastroUsuario):

    connection = None
    cursor = None
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise HTTPException(status_code=503, detail="Erro ao estabelecer conexão com o banco de dados")

        cursor = connection.cursor()

        cursor.execute("INSERT INTO usuarios(nome, sobrenome, email, senha) VALUES (:nome, :sobrenome, :email, PKG_AUTH.encrypt_pwd(:senha))", {
            'nome': dados_usuario.nome.capitalize(),
            'sobrenome': dados_usuario.sobrenome.capitalize(),
            'email': dados_usuario.email,
            'senha': dados_usuario.senha
        })
        connection.commit()

    except Exception as e:
        print(f"Erro ao cadastrar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao cadastrar usuário")
    else:
        return CadastroUsuarioResponse(msg="Usuário cadastrado com sucesso")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.post('/login', response_model = LoginResponse)
def login(credenciais: Login, response: Response):

    connection = None
    cursor = None
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise HTTPException(status_code=503, detail="Erro ao estabelecer conexão com o banco de dados")

        cursor = connection.cursor()
        usuario_id_var = cursor.var(int)
        cursor.execute("""
            BEGIN
                PKG_AUTH.auth(
                    p_login => :login,
                    p_senha => :senha,
                    p_usuario_id => :usuario_id
                );
            END;
        """, {
            "login": credenciais.login,
            "senha": credenciais.senha,
            "usuario_id": usuario_id_var
        })

        usuario_id = usuario_id_var.getvalue()
        if usuario_id is None:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

    except HTTPException:
        raise
    except oracledb.DatabaseError as e:
        print(f"Erro de banco ao fazer login: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer login")
    except Exception as e:
        print(f"Erro ao fazer login: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer login")
    else:
        token = gerar_token_login(usuario_id)
        response.set_cookie(
            key="token", 
            value=token, 
            httponly=True,
            secure=True,
            samesite="none"
        )
        return LoginResponse(msg="Login realizado com sucesso")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.get('/me', response_model=MeResponse)
def me(request: Request):
    try:
        connection = None
        cursor = None
        
        token = request.cookies.get("token")
        usuario_id = validar_token_login(token)

        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise HTTPException(status_code=503, detail="Erro ao estabelecer conexão com o banco de dados")
        cursor = connection.cursor()

        nome_var = cursor.var(str)
        sobrenome_var = cursor.var(str)
        email_var = cursor.var(str)
        cursor.execute("""
            BEGIN
                PKG_AUTH.post_auth(
                    p_usuario_id => :usuario_id,
                    p_nome       => :nome,
                    p_sobrenome  => :sobrenome,
                    p_email      => :email
                );  
            END;
        """, 
        {
            "usuario_id": usuario_id, 
            "nome": nome_var,
            "sobrenome": sobrenome_var,
            "email": email_var
        })

        nome = nome_var.getvalue()
        sobrenome = sobrenome_var.getvalue()
        email = email_var.getvalue()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar informações do usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar informações do usuário")
    else:
        return MeResponse(nome=nome, sobrenome=sobrenome, email=email, usuario_id=usuario_id)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# //////////////////////
# Rotas de despesas   //
# //////////////////////

@app.get('/despesas/', response_model=list[DespesasResponse])
def busca_despesas(usuario_id: int, dt_inicio: str, dt_fim: str, tipo_agrupamento: str):
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN
                        TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN
                        TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN
                        TRUNC(DATA)
                END AS DATA_DESPESA,
                SUM(valor_total) AS VALOR_TOTAL
            FROM
                notas_fiscais nf
            WHERE
                    usuario_id = :usuario_id
                AND data BETWEEN TO_DATE(:dt_inicio, 'DD/MM/YYYY') AND TO_DATE(:dt_fim, 'DD/MM/YYYY')
            GROUP BY
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN
                        TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN
                        TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN
                        TRUNC(DATA)
                END
            ORDER BY
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN
                        TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN
                        TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN
                        TRUNC(DATA)
                END
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "tipo_agrupamento": tipo_agrupamento, "usuario_id": usuario_id})

        result = cursor.fetchall()
        print(f"DEBUG: Query retornou {len(result)} linhas")
        cursor.close()
        connection.close()
        despesas = []
        for row in result:
            despesas.append(DespesasResponse(
                data= row[0].strftime("%Y") if tipo_agrupamento == 'ANO' else row[0].strftime("%m/%Y") if tipo_agrupamento == 'MES' else row[0].strftime("%d/%m/%Y"),
                despesa=float(row[1])
            ))
        print(f"DEBUG: Despesas processadas: {len(despesas)}")
        
    except Exception as e:
        print(f"Erro ao buscar despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar despesas: {e}")
    else:
        return despesas


@app.get('/despesas/categorias', response_model=list[DespesasCategoriasResponse])
def busca_despesas_categorias(usuario_id: int, dt_inicio: str, dt_fim: str):
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                categoria  AS name,
                SUM(valor) AS value,
                CASE
                    WHEN CATEGORIA = 'Alimentação' THEN '#E8684A'
                    WHEN CATEGORIA = 'Bebidas' THEN '#7CC0FF'
                    WHEN CATEGORIA = 'Higiene Pessoal' THEN '#9270CA'
                    WHEN CATEGORIA = 'Lanches & Conveniência' THEN '#FF9D4D'
                    WHEN CATEGORIA = 'Limpeza' THEN '#6DC8A3'
                    WHEN CATEGORIA = 'Pets' THEN '#F6BD16'
                    WHEN CATEGORIA = 'Utilidades' THEN '#5B8FF9'
                    ELSE '#9CA3AF'
                END AS fill
            FROM
                    notas_fiscais nf
                JOIN nota_fiscal_itens nfi USING ( nota_fiscal_id )
            WHERE
                    usuario_id = :usuario_id
                AND data BETWEEN TO_DATE(:dt_inicio, 'DD/MM/YYYY') AND TO_DATE(:dt_fim, 'DD/MM/YYYY')
            GROUP BY
                categoria
            ORDER BY
                categoria
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "usuario_id": usuario_id})

        result = cursor.fetchall()
        print(f"DEBUG: Query retornou {len(result)} linhas")
        cursor.close()
        connection.close()
        despesas = []
        for row in result:
            despesas.append(DespesasCategoriasResponse(
                name=row[0],
                value=float(row[1]),
                fill=row[2]
            ))
        print(f"DEBUG: Despesas processadas: {len(despesas)}")
        
    except Exception as e:
        print(f"Erro ao buscar despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar despesas: {e}")
    else:
        return despesas

# //////////////////////////
# Rotas de notas fiscais  //
# //////////////////////////

@app.get("/nota_fiscal/", response_model=list[NotaFiscalGet])
async def busca_nota_fiscal(usuario_id: int):
    try:
        connection = makeDBconnection()

        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                nota_fiscal_id,
                nf.data,
                nf.valor_total,
                nf.desconto,
                COUNT(nfi.nota_fiscal_item_id) "QUANTIDADE_ITENS"
            FROM
                scan2spend.notas_fiscais nf
                JOIN scan2spend.nota_fiscal_itens nfi USING (nota_fiscal_id)
            WHERE
                nf.usuario_id = :usuario_id
            GROUP BY
                nota_fiscal_id,
                nf.usuario_id,
                nf.data,
                nf.valor_total,
                nf.desconto;

        """, {"usuario_id": usuario_id})

        result = cursor.fetchall()
        notas_fiscais = []

        for row in result:
            notas_fiscais.append(NotaFiscalGet(
                nota_fiscal_id=row[0],
                data_compra=row[1].strftime("%Y-%m-%d"),
                preco_final_pago=row[2],
                desconto_total= row[3] if row[3] else 0.0,
                quantidade_itens=row[4]
            ))
        
    except Exception as e:
        print(f"Erro ao estabelecer conexão com o banco de dados: {e}")
        raise HTTPException(status_code=503, detail="Erro ao buscar notas fiscais")
    else:
        return notas_fiscais
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.post("/nota_fiscal/", response_model=InsertItemResponse)
def insert_item(payload: NotaFiscalDetalhes):

    try:

        usuario_id = payload.usuario_id
        dt_compra = payload.data_compra
        preco_final_pago = payload.preco_final_pago
        desconto_total = payload.desconto_total
        
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()

        id_var = cursor.var(int)

        cursor.execute("""
            INSERT INTO notas_fiscais (data, valor_total, usuario_id, desconto)
            VALUES (to_date(:dt_compra, 'YYYY-MM-DD'), to_number(:preco_final_pago), :usuario_id, to_number(:desconto_total))
            RETURNING nota_fiscal_id INTO :id
        """, {"dt_compra": dt_compra, "preco_final_pago": preco_final_pago, "id": id_var, "desconto_total": desconto_total, "usuario_id": usuario_id})

        for produto in payload.itens:
            cursor.execute("""
                INSERT INTO nota_fiscal_itens
                (nota_fiscal_id, produto, valor, quantidade, valor_unitario, valor_desconto, unidade_medida, categoria)
                VALUES (:nota_fiscal_id, :produto, :valor, :quantidade, :valor_unitario, :valor_desconto, :unidade_medida, :categoria)
            """, {
                "nota_fiscal_id": id_var.getvalue()[0],
                "produto": produto.nome_produto,
                "valor": float(produto.preco_total) if produto.preco_total else None,
                "quantidade": float(produto.quantidade) if produto.quantidade else None,
                "valor_unitario": float(produto.preco_unitario) if produto.preco_unitario else None,
                "valor_desconto": float(produto.desconto) if produto.desconto else None,
                "unidade_medida": produto.unidade_medida if produto.unidade_medida and len(produto.unidade_medida) <= 2 else None, #char(2)
                "categoria": produto.categoria if produto.categoria else None
            })
        connection.commit()
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"Erro ao inserir item: {e}")
        return {"text": f"Erro ao inserir itens no banco de dados. {e}"}
    else:
        return {"text": "Itens inserido com sucesso no banco de dados."}

@app.get("/nota_fiscal/{nota_fiscal_id}", response_model=NotaFiscalDetalhes)
async def busca_nota_fiscal(nota_fiscal_id: int):
    connection = None
    cursor = None
    try:
        connection = makeDBconnection()

        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                nf.usuario_id,
                nf.data,
                nf.valor_total,
                nf.desconto,
                nfi.produto,
                nfi.quantidade,
                nfi.valor_unitario,
                nfi.valor_desconto,
                nfi.valor,
                nfi.unidade_medida,
                nfi.categoria
            FROM
                notas_fiscais nf
                JOIN nota_fiscal_itens nfi USING (nota_fiscal_id)
            WHERE
                nota_fiscal_id = :nota_fiscal_id
        """, {"nota_fiscal_id": nota_fiscal_id})

        result = cursor.fetchall()
        if not result:
            raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")

        primeiro_registro = result[0]
        itens = []

        for row in result:
            itens.append(ItemNota(
                nome_produto=row[4],
                quantidade=float(row[5]) if row[5] else 0.0,
                preco_unitario=float(row[6]) if row[6] else 0.0,
                desconto=float(row[7]) if row[7] else 0.0,
                preco_total=float(row[8]) if row[8] else 0.0,
                unidade_medida=row[9],
                categoria=row[10]
            ))

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao estabelecer conexão com o banco de dados: {e}")
        raise HTTPException(status_code=503, detail="Erro ao buscar itens da nota fiscal: " + str(e))
    else:
        return NotaFiscalDetalhes(
            usuario_id=primeiro_registro[0],
            data_compra=primeiro_registro[1].strftime("%Y-%m-%d") if primeiro_registro[1] else "",
            itens=itens,
            preco_final_pago=float(primeiro_registro[2]) if primeiro_registro[2] else 0.0,
            desconto_total=float(primeiro_registro[3]) if primeiro_registro[3] else 0.0,
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ///////////////////////////////
# Rota de analise de NFC-e    //
# ///////////////////////////////

@app.get("/analisar_nf/", response_model=ReceiptExpenses)
async def analisar_nf(QRurl: str):

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

    with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
        prompt = f.read()

    prompt = prompt + receipt_text

    response = client.responses.create(
        model="gpt-4o-mini",
        input= prompt
    )

    return{
        "text": response.output_text
    }