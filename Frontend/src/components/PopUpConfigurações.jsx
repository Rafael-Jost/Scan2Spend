import React, { forwardRef, useEffect, useState } from 'react';

function PopUpConfigurações({notasFiscais, fncFechar, display, usuarioId, setPopUpInformacoesAberto, setConteudo, nomeUsuario, sobrenomeUsuario, orcamentoMensal, emailUsuario }, ref) {

    const formatarOrcamento = (valor) => {
        if (valor == null || valor === '') return ''
        if (typeof valor === 'number') {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
        }
        const digitos = String(valor).replace(/\D/g, '')
        if (!digitos) return ''
        const numero = Number(digitos) / 100
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero)
    }

    const [payload, setPayload] = useState({
        usuarioId: usuarioId,
        nome: nomeUsuario,
        sobrenome: sobrenomeUsuario,
        email: emailUsuario,
        orcamentoMensal: orcamentoMensal
    })
    const [orcamentoFormatado, setOrcamentoFormatado] = useState(formatarOrcamento(orcamentoMensal))

    useEffect(() => {
        setOrcamentoFormatado(formatarOrcamento(orcamentoMensal))
        setPayload(prev => ({ ...prev, orcamentoMensal }))
    }, [orcamentoMensal])

    function atualizarPayload(campo, valor) {
        setPayload(prevPayload => ({
            ...prevPayload,
            [campo]: valor
        }))
    }
    
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
                <input className="login-input" type="text" placeholder='Nome' defaultValue={nomeUsuario} onChange={(e) => atualizarPayload('nome', e.target.value)}></input>
                <input className="login-input" type="text" placeholder='Sobrenome' defaultValue={sobrenomeUsuario} onChange={(e) => atualizarPayload('sobrenome', e.target.value)}></input>
            </div>


            <div className='row--horizontal' style={{marginTop: '15px'}}>
                <label style={{ float: 'left', marginLeft: '1%', opacity: 0.6 }}>Email</label>
            </div>
            <div className='row--horizontal'>
                <input className="login-input" type="email" placeholder='Email' defaultValue={emailUsuario} onChange={(e) => atualizarPayload('email', e.target.value)}></input>
            </div>


            <div className='row--horizontal' style={{marginTop: '15px'}}>
                <label style={{ float: 'left', marginLeft: '1%', opacity: 0.6 }}>Orçamento Mensal</label>
            </div>
            <div className='row--horizontal'>
                <input className="login-input" type="text" placeholder='Orçamento' value={orcamentoFormatado} onChange={(e) => {
                    const formatado = formatarOrcamento(e.target.value)
                    setOrcamentoFormatado(formatado)
                    const digitos = e.target.value.replace(/\D/g, '')
                    atualizarPayload('orcamentoMensal', digitos ? Number(digitos) / 100 : null)
                }}></input>
            </div>

            <button style={{position: 'absolute', bottom: '20px', left: '5%', width: '90%'}} onClick={() => alert(payload.nome + ' ' + payload.sobrenome)}>Salvar Alterações</button>
        </div>
    </>
    )
}

export default forwardRef(PopUpConfigurações)


