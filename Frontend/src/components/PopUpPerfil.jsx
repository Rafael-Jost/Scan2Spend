import perfilIcon from '../assets/perfil.png'
import { useEffect, useRef, useState } from 'react'
import PopUpNotasFiscais from './PopUpNotasFiscais'
import PopUpConfigurações from './PopUpConfigurações'

function PopUpPerfil({ nomeUsuario, sobrenomeUsuario, emailUsuario, orcamentoMensal, fncLogout, fncFechar, setPopUpInformacoesAberto, setConteudo, notasFiscais, carregaUsuario, botaoRef }) {
    const popupRef = useRef(null)
    const notasRef = useRef(null)
    const configRef = useRef(null)
    const [exibirNotasFiscais, setExibirNotasFiscais] = useState(false)
    const [exibirConfig, setExibirConfig] = useState(false)

    useEffect(() => {
        const handleClickFora = (evento) => {
            const cliqueDentroPerfil = popupRef.current?.contains(evento.target)
            const cliqueDentroNotas = notasRef.current?.contains(evento.target)
            const cliqueDentroConfig = configRef.current?.contains(evento.target)
            const cliqueBotaoToggle = botaoRef?.current?.contains(evento.target)
            if (!cliqueDentroPerfil && !cliqueDentroNotas && !cliqueDentroConfig && !cliqueBotaoToggle) {
                fncFechar()
            }
        }

        document.addEventListener('mousedown', handleClickFora)
        document.addEventListener('touchstart', handleClickFora)

        return () => {
            document.removeEventListener('mousedown', handleClickFora)
            document.removeEventListener('touchstart', handleClickFora)
        }
    }, [fncFechar])
    
    return (
        <>
        <PopUpNotasFiscais notasFiscais={notasFiscais} ref={notasRef} fncFechar={() => {setExibirNotasFiscais(false); fncFechar(); }} display={exibirNotasFiscais ? 'block' : 'none'} setPopUpInformacoesAberto={setPopUpInformacoesAberto} setConteudo={setConteudo} />
        <PopUpConfigurações ref={configRef} display={exibirConfig ? 'block' : 'none'} fncFechar={() => {setExibirConfig(false); fncFechar(); }} nomeUsuario={nomeUsuario} sobrenomeUsuario={sobrenomeUsuario} orcamentoMensal={orcamentoMensal} emailUsuario={emailUsuario} carregaUsuario={carregaUsuario} />
        <div className="popup-perfil" ref={popupRef}>
            <div className="popup-perfil-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={perfilIcon} alt="Perfil" style={{"width": "40px", "height": "40px", "backgroundColor": "lightgray", borderRadius: "100%"}}/>
                    <span>{nomeUsuario} {sobrenomeUsuario}</span>
                </div>
                <button style={{width: '100%'}} onClick={() => { setExibirNotasFiscais(true);}}>
                    Minhas Notas Fiscais
                </button>
                <button style={{width: '100%'}} onClick={() => { setExibirConfig(true);}}>
                    Configurações
                </button>
                <button style={{width: '100%'}} onClick={fncLogout}>
                    Sair
                </button>
            </div>
        </div>
        </>)
}

export default PopUpPerfil;