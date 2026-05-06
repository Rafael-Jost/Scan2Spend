import React, { forwardRef, useEffect, useState } from 'react';

function PopUpConfigurações({notasFiscais, fncFechar, display, usuarioId, setPopUpInformacoesAberto, setConteudo, nomeUsuario, orcamentoMensal, emailUsuario }, ref) {

    return (
    <>
        <div id="popup-configuracoes" style={{ display }} ref={ref}>
            <div className="popup-config-header">
                <h2>Configurações</h2>
                <button type="button" onClick={fncFechar}>Fechar</button>
            </div>


            <div className='row--horizontal' style={{justifyContent: 'left', gap: '41%',marginTop: '15px'}}>
                <label style={{ float: 'left', marginLeft: '1%', opacity: 0.6 }}>Nome</label>
                <label style={{ float: 'left', marginLeft: '1%', opacity: 0.6 }}>Sobrenome</label>
            </div>
            <div className='row--horizontal'>
                <input className="login-input" type="text" placeholder='Nome' value={nomeUsuario} readOnly></input>
                <input className="login-input" type="text" placeholder='Sobrenome'></input>
            </div>


            <div className='row--horizontal' style={{marginTop: '15px'}}>
                <label style={{ float: 'left', marginLeft: '1%', opacity: 0.6 }}>Email</label>
            </div>
            <div className='row--horizontal'>
                <input className="login-input" type="email" placeholder='Email' value={emailUsuario}></input>
            </div>


            <div className='row--horizontal' style={{marginTop: '15px'}}>
                <label style={{ float: 'left', marginLeft: '1%', opacity: 0.6 }}>Orçamento Mensal</label>
            </div>
            <div className='row--horizontal'>
                <input className="login-input" type="float" placeholder='Orçamento' value={orcamentoMensal}></input>
            </div>

            <button style={{position: 'absolute', bottom: '20px', left: '5%', width: '90%'}} onClick={() => alert('Funcionalidade de edição de perfil ainda não implementada.')}>Salvar Alterações</button>
        </div>
    </>
    )
}

export default forwardRef(PopUpConfigurações)


