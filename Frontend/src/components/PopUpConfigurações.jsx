import React, { forwardRef, useEffect, useState } from 'react';

function PopUpConfigurações({notasFiscais, fncFechar, display, usuarioId, setPopUpInformacoesAberto, setConteudo }, ref) {

    return (
    <>
        <div id="popup-configuracoes" style={{ display }} ref={ref}>
            <div className="popup-config-header">
                <h2>Configurações</h2>
                <button type="button" onClick={fncFechar}>Fechar</button>
            </div>
            <div className='row--horizontal'>
                <input className="login-input" type="text" placeholder='Nome'></input>
                <input className="login-input" type="text" placeholder='Sobrenome'></input>
            </div>
            <div className='row--horizontal'>
                <input className="login-input" type="email" placeholder='Email'></input>
            </div>
            <div className='row--horizontal' style={{ width: '50%' }}>
                <input className="login-input" type="float" placeholder='Orçamento'></input>
                
            </div>
        </div>
    </>
    )
}

export default forwardRef(PopUpConfigurações)


