import os
import zipfile
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
from typing import List, Optional
import jwt
from datetime import datetime, timedelta, timezone
from deepdiff import DeepDiff

from functions import enviar_redefinicao_senha

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PROMPT_FILE = BASE_DIR / "utils" / "prompt_analise_nf.txt"

_openai_client = None

def get_openai_client():
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI()
    return _openai_client


class DespesasResponse(BaseModel):
    data: str
    despesa: float

class PerfilDespesasResponse(BaseModel):
    gastos_totais: float
    perc_orcamento_consumido: float
    perc_relativo_mes_anterior: float
    maior_compra: float
    qtd_compras: int
    compra_media: float

class DespesasCategoriasResponse(BaseModel):
    categoria: str
    data: str
    despesa: float

class InsightResponse(BaseModel):
    tipo: str
    icone: str
    mensagem: str

class topProdutosResponse(BaseModel):
    nome_produto: str
    quantidade: float
    unidade_medida: str

class InsertItemResponse(BaseModel):
    text: str = "Nenhum item inserido"

class ItemNota(BaseModel):
    nota_fiscal_item_id: Optional[int] = None
    nome_produto: str
    quantidade: float
    preco_unitario: float
    desconto: float
    preco_total: float
    unidade_medida: str
    categoria: str
    
class NotaFiscalDetalhes(BaseModel):
    nota_fiscal_id: Optional[int] = None
    usuario_id: Optional[int] = None
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
    orcamento_mensal: float

class AtualizarUsuario(BaseModel):
    usuario_id: int
    nome: str
    sobrenome: str
    email: str
    orcamento_mensal: float

class CadastroUsuarioResponse(BaseModel):
    msg: str

class MeResponse(BaseModel):
    nome: str
    sobrenome: str
    email: str
    usuario_id: int
    orcamento_mensal: float

class ValidadeTokenResponse(BaseModel):
    msg: str
    hora_expiracao: str

class MessageResponse(BaseModel):
    msg: str = None

# //////////////////////////
# Inicializacao do FastAPI //
# //////////////////////////

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
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

_wallet_dir = None

def setup_wallet():
    global _wallet_dir
    if _wallet_dir:
        return _wallet_dir

    wallet_path = os.getenv("DB_WALLET_LOCATION", "")
    if wallet_path.endswith(".zip") and os.path.exists(wallet_path):
        _wallet_dir = "/tmp/oracle_wallet"
        os.makedirs(_wallet_dir, exist_ok=True)
        with zipfile.ZipFile(wallet_path, "r") as zf:
            zf.extractall(_wallet_dir)
    else:
        _wallet_dir = wallet_path

    return _wallet_dir

