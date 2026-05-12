import perfilIcon from '../assets/perfil.png'

function PerfilDespesas({nomeUsuario, usuarioID, insights, topProdutos}) {

    function ListaInsights(insights) {
        const dicionarioCores = {"info": "#52a6ff61", "warning": "#ffe79661", "success": "#adffc061", "danger": "#ff899361"}
        var lista = []
        for (const i in insights) {

            lista.push(
                <div key={i} style={{background: dicionarioCores[insights[i].tipo] || "#fff3cd61", borderRadius: "8px", padding: "10px 12px", fontSize: "0.85rem"}}>
                    {insights[i].icone} {insights[i].mensagem}
                </div>
            )
        }
        return lista;
    }
    const mesAtual = (new Date().getMonth() + 1) + '/' + new Date().getFullYear()
    return (
        <div className="perfil-despesas">
            <div className="perfil-despesas-col">
                <img src={perfilIcon} alt="Perfil" style={{"width": "80px", "height": "80px", "backgroundColor": "lightgray", borderRadius: "100%", border: "2px solid #ccc"}}/>
                <p style={{fontWeight: "bold", margin: "4px 0 12px"}}>{nomeUsuario ?? "Usuário"}</p>
                <p style={{fontSize: "0.85rem", color: "#888", margin: "0 0 16px"}}>{mesAtual}</p>
                <div style={{width: "100%", textAlign: "left"}}>
                    <p><span style={{color: "#888"}}>Gastos totais:</span> <strong>R$ 1.243,50</strong></p>
                    <p><span style={{color: "#888"}}>% do orçamento consumida:</span> <strong>62%</strong></p>
                    <div style={{background: "#eee", borderRadius: "6px", height: "8px", margin: "4px 0 12px"}}>
                        <div style={{background: "#f06060", borderRadius: "6px", height: "8px", width: "62%"}}></div>
                    </div>
                    <p><span style={{color: "#888"}}>Vs. mês passado:</span> <strong style={{color: "#e05050"}}>▲ 14,3%</strong></p>
                    <p><span style={{color: "#888"}}>Maior Compra:</span> <strong>R$ 320,00</strong></p>
                    <p><span style={{color: "#888"}}>Nº de compras:</span> <strong>37</strong></p>
                    <p><span style={{color: "#888"}}>Compra média:</span> <strong>R$ 33,61</strong></p>
                </div>
            </div>

            <div className="perfil-despesas-col">
                <h3 style={{marginBottom: "12px"}}>Top produtos comprados</h3>
                <ol style={{paddingLeft: "18px", width: "100%"}}>
                    {topProdutos && topProdutos.length > 0 ? (
                        topProdutos.map((item, i) => (
                            <li key={i} style={{display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0"}}>
                                <span>{item.nome}</span>
                                <span style={{color: "#888", fontSize: "0.85rem"}}>{item.quantidade}{item.unidade_medida}</span>
                            </li>
                        ))
                    ) : (
                        <p style={{color: "#888", fontStyle: "italic"}}>Nenhum produto disponível no momento.</p>
                    )}
                </ol>
            </div>

            <div className="perfil-despesas-col">
                <h3 style={{marginBottom: "12px"}}>Alertas e dicas</h3>
                <div style={{display: "flex", flexDirection: "column", gap: "10px", width: "100%"}}>
                    {insights && insights.length > 0 ? (
                        ListaInsights(insights)
                    ) : (
                        <p style={{color: "#888", fontStyle: "italic"}}>Nenhum alerta disponível no momento.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PerfilDespesas