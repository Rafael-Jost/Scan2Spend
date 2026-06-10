import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, Depends
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from openai import OpenAI
from deepdiff import DeepDiff

from database import get_db
from models.schemas import (
    NotaFiscalGet, NotaFiscalDetalhes, ItemNota,
    InsertItemResponse, ReceiptExpenses, MessageResponse
)
from routers.auth import validar_token_login

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_FILE = BASE_DIR / "utils" / "prompt_analise_nf.txt"

_openai_client = None

def get_openai_client():
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI()
    return _openai_client


def busca_payload_nota_fiscal(nota_fiscal_id: int, connection):
    try:
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
        print(f"Erro ao buscar itens da nota fiscal: {e}")
        raise HTTPException(status_code=503, detail="Erro ao buscar itens da nota fiscal")
    else:
        return NotaFiscalDetalhes(
            nota_fiscal_id=primeiro_registro[0],
            data_compra=primeiro_registro[2].strftime("%Y-%m-%d") if primeiro_registro[2] else "",
            itens=itens,
            preco_final_pago=float(primeiro_registro[3]) if primeiro_registro[3] else 0.0,
            desconto_total=float(primeiro_registro[4]) if primeiro_registro[4] else 0.0,
        )


@router.get("/nota_fiscal", response_model=list[NotaFiscalGet])
async def busca_nota_fiscal(request: Request, connection=Depends(get_db)):

    try:
        usuario_id, _ = validar_token_login(request.cookies.get("__session"))

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
                nf.desconto
            ORDER BY
                nf.data DESC
        """, {"usuario_id": usuario_id})

        result = cursor.fetchall()
        notas_fiscais = []
        for row in result:
            notas_fiscais.append(NotaFiscalGet(
                nota_fiscal_id=row[0],
                data_compra=row[1].strftime("%Y-%m-%d"),
                preco_final_pago=row[2],
                desconto_total=row[3] if row[3] else 0.0,
                quantidade_itens=row[4]
            ))

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar notas fiscais: {e}")
        raise HTTPException(status_code=503, detail="Erro ao buscar notas fiscais")
    else:
        return notas_fiscais


@router.post("/nota_fiscal", response_model=InsertItemResponse)
def insert_item(request: Request, payload: NotaFiscalDetalhes, connection=Depends(get_db)):

    try:
        usuario_id, _ = validar_token_login(request.cookies.get("__session"))

        cursor = connection.cursor()
        id_var = cursor.var(int)

        cursor.execute("""
            INSERT INTO notas_fiscais (data, valor_total, usuario_id, desconto)
            VALUES (to_date(:dt_compra, 'YYYY-MM-DD'), to_number(:preco_final_pago), :usuario_id, to_number(:desconto_total))
            RETURNING nota_fiscal_id INTO :id
        """, {
            "dt_compra": payload.data_compra,
            "preco_final_pago": payload.preco_final_pago,
            "id": id_var,
            "desconto_total": payload.desconto_total,
            "usuario_id": usuario_id
        })

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
                "unidade_medida": produto.unidade_medida if produto.unidade_medida and len(produto.unidade_medida) <= 2 else None,
                "categoria": produto.categoria if produto.categoria else None
            })
        connection.commit()

    except Exception as e:
        print(f"Erro ao inserir item: {e}")
        return {"text": f"Erro ao inserir itens no banco de dados."}
    else:
        return {"text": "Itens inserido com sucesso no banco de dados."}


@router.put("/nota_fiscal", response_model=MessageResponse)
def update_nota_fiscal(request: Request, payload: NotaFiscalDetalhes, connection=Depends(get_db)):
    usuario_id, _ = validar_token_login(request.cookies.get("__session"))

    if not payload.nota_fiscal_id:
        raise HTTPException(status_code=400, detail="nota_fiscal_id é obrigatório para atualização")

    nota_fiscal_id = payload.nota_fiscal_id
    payload_banco = busca_payload_nota_fiscal(nota_fiscal_id, connection)
    payload_banco_dict = payload_banco.model_dump(mode="json")
    payload_dict = payload.model_dump(mode="json")
    diff = DeepDiff(payload_banco_dict, payload_dict, ignore_order=True)

    novos_valores = {'data_compra': None, 'preco_final_pago': None, 'desconto_total': None}

    if 'values_changed' in diff:
        for key, change in diff['values_changed'].items():
            if not key.startswith("root['itens']"):
                for field in novos_valores:
                    if key.endswith(f"['{field}']") or key.endswith(f".{field}"):
                        novos_valores[field] = change['new_value']

    if any(v is None for v in novos_valores.values()) and 'type_changes' in diff:
        for key, change in diff['type_changes'].items():
            if not key.startswith("root['itens']"):
                for field in novos_valores:
                    if key.endswith(f"['{field}']") or key.endswith(f".{field}"):
                        novos_valores[field] = change['new_value']

    for field, new_value in novos_valores.items():
        if new_value is None:
            novos_valores[field] = payload_banco_dict[field]

    itens_modificados = {}
    if 'values_changed' in diff:
        for key, change in diff['values_changed'].items():
            if key.startswith("root['itens']"):
                item_index = int(key.split("[")[2].split("]")[0])
                item_id = payload_banco_dict['itens'][item_index]['nota_fiscal_item_id']
                if item_id not in itens_modificados:
                    itens_modificados[item_id] = {k: payload_banco_dict['itens'][item_index][k]
                                                  for k in ('nome_produto', 'quantidade', 'preco_unitario',
                                                             'desconto', 'preco_total', 'unidade_medida', 'categoria')}
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
        for key, value in diff['iterable_item_removed'].items():
            if key.startswith("root['itens']"):
                itens_removidos.append(value['nota_fiscal_item_id'])

    try:
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
                "unidade_medida": item['unidade_medida'] if item['unidade_medida'] and len(item['unidade_medida']) <= 2 else None,
                "categoria": item['categoria'],
                "nota_fiscal_item_id": item_id
            })

        for item_id in itens_removidos:
            cursor.execute(
                "DELETE FROM nota_fiscal_itens WHERE nota_fiscal_item_id = :item_id",
                {"item_id": item_id}
            )

        connection.commit()

    except Exception as e:
        print(f"Erro ao atualizar nota fiscal: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar nota fiscal.")
    else:
        return MessageResponse(msg="Nota fiscal atualizada com sucesso.")


@router.get("/nota_fiscal/{nota_fiscal_id}", response_model=NotaFiscalDetalhes)
async def busca_iten_nota_fiscal(nota_fiscal_id: int, connection=Depends(get_db)):
    try:
        return busca_payload_nota_fiscal(nota_fiscal_id, connection)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar detalhes da nota fiscal: {e}")
        raise HTTPException(status_code=503, detail="Erro ao buscar detalhes da nota fiscal.")


@router.get("/analisar_nf/", response_model=ReceiptExpenses)
async def analisar_nf(QRurl: str):
    try:
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
