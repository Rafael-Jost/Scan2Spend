export default function PopUpNotasFiscais({ notasFiscais, fncFechar, display }) {
    const notaExemplo = {
        data: '25/05/2025',
        valorPago: 132.4,
        desconto: 12.0,
        numeroItens: 8
    }

    return (
    <div id="popup-notas-fiscais" style={{ display }}>
        <div className="popup-notas-header">
            <h2>Minhas Notas Fiscais</h2>
            <button type="button" onClick={fncFechar}>Fechar</button>
        </div>

        <div className="popup-nota-fiscal-row">
            <div className="nota-info">
                <span className="nota-data">{notaExemplo.data}</span>
                <span className="nota-itens">{notaExemplo.numeroItens} itens</span>
            </div>

            <div className="nota-valores">
                <span className="nota-total">R$ {notaExemplo.valorPago.toFixed(2)}</span>
                <span className="nota-desconto">Desconto: R$ {notaExemplo.desconto.toFixed(2)}</span>
            </div>
        </div>
    </div>
    )
}


