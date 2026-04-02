import perfilIcon from '../assets/perfil.png'
import { useEffect, useRef, useState } from 'react'
import PopUpNotasFiscais from './PopUpNotasFiscais'

function PopUpPerfil({ nomeUsuario, emailUsuario, fncLogout, fncFechar }) {
    const popupRef = useRef(null)
    const [exibirNotasFiscais, setExibirNotasFiscais] = useState(false)

    useEffect(() => {
        const handleClickFora = (evento) => {
            if (popupRef.current && !popupRef.current.contains(evento.target)) {
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
        <PopUpNotasFiscais fncFechar={() => {setExibirNotasFiscais(false)}} display={exibirNotasFiscais ? 'block' : 'none'} />
        <div className="popup-perfil" ref={popupRef}>
            <div className="popup-perfil-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={perfilIcon} alt="Perfil" style={{"width": "40px", "height": "40px", "backgroundColor": "lightgray", borderRadius: "100%"}}/>
                    <span>{nomeUsuario}</span>
                </div>
                <p style={{ margin: 0 }}><strong>Email:</strong> <span>{emailUsuario}</span></p>
                <button style={{width: '100%'}} onClick={() => setExibirNotasFiscais(true)}>
                    Minhas Notas Fiscais
                </button>
                <button style={{width: '100%'}} onClick={fncLogout}>
                    Sair
                </button>
            </div>
        </div>
        </>)
}

export default PopUpPerfil;