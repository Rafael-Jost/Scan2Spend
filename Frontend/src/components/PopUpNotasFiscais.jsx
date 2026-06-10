import React, { forwardRef } from 'react';

const formatarData = (data) => {
    if (!data) return '';
    const partes = String(data).split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const formatarValor = (valor) =>
    Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function PopUpNotasFiscais({ notasFiscais, fncFechar, display, setPopUpInformacoesAberto, setConteudo }, ref) {

    const abrirDetalhes = async (id) => {
        try {
            const response = await fetch(
                `/api/nota_fiscal/${id}`,
                { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
            );
            if (!response.ok) return;
            const data = await response.json();
            setPopUpInformacoesAberto(true);
            setConteudo(data);
        } catch (error) {
            console.error('Erro ao buscar detalhes da nota fiscal:', error);
        }
    };

    return (
        <div id="popup-notas-fiscais" style={{ display }} ref={ref}>
            <div className="popup-notas-header">
                <div className="popup-notas-titulo">
                    <h2>Notas Fiscais</h2>
                    {notasFiscais.length > 0 && (
                        <span className="popup-notas-count">{notasFiscais.length}</span>
                    )}
                </div>
                <button type="button" className="popup-fechar-btn" onClick={fncFechar} aria-label="Fechar">✕</button>
            </div>

            {notasFiscais.length === 0 ? (
                <div className="popup-notas-vazio">
                    <span className="popup-notas-vazio-icone">🧾</span>
                    <p>Nenhuma nota fiscal encontrada.</p>
                </div>
            ) : (
                <div className="popup-notas-lista">
                    {notasFiscais.map((notaFiscal, index) => (
                        <button
                            type="button"
                            className="popup-nota-fiscal-row"
                            key={`${notaFiscal.data}-${index}`}
                            onClick={() => abrirDetalhes(notaFiscal.nota_fiscal_id)}
                        >
                            <div className="nota-info">
                                <span className="nota-data">{formatarData(notaFiscal.data)}</span>
                                <span className="nota-n-itens">
                                    {notaFiscal.numeroItens} {notaFiscal.numeroItens === 1 ? 'item' : 'itens'}
                                </span>
                            </div>
                            <div className="nota-valores">
                                <span className="nota-total">{formatarValor(notaFiscal.valorPago)}</span>
                                {Number(notaFiscal.desconto) > 0 && (
                                    <span className="nota-desconto">- {formatarValor(notaFiscal.desconto)}</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default forwardRef(PopUpNotasFiscais);
