import trashIcon from "../assets/trash.png";

export default function CardEdicao(json) {
    
    if (json === null) {
        return (
            <div className="cards-edicao-container">
                <h2>Dados da Nota Fiscal</h2>
                <p>Nenhum dado disponível.</p>
            </div>
        )
    }
    console.log("Dados recebidos para edição: ", json);
    const payload = json.json; 
    const items = payload.itens ?? [];
    console.log("Itens extraídos: ", items);

    const data_sem_horario = payload.data_compra ? payload.data_compra.split(' ')[0] : '';
    const data_formatada = data_sem_horario ? data_sem_horario.split('/').reverse().join('-') : '';

    return(
        <>
        <h2>Dados da Nota Fiscal</h2>
        <p> Data da compra: <input className="input-data-compra" type="date" defaultValue={data_formatada}></input></p>
        <p>Preço Total: R$ <input className="input-preco-final-pago" type="number" defaultValue={payload.preco_final_pago ? payload.preco_final_pago.toFixed(2) : 0}></input></p>
        <div id="cards-edicao-container">
            {items.map(({nome_produto, unidade_medida, quantidade, preco_unitario, preco_total, desconto}, index) => (
                <div className="card-edicao" key={nome_produto}>
                    <button className="botao-remover" onClick={() => removerItem(index)}><img style={{width: 15, height: 15}} src={trashIcon}></img></button>
                    <p><input className="nome-produto-input" type="text" defaultValue={nome_produto}></input></p>
                    <p>Quantidade: <input className="quantidade-input" type="number" defaultValue={quantidade}></input> ({unidade_medida})</p>
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

    const produtos = [];
    
    for (let i = 0; i < nomeProdutoInputs.length; i++) {
        produtos.push({
            nome_produto: nomeProdutoInputs[i].value,
            quantidade: parseFloat(quantidadeInputs[i].value),
            preco_unitario: parseFloat(precoUnitarioInputs[i].value),
            desconto: parseFloat(descontoInputs[i].value),
            preco_total: parseFloat(precoTotalInputs[i].value)
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
    console.log("Remover item no índice: ", index);
    document.querySelectorAll('.card-edicao')[index].remove();
}