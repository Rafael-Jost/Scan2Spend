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
from deepdiff import DeepDiff

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
    nota_fiscal_item_id: int = None
    nome_produto: str
    quantidade: float
    preco_unitario: float
    desconto: float
    preco_total: float
    unidade_medida: str
    categoria: str
    
class NotaFiscalDetalhes(BaseModel):
    nota_fiscal_id: int = None
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

class ValidadeTokenResponse(BaseModel):
    msg: str
    hora_expiracao: str

class MessageResponse(BaseModel):
    msg: str = None
    diff: dict = None

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


@app.put("/nota_fiscal", response_model=MessageResponse)
def update_nota_fiscal(payload: NotaFiscalDetalhes):

    nota_fiscal_id = payload.nota_fiscal_id

    payload_banco = busca_payload_nota_fiscal(nota_fiscal_id)
    payload_banco_dict = payload_banco.model_dump(mode="json")
    payload_dict = payload.model_dump(mode="json")
    diff = DeepDiff(payload_banco_dict, payload_dict, ignore_order=True)
    message = ''
    # return MessageResponse(diff=diff)
    novos_valores = {'data_compra': None, 'preco_final_pago': None, 'desconto_total': None}

    message += "Analisando mudanças na nota fiscal...\n"
    # Busca mudanças nos campos principais
    if 'values_changed' in diff:
        values_changed = diff['values_changed']
        for key, change in values_changed.items():
            if not key.startswith("root['itens']"):
                for field in novos_valores:
                    if key.endswith(f"['{field}']") or key.endswith(f".{field}"):
                        novos_valores[field] = change['new_value']
                        # message += f"{field} atualizado de {change['old_value']} para {change['new_value']}.\n"
    
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
            # message += f"{field} mantido como {payload_banco_dict[field]}.\n"

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

        connection.commit()
    
    except Exception as e:
        print(f"Erro ao atualizar nota fiscal: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar nota fiscal: " + str(e))
    finally:
        message += "Nota fiscal atualizada com sucesso.\n"
        if cursor:
            cursor.close()
        if connection:
            connection.close()



    message += "Analisando mudanças nos itens da nota fiscal...\n"
    
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
    
    for item_id, changes in itens_modificados.items():
        message += f"Item modificado: {item_id}.\n"
        # for field, new_value in changes.items():
        #     if field == "index":
        #         continue
        #     if new_value is not None:
        #         message += f" - {field} atualizado para {new_value}.\n"
        #     else:
        #         message += f" - {field} mantido como {payload_banco_dict['itens'][changes['index']][field]}.\n"
                # message += f"Item modificado: {item_id} mudou de {change['old_value']} para {change['new_value']}.\n"


    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):  
            connection = None
            raise Exception(connection)
        cursor = connection.cursor()
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
                "quantidade": int(item['quantidade']) if item['quantidade'] else None,
                "valor_unitario": float(item['preco_unitario']) if item['preco_unitario'] else None,
                "valor_desconto": float(item['desconto']) if item['desconto'] else None,
                "unidade_medida": item['unidade_medida'] if item['unidade_medida'] and len(item['unidade_medida']) <= 2 else None, #char(2)
                "categoria": item['categoria'],
                "nota_fiscal_item_id": item_id
            })

        connection.commit()
    except Exception as e:
        print(f"Erro ao atualizar itens da nota fiscal: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar itens da nota fiscal: " + str(e))
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
        if itens_modificados:
            message += "Itens modificados com sucesso.\n"


    itens_removidos = []

    if 'iterable_item_removed' in diff:
        items_removed = diff['iterable_item_removed']
        for key, value in items_removed.items():
            if key.startswith("root['itens']"):
                item_index = key.split("[")[2].split("]")[0]
                item_id = value['nota_fiscal_item_id']
                itens_removidos.append(item_id)
                message += f"Item removido: {item_id} - {payload_banco_dict['itens'][int(item_index)]['nome_produto']}.\n"


    try:
        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        
        for item_id in itens_removidos:
            cursor.execute("""
                DELETE FROM nota_fiscal_itens
                WHERE nota_fiscal_item_id = :item_id
            """, {"item_id": item_id})

        connection.commit()
    except Exception as e:
        print(f"Erro ao remover itens da nota fiscal: {e}")
        raise HTTPException(status_code=500, detail="Erro ao remover itens da nota fiscal: " + str(e))
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
        if itens_removidos:
            message += "Itens removidos com sucesso.\n"

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

    response = client.responses.create(
        model="gpt-4o-mini",
        input= prompt
    )

    return{
        "text": response.output_text
    }