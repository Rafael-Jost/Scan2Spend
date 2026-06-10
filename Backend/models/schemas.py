from pydantic import BaseModel
from typing import List, Optional

class DespesasResponse(BaseModel):
    data: str
    despesa: float

class DescontosResponse(BaseModel):
    data: str
    desconto: float

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
    token: str

class CadastroUsuario(BaseModel):
    nome: str
    sobrenome: str
    email: str
    senha: str
    orcamento_mensal: float

class AtualizarUsuario(BaseModel):
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
    orcamento_mensal: float

class ValidadeTokenResponse(BaseModel):
    msg: str
    hora_expiracao: str

class MessageResponse(BaseModel):
    msg: str = None

class RedefinirSenhaRequest(BaseModel):
    token: str
    nova_senha: str