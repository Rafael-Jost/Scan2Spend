from fastapi import APIRouter, HTTPException, Request

from database import makeDBconnection
from models.schemas import (
    DespesasResponse, DescontosResponse, PerfilDespesasResponse,
    DespesasCategoriasResponse, InsightResponse, topProdutosResponse
)
from routers.auth import validar_token_login

router = APIRouter()


@router.get('/despesas/', response_model=list[DespesasResponse])
def busca_despesas(request: Request, dt_inicio: str, dt_fim: str, tipo_agrupamento: str):
    connection = None
    cursor = None
    try:
        usuario_id, _ = validar_token_login(request.cookies.get("token"))

        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN TRUNC(DATA)
                END AS DATA_DESPESA,
                SUM(valor_total) AS VALOR_TOTAL
            FROM
                notas_fiscais nf
            WHERE
                    usuario_id = :usuario_id
                AND data BETWEEN TO_DATE(:dt_inicio, 'DD/MM/YYYY') AND TO_DATE(:dt_fim, 'DD/MM/YYYY')
            GROUP BY
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN TRUNC(DATA)
                END
            ORDER BY
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN TRUNC(DATA)
                END
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "tipo_agrupamento": tipo_agrupamento, "usuario_id": usuario_id})

        result = cursor.fetchall()
        despesas = []
        for row in result:
            despesas.append(DespesasResponse(
                data=(
                    row[0].strftime("%Y") if tipo_agrupamento == 'ANO'
                    else row[0].strftime("%m/%Y") if tipo_agrupamento == 'MES'
                    else row[0].strftime("%d/%m/%Y")
                ),
                despesa=float(row[1])
            ))

    except Exception as e:
        print(f"Erro ao buscar despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar despesas: {e}")
    else:
        return despesas
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get('/despesas/categorias', response_model=list[DespesasCategoriasResponse])
def busca_despesas_categorias(request: Request, dt_inicio: str, dt_fim: str, tipo_agrupamento: str = None):
    connection = None
    cursor = None
    try:
        usuario_id, _ = validar_token_login(request.cookies.get("token"))

        if not tipo_agrupamento:
            tipo_agrupamento = 'ANO'

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
            GROUP BY
                categoria,
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN trunc(data, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN trunc(data, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN trunc(data)
                END
            ORDER BY
                categoria,
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN trunc(data, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN trunc(data, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN trunc(data)
                END
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "usuario_id": usuario_id, "tipo_agrupamento": tipo_agrupamento})

        result = cursor.fetchall()
        despesas = []
        for row in result:
            despesas.append(DespesasCategoriasResponse(
                categoria=row[0],
                data=(
                    row[2].strftime("%Y") if tipo_agrupamento == 'ANO'
                    else row[2].strftime("%m/%Y") if tipo_agrupamento == 'MES'
                    else row[2].strftime("%d/%m/%Y")
                ),
                despesa=float(row[1])
            ))

    except Exception as e:
        print(f"Erro ao buscar despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar despesas: {e}")
    else:
        return despesas
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get('/despesas/categorias/periodo', response_model=list[dict])
def busca_despesas_categorias_periodo(request: Request, dt_inicio: str, dt_fim: str, tipo_agrupamento: str = None):
    CATEGORIAS = ['Alimentação', 'Bebidas', 'Higiene Pessoal', 'Lanches & Conveniência', 'Limpeza', 'Outros', 'Pets', 'Utilidades']

    connection = None
    cursor = None
    try:
        usuario_id, _ = validar_token_login(request.cookies.get("token"))

        if not tipo_agrupamento:
            tipo_agrupamento = 'ANO'

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
                    'Alimentação'            AS "Alimentação",
                    'Bebidas'                AS "Bebidas",
                    'Higiene Pessoal'        AS "Higiene Pessoal",
                    'Lanches & Conveniência' AS "Lanches & Conveniência",
                    'Limpeza'                AS "Limpeza",
                    'Outros'                 AS "Outros",
                    'Pets'                   AS "Pets",
                    'Utilidades'             AS "Utilidades"
                )
            )
            ORDER BY data_despesa
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "usuario_id": usuario_id, "tipo_agrupamento": tipo_agrupamento})

        result = cursor.fetchall()
        despesas = []
        for row in result:
            data_str = (
                row[0].strftime("%Y") if tipo_agrupamento == 'ANO'
                else row[0].strftime("%m/%Y") if tipo_agrupamento == 'MES'
                else row[0].strftime("%d/%m/%Y")
            )
            entry = {"data": data_str}
            for i, cat in enumerate(CATEGORIAS):
                entry[cat] = float(row[i + 1]) if row[i + 1] is not None else 0.0
            despesas.append(entry)

    except Exception as e:
        print(f"Erro ao buscar despesas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar despesas: {e}")
    else:
        return despesas
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get('/descontos/', response_model=list[DescontosResponse])
def busca_descontos(request: Request, dt_inicio: str, dt_fim: str, tipo_agrupamento: str):
    connection = None
    cursor = None
    try:
        usuario_id, _ = validar_token_login(request.cookies.get("token"))

        connection = makeDBconnection()
        if 'Erro' in str(connection):
            connection = None
            raise Exception(connection)

        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN TRUNC(DATA)
                END AS DATA_DESPESA,
                SUM(desconto) AS DESCONTO
            FROM
                notas_fiscais nf
            WHERE
                    usuario_id = :usuario_id
                AND data BETWEEN TO_DATE(:dt_inicio, 'DD/MM/YYYY') AND TO_DATE(:dt_fim, 'DD/MM/YYYY')
            GROUP BY
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN TRUNC(DATA)
                END
            ORDER BY
                CASE
                    WHEN :tipo_agrupamento = 'ANO' THEN TRUNC(DATA, 'YYYY')
                    WHEN :tipo_agrupamento = 'MES' THEN TRUNC(DATA, 'MM')
                    WHEN :tipo_agrupamento = 'DIA' THEN TRUNC(DATA)
                END
        """, {"dt_inicio": dt_inicio, "dt_fim": dt_fim, "tipo_agrupamento": tipo_agrupamento, "usuario_id": usuario_id})

        result = cursor.fetchall()
        descontos = []
        for row in result:
            descontos.append(DescontosResponse(
                data=(
                    row[0].strftime("%Y") if tipo_agrupamento == 'ANO'
                    else row[0].strftime("%m/%Y") if tipo_agrupamento == 'MES'
                    else row[0].strftime("%d/%m/%Y")
                ),
                desconto=float(row[1]) if row[1] is not None else 0.0
            ))

    except Exception as e:
        print(f"Erro ao buscar descontos: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar descontos: {e}")
    else:
        return descontos
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get('/despesas/topProdutos', response_model=list[topProdutosResponse])
def busca_top_produtos(request: Request, dt_inicio: str, dt_fim: str):
    connection = None
    cursor = None
    try:
        usuario_id, _ = validar_token_login(request.cookies.get("token"))

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
        top_produtos = []
        for row in result:
            top_produtos.append(topProdutosResponse(
                nome_produto=row[0],
                quantidade=float(row[1]),
                unidade_medida=row[2]
            ))

    except Exception as e:
        print(f"Erro ao buscar top produtos: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar top produtos: {e}")
    else:
        return top_produtos
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get('/despesas/insights', response_model=list[InsightResponse])
def busca_insights(request: Request):
    usuario_id, _ = validar_token_login(request.cookies.get("token"))

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


@router.get('/despesas/perfil', response_model=PerfilDespesasResponse)
def busca_perfil_despesas(request: Request):
    usuario_id, _ = validar_token_login(request.cookies.get("token"))
    connection = None
    cursor = None
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
                Gastos_Totais_Mes_Anterior
        """, {"Usuario_Id": usuario_id})

        result = cursor.fetchone()
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
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
