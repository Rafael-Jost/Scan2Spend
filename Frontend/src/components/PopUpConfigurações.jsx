import React, { forwardRef, use, useEffect, useState } from 'react';
import Swal from 'sweetalert2'
import { authFetch } from '../utils/authFetch'

function PopUpConfigurações({notasFiscais, fncFechar, display, setConteudo, nomeUsuario, sobrenomeUsuario, orcamentoMensal, emailUsuario, carregaUsuario }, ref) {

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
        nome: nomeUsuario,
        sobrenome: sobrenomeUsuario,
        email: emailUsuario,
        orcamento_mensal: orcamentoMensal
    })
    const [orcamentoFormatado, setOrcamentoFormatado] = useState(formatarOrcamento(orcamentoMensal))
    const [erroSalvamento, setErroSalvamento] = useState(false)

    async function salvarConfigurações() {
        console.log(JSON.stringify(payload))
        const response = await authFetch('/api/usuario', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (response.status === 200) {
            Swal.fire({
                toast: true,
                position: 'top-start',
                title: 'Sucesso!',
                text: 'Configurações salvas com sucesso.',
                icon: 'success',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                zIndex: 9999
            })
            //busca os dados atualizados do usuário para atualizar o estado global
            const dados_usuario_response = await authFetch(`/api/me`, {
                method: 'GET'
            })

            if(dados_usuario_response.status === 200){
                const dados_usuario = await dados_usuario_response.json()
                carregaUsuario(dados_usuario)
            }else{
                console.error('Erro ao buscar dados atualizados do usuário')
            }

            fncFechar()
        } else{
            setErroSalvamento(true)
            Swal.fire({
                toast: true,
                position: 'top-start',
                title: 'Erro!',
                text: 'Não foi possível salvar as configurações.',
                icon: 'error',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                zIndex: 9999
            })
        }

    }


    useEffect(() => {
        setOrcamentoFormatado(formatarOrcamento(orcamentoMensal))
        setPayload(prev => ({ ...prev, orcamento_mensal: orcamentoMensal }))
    }, [orcamentoMensal])

    function atualizarPayload(campo, valor) {
        setPayload(prevPayload => ({
            ...prevPayload,
            [campo]: valor
        }))
    }

    useEffect(() => {
        if (erroSalvamento) {
            setTimeout(() => {
                setErroSalvamento(false)
            }, 2000)
        }
    }, [erroSalvamento])
    
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
                    atualizarPayload('orcamento_mensal', digitos ? Number(digitos) / 100 : null)
                }}></input>
            </div>

            <button style={{marginTop: '20px', width: '100%', display: erroSalvamento ? 'none' : 'block'}} onClick={salvarConfigurações}>Salvar Alterações</button>
            <button style={{marginTop: '20px', width: '100%', backgroundColor: 'red', display: erroSalvamento ? 'block' : 'none'}} onClick={() => Swal.fire({ toast: true, position: 'top-start', title: 'Erro!', text: 'Não foi possível salvar as configurações.', icon: 'info', showConfirmButton: false })}>Erro ao Salvar</button>

        </div>
    </>
    )
}

export default forwardRef(PopUpConfigurações)


