import React from 'react';

export default function PopUpNotasFiscais({ fncFechar, display }) {
    const buscarNotasFiscais = () => {

        const notaExemplo = {
        data: '25/05/2025',
        valorPago: 132.4,
        desconto: 12.0,
        numeroItens: 8
    }

        return [notaExemplo, notaExemplo, notaExemplo];
    }

    const notasFiscais = buscarNotasFiscais();

    return (
    <>
        <div id="popup-notas-fiscais" style={{ display }}>
            <div className="popup-notas-header">
                <h2>Minhas Notas Fiscais</h2>
                <button type="button" onClick={fncFechar}>Fechar</button>
            </div>

            {notasFiscais.map((notaFiscal, index) => (
            <div className="popup-nota-fiscal-row" key={`${notaFiscal.data}-${index}`}>
                <div className="nota-info">
                    <span className="nota-data">{notaFiscal.data}</span>
                    <span className="nota-itens">{notaFiscal.numeroItens} itens</span>
                </div>

                <div className="nota-valores">
                    <span className="nota-total">R$ {notaFiscal.valorPago.toFixed(2)}</span>
                    <span className="nota-desconto">Desconto: R$ {notaFiscal.desconto.toFixed(2)}</span>
                </div>
            </div>
            ))}
        </div>
    </>
    )
}


