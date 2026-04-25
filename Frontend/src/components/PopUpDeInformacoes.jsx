import CardEdicao from './CardsEdicao.jsx'
import { useState } from 'react'

function PopUpDeInformacoes({conteudo, popupAberto, setPopupAberto, atualizarGraficos, usuarioId}) {
    const [notaFiscalId, setNotaFiscalId] = useState(null);

    return (
    <div id="popup-informacoes" style={{ display: popupAberto ? 'flex' : 'none' }}>
      <div id="painel-de-informacoes">
        <CardEdicao json={conteudo} setNotaFiscalId={setNotaFiscalId} />
        <button
          style={{ marginTop: '20px' }}
          onClick={() => {
            setPopupAberto(false)
          }}
        >
          Fechar
        </button>
        <button
          style={{ marginTop: '20px', marginLeft: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px' }}
          onClick={async () => {
            const status_salvamento = await SalvarPayload(usuarioId, notaFiscalId);
            alert(status_salvamento);
            setPopupAberto(false);
            atualizarGraficos();
          }}>
          Salvar
        </button>
      </div>
    </div>
  );
  
}

export async function SalvarPayload(usuarioId, notaFiscalId) {

    if (notaFiscalId) {
        console.log('Editando nota fiscal existente com ID:', notaFiscalId);
        return
    } else {
        console.log('Criando nova nota fiscal');
        return
    }
    const nomeProdutoInputs = document.querySelectorAll('.nome-produto-input');
    const quantidadeInputs = document.querySelectorAll('.quantidade-input');
    const precoUnitarioInputs = document.querySelectorAll('.input-preco_unitario');
    const descontoInputs = document.querySelectorAll('.input-desconto');
    const precoTotalInputs = document.querySelectorAll('.input-preco_total');
    const dataCompraInputs = document.querySelectorAll('.input-data-compra');
    const precoFinalPagoInputs = document.querySelectorAll('.input-preco-final-pago');
    const unidadeMedida = document.querySelectorAll('.unidade-medida-span');
    const categoriaInputs = document.querySelectorAll('.input-categoria');
    const descontoTotalInput = document.querySelector('.input-desconto-total');

    const produtos = [];
    
    for (let i = 0; i < nomeProdutoInputs.length; i++) {
        produtos.push({
            nome_produto: nomeProdutoInputs[i].value,
            quantidade: parseFloat(quantidadeInputs[i].value),
            preco_unitario: parseFloat(precoUnitarioInputs[i].value),
            desconto: parseFloat(descontoInputs[i].value),
            preco_total: parseFloat(precoTotalInputs[i].value),
            unidade_medida: unidadeMedida[i].textContent,
            categoria: categoriaInputs[i].value
        });
    }

    const payloadAtualizado = {
        usuario_id: usuarioId,
        data_compra: dataCompraInputs[0].value,
        preco_final_pago: parseFloat(precoFinalPagoInputs[0].value),
        desconto_total: parseFloat(descontoTotalInput.value),
        itens: produtos
    };

    const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/nota_fiscal/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payloadAtualizado)
    })
    if (response.ok) {
        return 'Dados salvos com sucesso!';
    } else {
        return 'Erro ao salvar os dados.';
    }
}
export default PopUpDeInformacoes
