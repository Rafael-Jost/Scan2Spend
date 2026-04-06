import { useState, useEffect } from 'react'
import trashIcon from "../assets/trash.png";

export default function CardEdicao(json) {

    const [precoFinalPago, setPrecoFinalPago] = useState(0);
    const [descontoTotal, setDescontoTotal] = useState(0);
    const [dataCompra, setDataCompra] = useState('');
    const [items, setItems] = useState([]);
    
    if (json === null) {
        return (
            <div className="cards-edicao-container">
                <h2>Dados da Nota Fiscal</h2>
                <p>Nenhum dado disponível.</p>
            </div>
        )
    }

    useEffect(() => {
        const payload = json.json; 
        const itemsData = payload.itens ?? [];

        const data_sem_horario = payload.data_compra ? payload.data_compra.split(' ')[0] : '';
        const data_formatada = data_sem_horario ? data_sem_horario.split('/').reverse().join('-') : '';
        setDataCompra(data_formatada);

        var preco_final_pago = payload.preco_final_pago;

        if (preco_final_pago == 0){
            for (let item of itemsData) {
                preco_final_pago += item.preco_total ? item.preco_total : 0;
            }
        }
        setPrecoFinalPago(preco_final_pago);
        setDescontoTotal(payload.desconto_total || 0);
        setItems(itemsData);
    }, [json]);
    
    return(
        <>
        <h2 className="titulo-nota-fiscal">Dados da Nota Fiscal</h2>
        <div className="edicao-resumo-container">
            <p className="edicao-resumo-item">
                <span>Data da compra</span>
                <input className="input-data-compra" type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)}></input>
            </p>
            <p className="edicao-resumo-item">
                <span>Preço Total (R$)</span>
                <input className="input-preco-final-pago" type="number" step="0.01" value={precoFinalPago} onChange={(e) => setPrecoFinalPago(Number(e.target.value))}></input>
            </p>
            <p className="edicao-resumo-item">
                <span>Desconto Total (R$)</span>
                <input className="input-desconto-total" type="number" step="0.01" value={descontoTotal} onChange={(e) => setDescontoTotal(Number(e.target.value))}></input>
            </p>
        </div>
        <div id="cards-edicao-container">
            {items.map(({nome_produto, unidade_medida, quantidade, preco_unitario, preco_total, desconto, categoria}, index) => (
                <div key={index}>
                    <div className="card-edicao">
                        <button className="botao-remover" onClick={() => removerItem(index)}><img style={{width: 15, height: 15}} src={trashIcon} alt="Remover item"></img></button>
                        <p>
                            <span className="campo-label">Produto</span>
                            <input className="nome-produto-input" type="text" defaultValue={nome_produto}></input>
                        </p>
                        <p>
                            <span className="campo-label">Quantidade (<span className='unidade-medida-span'>{unidade_medida}</span>)</span>
                            <input className="quantidade-input" type="number" defaultValue={quantidade}></input>
                        </p>
                        <p>
                            <span className="campo-label">Preço Unitário (R$)</span>
                            <input className="input-preco_unitario" type="number" step="0.01" defaultValue={preco_unitario ? preco_unitario.toFixed(2) : 0}></input>
                        </p>
                        <p>
                            <span className="campo-label">Desconto (R$)</span>
                            <input className="input-desconto" type="number" step="0.01" defaultValue={desconto ? desconto.toFixed(2) : 0}></input>
                        </p>
                        <p>
                            <span className="campo-label">Preço Total (R$)</span>
                            <input className="input-preco_total" type="number" step="0.01" defaultValue={preco_total ? preco_total.toFixed(2) : 0}></input>
                        </p>
                        <p>
                            <span className="campo-label">Categoria</span>
                            <select className="input-categoria" defaultValue={categoria || ""}>
                                <option value="" disabled>Selecione</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Bebidas">Bebidas</option>
                                <option value="Pets">Pets</option>
                                <option value="Higiene Pessoal">Higiene Pessoal</option>
                                <option value="Limpeza">Limpeza</option>
                                <option value="Utilidades">Utilidades</option>
                                <option value="Lanches & Conveniência">Lanches & Conveniência</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </p>
                    </div>
                </div>
            ))}
        </div>
        </>
    )
}

export async function SalvarPayload(usuarioId){
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


function removerItem(index) {
    const cardParaRemover = document.querySelectorAll('.card-edicao')[index];
    const inputParaRemover = document.querySelectorAll('.input-preco_total')[index];

    //recalcula o preço final pago
    const precoFinalPagoInput = document.querySelector('.input-preco-final-pago');
    precoFinalPagoInput.value = (parseFloat(precoFinalPagoInput.value) - parseFloat(inputParaRemover.value)).toFixed(2);

    cardParaRemover.remove();
}