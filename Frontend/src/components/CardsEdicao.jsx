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

    return(
        <>
        <h2>Dados da Nota Fiscal</h2>
        <p> Data da compra: {payload.data_compra}</p>
        <p>Preço Total: R$ {payload.preco_final_pago ? payload.preco_final_pago.toFixed(2) : 0}</p>
        <div id="cards-edicao-container">
            {items.map(({nome_produto, unidade_medida, quantidade, preco_unitario, preco_total, desconto}, index) => (
                <div className="card-edicao" key={nome_produto}>
                    <button className="botao-remover" onClick={() => removerItem(index)}>Remover Item</button>
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
}

function removerItem(index) {
    console.log("Remover item no índice: ", index);
    document.querySelectorAll('.card-edicao')[index].remove();
}