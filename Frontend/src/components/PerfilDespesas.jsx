import perfilIcon from '../assets/perfil.png'

function PerfilDespesas({nomeUsuario, insights, topProdutos, dadosPerfilDespesas}) {

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

                    <p><span style={{color: "#888"}}>Gastos totais:</span> <strong>R$ {dadosPerfilDespesas.gastos_totais}</strong></p>

                    <p><span style={{color: "#888"}}>Orçamento consumido:</span> <strong>{dadosPerfilDespesas.perc_orcamento_consumido}%</strong></p>
                    <div style={{background: "#eee", borderRadius: "6px", height: "8px", margin: "4px 0 12px"}}>
                        <div style={{background: dadosPerfilDespesas.perc_orcamento_consumido >= 80 ? "#e05050" : "#4caf50", borderRadius: "6px", height: "8px", width: `${dadosPerfilDespesas.perc_orcamento_consumido}%`}}></div>
                    </div>

                    {dadosPerfilDespesas.perc_relativo_mes_anterior != 0 ? 
                    (<p>
                        <span style={{color: "#888"}}>Vs. mês passado:</span> 
                        {dadosPerfilDespesas.perc_relativo_mes_anterior > 0 ? 
                        (<strong style={{color: "#e05050"}}>▲ {dadosPerfilDespesas.perc_relativo_mes_anterior}%</strong>) :
                        (<strong style={{color: "#4caf50"}}>▼ {dadosPerfilDespesas.perc_relativo_mes_anterior}%</strong>)
                        }
                    </p>) : 
                    ('')
                    }
                    <p><span style={{color: "#888"}}>Maior Compra:</span> <strong>R$ {dadosPerfilDespesas.maior_compra}</strong></p>
                    <p><span style={{color: "#888"}}>Nº de compras:</span> <strong>{dadosPerfilDespesas.qtd_compras}</strong></p>
                    <p><span style={{color: "#888"}}>Compra média:</span> <strong>R$ {parseFloat(dadosPerfilDespesas.compra_media).toFixed(2)}</strong></p>
                </div>
            </div>

            <div className="perfil-despesas-col">
                <h3 style={{marginBottom: "12px"}}>Top produtos comprados</h3>
                <div className="top-produtos-lista">
                    {topProdutos && topProdutos.length > 0 ? (
                        topProdutos.map((item, i) => {
                            const variante = i === 0 ? "ouro" : i === 1 ? "prata" : i === 2 ? "bronze" : null;
                            const icone = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                            return (
                                <div key={i} className={`top-produto-item${variante ? ` top-produto-item--${variante}` : ""}`}>
                                    <span className={`top-produto-badge${icone ? " top-produto-badge--medalha" : ""}`}>
                                        {icone ?? i + 1}
                                    </span>
                                    <span className="top-produto-nome">{item.nome_produto}</span>
                                    <span className="top-produto-qtd">{item.quantidade} {item.unidade_medida}</span>
                                </div>
                            )
                        })
                    ) : (
                        <p style={{color: "#888", fontStyle: "italic"}}>Nenhum produto disponível no momento.</p>
                    )}
                </div>
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