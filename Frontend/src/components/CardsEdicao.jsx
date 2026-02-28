import { useState, useEffect } from 'react'
import trashIcon from "../assets/trash.png";

export default function CardEdicao(json) {

    const [precoFinalPago, setPrecoFinalPago] = useState(0);
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
        console.log("Dados recebidos para edição: ", json);
        const payload = json.json; 
        const itemsData = payload.itens ?? [];
        console.log("Itens extraídos: ", itemsData);

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
        setItems(itemsData);
        console.log("preço Total pago: ", preco_final_pago);
    }, [json]);
    
    return(
        <>
        <h2>Dados da Nota Fiscal</h2>
        <p> Data da compra: <input className="input-data-compra" type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)}></input></p>
        <p>Preço Total: R$ <input className="input-preco-final-pago" type="number" step="0.01" value={precoFinalPago} onChange={(e) => setPrecoFinalPago(Number(e.target.value))}></input></p>
        <div id="cards-edicao-container">
            {items.map(({nome_produto, unidade_medida, quantidade, preco_unitario, preco_total, desconto}, index) => (
                <div className="card-edicao" key={nome_produto}>
                    <button className="botao-remover" onClick={() => removerItem(index)}><img style={{width: 15, height: 15}} src={trashIcon}></img></button>
                    <p><input className="nome-produto-input" type="text" defaultValue={nome_produto}></input></p>
                    <p>Quantidade: <input className="quantidade-input" type="number" defaultValue={quantidade}></input> (<span className='unidade-medida-span'>{unidade_medida}</span>)</p>
                    <p>Preço Unitário: R$ <input className="input-preco_unitario" type="number" defaultValue={preco_unitario ? preco_unitario.toFixed(2) : 0}></input></p>
                    <p>Desconto: R$ <input className="input-desconto" type="number" defaultValue={desconto ? desconto.toFixed(2) : 0}></input></p>
                    <p>Preço Total: R$ <input className="input-preco_total" type="number" defaultValue={preco_total ? preco_total.toFixed(2) : 0}></input></p>
                </div>
            ))}
        </div>
        </>
    )
}

export function SalvarPayload(){
    const nomeProdutoInputs = document.querySelectorAll('.nome-produto-input');
    const quantidadeInputs = document.querySelectorAll('.quantidade-input');
    const precoUnitarioInputs = document.querySelectorAll('.input-preco_unitario');
    const descontoInputs = document.querySelectorAll('.input-desconto');
    const precoTotalInputs = document.querySelectorAll('.input-preco_total');
    const dataCompraInputs = document.querySelectorAll('.input-data-compra');
    const precoFinalPagoInputs = document.querySelectorAll('.input-preco-final-pago');
    const unidadeMedida = document.querySelectorAll('.unidade-medida-span');

    const produtos = [];
    
    for (let i = 0; i < nomeProdutoInputs.length; i++) {
        produtos.push({
            nome_produto: nomeProdutoInputs[i].value,
            quantidade: parseFloat(quantidadeInputs[i].value),
            preco_unitario: parseFloat(precoUnitarioInputs[i].value),
            desconto: parseFloat(descontoInputs[i].value),
            preco_total: parseFloat(precoTotalInputs[i].value),
            unidade_medida: unidadeMedida[i].textContent
        });
    }
    console.log("Produtos coletados para salvamento:", produtos);

    const payloadAtualizado = {
        data_compra: dataCompraInputs[0].value,
        preco_final_pago: parseFloat(precoFinalPagoInputs[0].value),
        itens: produtos
    };

    console.log("Payload atualizado:", payloadAtualizado);

    
}


function removerItem(index) {
    const cardParaRemover = document.querySelectorAll('.card-edicao')[index];
    const inputParaRemover = document.querySelectorAll('.input-preco_total')[index];

    //recalcula o preço final pago
    const precoFinalPagoInput = document.querySelector('.input-preco-final-pago');
    precoFinalPagoInput.value = (parseFloat(precoFinalPagoInput.value) - parseFloat(inputParaRemover.value)).toFixed(2);

    cardParaRemover.remove();
}