def makeDBconnection():
    try:
        wallet_dir = setup_wallet()
        connection = oracledb.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dsn=os.getenv("DB_SERVICE_NAME"),
            config_dir=wallet_dir,
            wallet_location=wallet_dir,
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
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def validar_token_login(token):

    SECRET_KEY = os.getenv("SECRET_KEY")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        fuso_brasil = timezone(timedelta(hours=-3))
        return payload["usuario_id"], datetime.fromtimestamp(
            payload["exp"],
            tz=fuso_brasil
        )
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

        cursor.execute("INSERT INTO usuarios(nome, sobrenome, email, senha, orcamento_mensal) VALUES (:nome, :sobrenome, :email, PKG_AUTH.encrypt_pwd(:senha), :orcamento_mensal)", {
            'nome': dados_usuario.nome.capitalize(),
            'sobrenome': dados_usuario.sobrenome.capitalize(),
            'email': dados_usuario.email,
            'senha': dados_usuario.senha,
            'orcamento_mensal': dados_usuario.orcamento_mensal
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

@app.put('/usuario', response_model=MessageResponse)
def atualizarUsuario(dados_usuario: AtualizarUsuario):
    connection = None
    cursor = None
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise HTTPException(status_code=503, detail="Erro ao estabelecer conexão com o banco de dados")

        cursor = connection.cursor()

        cursor.execute("""
            UPDATE usuarios
            SET nome = :nome,
                sobrenome = :sobrenome,
                email = :email,
                orcamento_mensal = :orcamento_mensal
            WHERE usuario_id = :usuario_id
        """, {
            'usuario_id': dados_usuario.usuario_id,
            'nome': dados_usuario.nome.capitalize(),
            'sobrenome': dados_usuario.sobrenome.capitalize(),
            'email': dados_usuario.email,
            'orcamento_mensal': dados_usuario.orcamento_mensal
        })
        connection.commit()

    except Exception as e:
        print(f"Erro ao atualizar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar usuário")
    else:
        return MessageResponse(msg="Usuário atualizado com sucesso")
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
            samesite="none",
            expires=datetime.now(timezone.utc) + timedelta(minutes=30)
        )
        return LoginResponse(msg="Login realizado com sucesso")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.get('/validarToken' , response_model=ValidadeTokenResponse)
def validar_token(request: Request):

    try:
        token = request.cookies.get("token")
        _, hora_expiracao = validar_token_login(token)
    except HTTPException:
        raise
    else:
        return ValidadeTokenResponse(
            msg="Token válido",
            hora_expiracao=hora_expiracao.strftime("%d/%m/%Y %H:%M")
        )

@app.get('/me', response_model=MeResponse)
def me(request: Request):
    try:
        connection = None
        cursor = None
        
        token = request.cookies.get("token")
        usuario_id, _ = validar_token_login(token)

        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise HTTPException(status_code=503, detail="Erro ao estabelecer conexão com o banco de dados")
        cursor = connection.cursor()

        nome_var = cursor.var(str)
        sobrenome_var = cursor.var(str)
        email_var = cursor.var(str)
        orcamento_var = cursor.var(float)
        cursor.execute("""
            BEGIN
                PKG_AUTH.post_auth(
                    p_usuario_id => :usuario_id,
                    p_nome       => :nome,
                    p_sobrenome  => :sobrenome,
                    p_email      => :email,
                    p_orcamento  => :orcamento_mensal
                );  
            END;
        """, 
        {
            "usuario_id": usuario_id, 
            "nome": nome_var,
            "sobrenome": sobrenome_var,
            "email": email_var,
            "orcamento_mensal": orcamento_var
        })

        nome = nome_var.getvalue()
        sobrenome = sobrenome_var.getvalue()
        email = email_var.getvalue()
        orcamento = orcamento_var.getvalue()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar informações do usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar informações do usuário")
    else:
        return MeResponse(nome=nome, sobrenome=sobrenome, email=email, usuario_id=usuario_id, orcamento_mensal=orcamento)
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
def busca_despesas_categorias(usuario_id: int, dt_inicio: str, dt_fim: str, tipo_agrupamento: str = None):
    try:
        if not tipo_agrupamento:
            tipo_agrupamento = 'ANO'  # Valor padrão para tipo_agrupamento

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
                    WHEN :tipo_agrupamento = 'ANO' THEN
                        trunc(data, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN
                        trunc(data, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN
                        trunc(data)
                END              AS data_despesa
            FROM
                    notas_fiscais nf
                JOIN nota_fiscal_itens nfi USING ( nota_fiscal_id )
            WHERE
                    usuario_id = :usuario_id
                AND data BETWEEN TO_DATE(:dt_inicio, 'DD/MM/YYYY') AND TO_DATE(:dt_fim, 'DD/MM/YYYY')
            GROUP BY
                categoria,
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN
                        trunc(data, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN
                        trunc(data, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN
                        trunc(data)
                END
            ORDER BY
                categoria,
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN
                        trunc(data, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN
                        trunc(data, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN
                        trunc(data)
                END
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "usuario_id": usuario_id, "tipo_agrupamento": tipo_agrupamento})

        result = cursor.fetchall()
        print(f"DEBUG: Query retornou {len(result)} linhas")
        cursor.close()
        connection.close()
        despesas = []
        for row in result:
            despesas.append(DespesasCategoriasResponse(
                categoria=row[0],
                data=row[2].strftime("%Y") if tipo_agrupamento == 'ANO' else row[2].strftime("%m/%Y") if tipo_agrupamento == 'MES' else row[2].strftime("%d/%m/%Y"),
                despesa=float(row[1])
            ))
        print(f"DEBUG: Despesas processadas: {len(despesas)}")
        
    except Exception as e:
        print(f"Erro ao buscar despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar despesas: {e}")
    else:
        return despesas


@app.get('/despesas/categorias/periodo', response_model=list[dict])
def busca_despesas_categorias(usuario_id: int, dt_inicio: str, dt_fim: str, tipo_agrupamento: str = None):

    CATEGORIAS = ['Alimentação', 'Bebidas', 'Higiene Pessoal', 'Lanches & Conveniência', 'Limpeza', 'Outros', 'Pets', 'Utilidades']


    try:
        if not tipo_agrupamento:
            tipo_agrupamento = 'ANO'  # Valor padrão para tipo_agrupamento

        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT *
            FROM (
                SELECT
                    categoria,
                    valor,
                    CASE
                        WHEN :tipo_agrupamento = 'ANO' THEN trunc(data, 'YYYY')
                        WHEN :tipo_agrupamento = 'MES' THEN trunc(data, 'MM')
                        WHEN :tipo_agrupamento = 'DIA' THEN trunc(data)
                    END AS data_despesa
                FROM
                    notas_fiscais nf
                    JOIN nota_fiscal_itens nfi USING ( nota_fiscal_id )
                WHERE
                    usuario_id = :usuario_id
                    AND data BETWEEN TO_DATE(:dt_inicio, 'DD/MM/YYYY') AND TO_DATE(:dt_fim, 'DD/MM/YYYY')
            )
            PIVOT (
                SUM(valor) FOR categoria IN (
                    'Alimentação'          AS "Alimentação",
                    'Bebidas'              AS "Bebidas",
                    'Higiene Pessoal'      AS "Higiene Pessoal",
                    'Lanches & Conveniência' AS "Lanches & Conveniência",
                    'Limpeza'              AS "Limpeza",
                    'Outros'               AS "Outros",
                    'Pets'                 AS "Pets",
                    'Utilidades'           AS "Utilidades"
                )
            )
            ORDER BY data_despesa
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "usuario_id": usuario_id, "tipo_agrupamento": tipo_agrupamento})

        result = cursor.fetchall()
        print(f"DEBUG: Query retornou {len(result)} linhas")
        cursor.close()
        connection.close()

        despesas = []
        for row in result:
            data_str = (
                row[0].strftime("%Y") if tipo_agrupamento == 'ANO'
                else row[0].strftime("%m/%Y") if tipo_agrupamento == 'MES'
                else row[0].strftime("%d/%m/%Y")
            )
            entry = {"data": data_str}
            for i, cat in enumerate(CATEGORIAS):
                if row[i + 1] is not None:
                    entry[cat] = float(row[i + 1])
                else:
                    entry[cat] = 0.0
            despesas.append(entry)

        print(f"DEBUG: Despesas processadas: {len(despesas)}")

    except Exception as e:
        print(f"Erro ao buscar despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar despesas: {e}")
    else:
        return despesas

# //////////////////////////////
# Rotas de perfil de Despesas
# //////////////////////////////

@app.get('/despesas/topProdutos', response_model=list[topProdutosResponse])
def busca_top_produtos(usuario_id: int, dt_inicio: str, dt_fim: str):
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                produto,
                SUM(quantidade) AS total_quantidade,
                unidade_medida
            FROM
                notas_fiscais nf
                JOIN nota_fiscal_itens nfi USING (nota_fiscal_id)
            WHERE
                    usuario_id = :usuario_id
                AND data BETWEEN TO_DATE(:dt_inicio, 'DD/MM/YYYY') AND TO_DATE(:dt_fim, 'DD/MM/YYYY')
                AND nf.ativo = 'S'
                AND nfi.ativo = 'S'
            GROUP BY
                produto, unidade_medida
            ORDER BY
                total_quantidade DESC
            FETCH FIRST 5 ROWS ONLY
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "usuario_id": usuario_id})

        result = cursor.fetchall()
        print(f"DEBUG: Query retornou {len(result)} linhas")
        cursor.close()
        connection.close()

        top_produtos = []
        for row in result:
            top_produtos.append(topProdutosResponse(
                nome_produto=row[0],
                quantidade=float(row[1]),
                unidade_medida=row[2]
            ))
        print(f"DEBUG: Top produtos processados: {len(top_produtos)}")

    except Exception as e:
        print(f"Erro ao buscar top produtos: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar top produtos: {e}")
    else:
        return top_produtos

@app.get('/despesas/insights', response_model=list[InsightResponse])
def busca_insights(usuario_id: int):
    def formatar_moeda(v):
        return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    insights = []
    connection = None
    cursor = None
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()

        # --- Orçamento restante no mês ---
        cursor.execute("""
            SELECT
                u.orcamento_mensal,
                NVL(SUM(nf.valor_total), 0) AS gasto_mes
            FROM usuarios u
            LEFT JOIN notas_fiscais nf
                ON nf.usuario_id = u.usuario_id
                AND TRUNC(nf.data, 'MM') = TRUNC(SYSDATE, 'MM')
                AND nf.ativo = 'S'
            WHERE u.usuario_id = :usuario_id
            GROUP BY u.orcamento_mensal
        """, {"usuario_id": usuario_id})
        row = cursor.fetchone()
        if row:
            orcamento = float(row[0]) if row[0] else 0.0
            gasto_mes = float(row[1])
            if orcamento > 0:
                restante = orcamento - gasto_mes
                if restante <= 0:
                    insights.append(InsightResponse(
                        tipo="danger", icone="🚨",
                        mensagem=f"Você ultrapassou seu limite mensal em {formatar_moeda(abs(restante))}!"
                    ))
                elif restante / orcamento < 0.15:
                    insights.append(InsightResponse(
                        tipo="warning", icone="⚠️",
                        mensagem=f"Atenção! Faltam apenas {formatar_moeda(restante)} para atingir seu limite mensal."
                    ))
                else:
                    insights.append(InsightResponse(
                        tipo="info", icone="🔔",
                        mensagem=f"Faltam {formatar_moeda(restante)} para atingir seu limite mensal."
                    ))

        # --- Variação por categoria vs mês anterior ---
        cursor.execute("""
            SELECT
                categoria,
                SUM(CASE WHEN TRUNC(nf.data, 'MM') = TRUNC(SYSDATE, 'MM')
                         THEN nfi.valor ELSE 0 END) AS mes_atual,
                SUM(CASE WHEN TRUNC(nf.data, 'MM') = ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -1)
                         THEN nfi.valor ELSE 0 END) AS mes_anterior
            FROM nota_fiscal_itens nfi
            JOIN notas_fiscais nf ON nf.nota_fiscal_id = nfi.nota_fiscal_id
            WHERE nf.usuario_id = :usuario_id
                AND nf.data >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -1)
                AND nf.ativo = 'S'
                AND nfi.ativo = 'S'
            GROUP BY categoria
            ORDER BY (
                SUM(CASE WHEN TRUNC(nf.data, 'MM') = TRUNC(SYSDATE, 'MM') THEN nfi.valor ELSE 0 END)
              - SUM(CASE WHEN TRUNC(nf.data, 'MM') = ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -1) THEN nfi.valor ELSE 0 END)
            ) DESC
        """, {"usuario_id": usuario_id})
        categorias = cursor.fetchall()
        if categorias:
            top = categorias[0]
            aumento = float(top[1]) - float(top[2])
            if aumento > 0 and float(top[2]) > 0:
                insights.append(InsightResponse(
                    tipo="warning", icone="⚠️",
                    mensagem=f"Você aumentou os gastos em {top[0]} em {formatar_moeda(aumento)} este mês."
                ))
            for row in reversed(categorias):
                economia = float(row[2]) - float(row[1])
                if economia > 0 and float(row[2]) > 0:
                    insights.append(InsightResponse(
                        tipo="success", icone="✅",
                        mensagem=f"{row[0]} dentro do limite — economizou {formatar_moeda(economia)} vs. mês passado."
                    ))
                    break

        # --- Dia da semana com maior gasto (últimos 90 dias) ---
        cursor.execute("""
            SELECT TO_CHAR(data, 'D') AS dia_num, SUM(valor_total) AS total
            FROM notas_fiscais nf
            WHERE usuario_id = :usuario_id
                AND data >= SYSDATE - 90
                AND ativo = 'S'
            GROUP BY TO_CHAR(data, 'D')
            ORDER BY SUM(valor_total) DESC
            FETCH FIRST 1 ROW ONLY
        """, {"usuario_id": usuario_id})
        row = cursor.fetchone()
        if row:
            dias = {
                '1': 'domingos', '2': 'segundas-feiras', '3': 'terças-feiras',
                '4': 'quartas-feiras', '5': 'quintas-feiras', '6': 'sextas-feiras',
                '7': 'sábados'
            }
            insights.append(InsightResponse(
                tipo="info", icone="💡",
                mensagem=f"Seu pico de gastos costuma ser nas {dias.get(str(row[0]), 'fins de semana')}."
            ))

        # --- Descontos capturados este mês ---
        cursor.execute("""
            SELECT NVL(SUM(desconto), 0) AS total_descontos
            FROM notas_fiscais nf
            WHERE usuario_id = :usuario_id
                AND TRUNC(data, 'MM') = TRUNC(SYSDATE, 'MM')
                AND ativo = 'S'
        """, {"usuario_id": usuario_id})
        row = cursor.fetchone()
        if row and float(row[0]) > 0:
            insights.append(InsightResponse(
                tipo="success", icone="💸",
                mensagem=f"Você economizou {formatar_moeda(float(row[0]))} em descontos este mês."
            ))

        # --- Categoria campeã do mês ---
        cursor.execute("""
            SELECT categoria, SUM(nfi.valor) AS total
            FROM nota_fiscal_itens nfi
            JOIN notas_fiscais nf ON nf.nota_fiscal_id = nfi.nota_fiscal_id
            WHERE nf.usuario_id = :usuario_id
                AND TRUNC(nf.data, 'MM') = TRUNC(SYSDATE, 'MM')
                AND nf.ativo = 'S'
                AND nfi.ativo = 'S'
            GROUP BY categoria
            ORDER BY SUM(nfi.valor) DESC
            FETCH FIRST 1 ROW ONLY
        """, {"usuario_id": usuario_id})
        row = cursor.fetchone()
        if row:
            insights.append(InsightResponse(
                tipo="info", icone="🛒",
                mensagem=f"{row[0]} foi sua maior categoria este mês — {formatar_moeda(float(row[1]))}."
            ))

    except Exception as e:
        print(f"Erro ao buscar insights: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar insights: {e}")
    else:
        return insights
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.get('/despesas/perfil', response_model=PerfilDespesasResponse)
def busca_perfil_depesas(usuario_id: int):
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            WITH Despesas_Mes_Anterior As (
                SELECT 
                    Aa.Usuario_Id,
                    Sum(Aa.Valor_Total) As Gastos_Totais_Mes_Anterior
                FROM 
                    Notas_Fiscais Aa 
                WHERE 
                    To_Char(Aa.Data, 'MM/YYYY') = To_Char(Add_Months(Sysdate, -1), 'MM/YYYY')
                GROUP BY 
                    Aa.Usuario_Id
            )
            SELECT
                Sum(A.Valor_Total) As Gastos_Totais,
                Round(((Sum(A.Valor_Total) / B.Orcamento_Mensal) * 100), 2) As Orcamento_Gasto,
                NVL(Round(
                    ((Nvl(Sum(A.Valor_Total),0) - Nvl(C.Gastos_Totais_Mes_Anterior, 0)) / C.Gastos_Totais_Mes_Anterior) * 100,
                    2
                ), 0) As Perc_Ref_Mes_Anterior,
                Max(Valor_Total) As Maior_Compra,
                Count(A.Nota_Fiscal_Id) As Qtd_Compras,
                Sum(A.Valor_Total) / Count(A.Nota_Fiscal_Id) As Despesa_Media
            FROM
                Notas_Fiscais A 
                JOIN Usuarios B ON A.Usuario_Id = B.Usuario_Id
                LEFT JOIN Despesas_Mes_Anterior C ON C.Usuario_Id = B.Usuario_Id
            WHERE
                B.Usuario_Id = :Usuario_Id
                AND To_Char(A.Data, 'MM/YYYY') = TO_CHAR(Sysdate, 'MM/YYYY')
            GROUP BY
                B.Usuario_Id, 
                Orcamento_Mensal,
                Gastos_Totais_Mes_Anterior;
            """, {"Usuario_Id": usuario_id})

        result = cursor.fetchone()
        cursor.close()
        connection.close()

        if not result:
            raise HTTPException(status_code=404, detail="Nenhum dado encontrado para o usuário no mês atual")

        return PerfilDespesasResponse(
            gastos_totais=result[0] or 0,
            perc_orcamento_consumido=result[1] or 0,
            perc_relativo_mes_anterior=result[2] or 0,
            maior_compra=result[3] or 0,
            qtd_compras=result[4] or 0,
            compra_media=result[5] or 0,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar perfil de despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar perfil de despesas: {e}")
    
# //////////////////////////
# Rotas de notas fiscais  //
# //////////////////////////

def busca_payload_nota_fiscal(nota_fiscal_id: int):
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
                nota_fiscal_id,
                nf.usuario_id,
                nf.data,
                nf.valor_total,
                nf.desconto,
                nfi.nota_fiscal_item_id,
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
                nota_fiscal_item_id=row[5],
                nome_produto=row[6],
                quantidade=float(row[7]) if row[7] else 0.0,
                preco_unitario=float(row[8]) if row[8] else 0.0,
                desconto=float(row[9]) if row[9] else 0.0,
                preco_total=float(row[10]) if row[10] else 0.0,
                unidade_medida=row[11],
                categoria=row[12]
            ))

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao estabelecer conexão com o banco de dados: {e}")
        raise HTTPException(status_code=503, detail="Erro ao buscar itens da nota fiscal: " + str(e))
    else:
        return NotaFiscalDetalhes(
            nota_fiscal_id=primeiro_registro[0],
            usuario_id=primeiro_registro[1],
            data_compra=primeiro_registro[2].strftime("%Y-%m-%d") if primeiro_registro[2] else "",
            itens=itens,
            preco_final_pago=float(primeiro_registro[3]) if primeiro_registro[3] else 0.0,
            desconto_total=float(primeiro_registro[4]) if primeiro_registro[4] else 0.0,
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.get("/nota_fiscal", response_model=list[NotaFiscalGet])
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


@app.post("/nota_fiscal", response_model=InsertItemResponse)
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


@app.put("/nota_fiscal", response_model=MessageResponse)
def update_nota_fiscal(payload: NotaFiscalDetalhes):

    if not payload.nota_fiscal_id:
        raise HTTPException(status_code=400, detail="nota_fiscal_id é obrigatório para atualização")
    
    nota_fiscal_id = payload.nota_fiscal_id

    payload_banco = busca_payload_nota_fiscal(nota_fiscal_id)
    payload_banco_dict = payload_banco.model_dump(mode="json")
    payload_dict = payload.model_dump(mode="json")
    diff = DeepDiff(payload_banco_dict, payload_dict, ignore_order=True)
    message = ''
    # return MessageResponse(diff=diff)
    novos_valores = {'data_compra': None, 'preco_final_pago': None, 'desconto_total': None}

    # Busca mudanças nos campos principais
    if 'values_changed' in diff:
        values_changed = diff['values_changed']
        for key, change in values_changed.items():
            if not key.startswith("root['itens']"):
                for field in novos_valores:
                    if key.endswith(f"['{field}']") or key.endswith(f".{field}"):
                        novos_valores[field] = change['new_value']
    
    # Se os campos principais não tiverem mudanças, busca mudanças de tipo (ex: string para float) e atualiza os valores principais com base nisso
    if any(value is None for value in novos_valores.values()) and 'type_changes' in diff:
        type_changes = diff['type_changes']
        for key, change in type_changes.items():
            if not key.startswith("root['itens']"):
                for field in novos_valores:
                    if key.endswith(f"['{field}']") or key.endswith(f".{field}"):
                        novos_valores[field] = change['new_value']
                        # message += f"{field} atualizado de {change['old_value']} para {change['new_value']} (mudança de tipo).\n"

    # (mantém os valores antigos se não houver mudanças)
    for field, new_value in novos_valores.items():
        if new_value is None:
            novos_valores[field] = payload_banco_dict[field]
    
    itens_modificados = {}

    if 'values_changed' in diff:
        values_changed = diff['values_changed']
        for key, change in values_changed.items():
            if key.startswith("root['itens']"):
                item_index = key.split("[")[2].split("]")[0]
                item_id = payload_banco_dict['itens'][int(item_index)]['nota_fiscal_item_id']
                if item_id not in itens_modificados:
                    itens_modificados[item_id] = {"index": int(item_index), 
                                                  "nome_produto": payload_banco_dict['itens'][int(item_index)]['nome_produto'], 
                                                  "quantidade": payload_banco_dict['itens'][int(item_index)]['quantidade'], 
                                                  "preco_unitario": payload_banco_dict['itens'][int(item_index)]['preco_unitario'], 
                                                  "desconto": payload_banco_dict['itens'][int(item_index)]['desconto'], 
                                                  "preco_total": payload_banco_dict['itens'][int(item_index)]['preco_total'], 
                                                  "unidade_medida": payload_banco_dict['itens'][int(item_index)]['unidade_medida'], 
                                                  "categoria": payload_banco_dict['itens'][int(item_index)]['categoria']}
                
                if item_id in itens_modificados:
                    if key.endswith("['nome_produto']"):
                        itens_modificados[item_id]['nome_produto'] = change['new_value'] 
                    elif key.endswith("['quantidade']"):
                        itens_modificados[item_id]['quantidade'] = change['new_value'] 
                    elif key.endswith("['preco_unitario']"):
                        itens_modificados[item_id]['preco_unitario'] = change['new_value'] 
                    elif key.endswith("['desconto']"):
                        itens_modificados[item_id]['desconto'] = change['new_value'] 
                    elif key.endswith("['preco_total']"):
                        itens_modificados[item_id]['preco_total'] = change['new_value'] 
                    elif key.endswith("['unidade_medida']"):
                        itens_modificados[item_id]['unidade_medida'] = change['new_value'] 
                    elif key.endswith("['categoria']"):
                        itens_modificados[item_id]['categoria'] = change['new_value'] 
    

    itens_removidos = []

    if 'iterable_item_removed' in diff:
        items_removed = diff['iterable_item_removed']
        for key, value in items_removed.items():
            if key.startswith("root['itens']"):
                item_index = key.split("[")[2].split("]")[0]
                item_id = value['nota_fiscal_item_id']
                itens_removidos.append(item_id)

    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()

        cursor.execute("""
            UPDATE notas_fiscais
            SET data = TO_DATE(:data_compra, 'YYYY-MM-DD'),
                valor_total = TO_NUMBER(:preco_final_pago),
                desconto = TO_NUMBER(:desconto_total)
            WHERE nota_fiscal_id = :nota_fiscal_id
        """, {
            "data_compra": novos_valores['data_compra'],
            "preco_final_pago": novos_valores['preco_final_pago'],
            "desconto_total": novos_valores['desconto_total'],
            "nota_fiscal_id": nota_fiscal_id
        })

        for item_id, item in itens_modificados.items():
            cursor.execute("""
                UPDATE nota_fiscal_itens
                SET produto = :produto,
                    valor = :valor,
                    quantidade = :quantidade,
                    valor_unitario = :valor_unitario,
                    valor_desconto = :valor_desconto,
                    unidade_medida = :unidade_medida,
                    categoria = :categoria
                WHERE nota_fiscal_item_id = :nota_fiscal_item_id
            """, {
                "produto": item['nome_produto'],
                "valor": float(item['preco_total']) if item['preco_total'] else None,
                "quantidade": float(item['quantidade']) if item['quantidade'] else None,
                "valor_unitario": float(item['preco_unitario']) if item['preco_unitario'] else None,
                "valor_desconto": float(item['desconto']) if item['desconto'] else None,
                "unidade_medida": item['unidade_medida'] if item['unidade_medida'] and len(item['unidade_medida']) <= 2 else None, #char(2)
                "categoria": item['categoria'],
                "nota_fiscal_item_id": item_id
            })
        
        for item_id in itens_removidos:
            cursor.execute("""
                DELETE FROM nota_fiscal_itens
                WHERE nota_fiscal_item_id = :item_id
            """, {"item_id": item_id})

        connection.commit()
    
    except Exception as e:
        print(f"Erro ao atualizar nota fiscal: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar nota fiscal: " + str(e))
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
        message += "Nota fiscal atualizada com sucesso.\n"
    return MessageResponse(msg=message)
             

    


@app.get("/nota_fiscal/{nota_fiscal_id}", response_model=NotaFiscalDetalhes)
async def busca_iten_nota_fiscal(nota_fiscal_id: int):
    try:
        return busca_payload_nota_fiscal(nota_fiscal_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar detalhes da nota fiscal: {e}")
        raise HTTPException(status_code=503, detail="Erro ao buscar detalhes da nota fiscal: " + str(e))

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

    response = get_openai_client().responses.create(
        model="gpt-5.4-mini",
        reasoning={"effort": "medium"},
        input=prompt
    )

    output = response.output_text
    if not output:
        raise HTTPException(
            status_code=422,
            detail="Modelo não retornou texto. Verifique se a URL da NFC-e é válida e contém dados legíveis."
        )

    return {"text": output}

@app.post("/redefinir_senha", response_model=MessageResponse)
def redefinir_senha(email_destino: str):
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)
        
        cursor = connection.cursor()
        cursor.execute("SELECT usuario_id FROM usuarios WHERE email = :email", {"email": email_destino})
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Email não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao gerar token de redefinição de senha: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar token de redefinição de senha: {e}")
    
    SECRET_KEY = os.getenv("SECRET_KEY")

    try:
        token = jwt.encode(
            {"email": email_destino, "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1)},
            SECRET_KEY,
            algorithm="HS256"
        )
        enviar_redefinicao_senha(email_destino, token)
    except Exception as e:
        print(f"Erro ao enviar email de redefinição de senha: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar email de redefinição de senha: {e}")
    else:
        return MessageResponse(msg="Email de redefinição de senha enviado com sucesso.")
    
@app.put("/redefinir_senha", response_model=MessageResponse)
def atualizar_senha(token: str, nova_senha: str):
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Valida o token e extrai o email
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=404, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=404, detail="Token expirado")
    except jwt.InvalidTokenError as e:
        print(f"Erro ao decodificar token JWT: {e}")
        raise HTTPException(status_code=404, detail="Token inválido")
    except HTTPException:
        raise
    
    # Atualiza a senha no banco de dados
    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("SELECT usuario_id FROM usuarios WHERE email = :email", {"email": email})
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Email não encontrado")

        usuario_id = result[0]
        cursor.execute("UPDATE usuarios SET senha = pkg_auth.encrypt_pwd(:senha) WHERE usuario_id = :usuario_id",
                       {"senha": nova_senha, "usuario_id": usuario_id})
        connection.commit()

    except Exception as e:
        print(f"Erro ao atualizar senha: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar senha: {e}")
    else:
        return MessageResponse(msg="Senha atualizada com sucesso.")