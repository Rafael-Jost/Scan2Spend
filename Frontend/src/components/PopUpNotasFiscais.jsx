import React, { useEffect, useState } from 'react';

export default function PopUpNotasFiscais({ fncFechar, display, usuarioId }) {
    const [notasFiscais, setNotasFiscais] = useState([]);

    const buscarNotasFiscais = async () => {
        if (!usuarioId) {
            setNotasFiscais([]);
            return;
        }

        try {
            const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/nota_fiscal/?usuario_id=${usuarioId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Erro ao buscar notas fiscais do usuário:', response.statusText);
                setNotasFiscais([]);
                return;
            }

            const data = await response.json();
            const listaNotas = Array.isArray(data) ? data : [];

            setNotasFiscais(listaNotas.map((notaFiscal) => ({
                data: notaFiscal.data_compra ?? notaFiscal.data ?? '',
                numeroItens: Number(notaFiscal.quantidade_itens ?? notaFiscal.numeroItens ?? 0),
                valorPago: Number(notaFiscal.preco_final_pago ?? notaFiscal.valorPago ?? 0),
                desconto: Number(notaFiscal.desconto_total ?? notaFiscal.desconto ?? 0)
            })));
        } catch (error) {
            console.error('Erro ao buscar notas fiscais do usuário:', error);
            setNotasFiscais([]);
        }
    };

    useEffect(() => {
        if (display === 'none') {
            return;
        }

        buscarNotasFiscais();
    }, [display, usuarioId]);

    return (
    <>
        <div id="popup-notas-fiscais" style={{ display }}>
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
                            <span className="nota-itens">{notaFiscal.numeroItens} itens</span>
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


