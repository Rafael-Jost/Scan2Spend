import React, { forwardRef, useEffect, useState } from 'react';

function PopUpNotasFiscais({notasFiscais, fncFechar, display, usuarioId, setPopUpInformacoesAberto, setConteudo }, ref) {

    return (
    <>
        <div id="popup-notas-fiscais" style={{ display }} ref={ref}>
            <div className="popup-notas-header">
                <h2>Minhas Notas Fiscais</h2>
                <button type="button" onClick={fncFechar}>Fechar</button>
            </div>

            {notasFiscais.length === 0 ? (
                <p className="popup-notas-vazio">Nenhuma nota fiscal encontrada.</p>
            ) : (
                notasFiscais.map((notaFiscal, index) => (
                    <div className="popup-nota-fiscal-row" key={`${notaFiscal.data}-${index}`}>
                        <div className="nota-info">
                            <span className="nota-data">{notaFiscal.data}</span>
                            <span className="nota-itens" onClick={async () => {
                                try {
                                    const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/nota_fiscal/${notaFiscal.nota_fiscal_id}`, {
                                        method: 'GET',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        credentials: 'include'
                                    });
                                    
                                    if (!response.ok) {
                                        console.error('Erro ao buscar detalhes da nota fiscal:', response.statusText);
                                        return;
                                    } else{
                                        const data = await response.json();
                                        setPopUpInformacoesAberto(true)
                                        setConteudo(data)
                                        console.log('nota clicada:', notaFiscal.nota_fiscal_id)
                                        console.log('nota clicada (string):', JSON.stringify(data, null, 2))
                                    }
                                } catch (error) {
                                    console.error('Erro ao buscar detalhes da nota fiscal:', error);
                                    return;
                                } 
                            }}>
                                {notaFiscal.numeroItens} itens
                            </span>
                        </div>

                        <div className="nota-valores">
                            <span className="nota-total">R$ {Number(notaFiscal.valorPago).toFixed(2)}</span>
                            <span className="nota-desconto">Desconto: R$ {Number(notaFiscal.desconto).toFixed(2)}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    </>
    )
}

export default forwardRef(PopUpNotasFiscais)


