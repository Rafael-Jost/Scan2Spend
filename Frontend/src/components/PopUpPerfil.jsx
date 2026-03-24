import perfilIcon from '../assets/perfil.png'
import { useEffect, useRef } from 'react'

function PopUpPerfil({ nomeUsuario, emailUsuario, fncLogout, fncFechar }) {
    const popupRef = useRef(null)

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
        <div className="popup-perfil" ref={popupRef}>
            <div className="popup-perfil-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={perfilIcon} alt="Perfil" style={{"width": "40px", "height": "40px", "backgroundColor": "lightgray", borderRadius: "100%"}}/>
                    <span>{nomeUsuario}</span>
                </div>
                <p style={{ margin: 0 }}><strong>Email:</strong> <span>{emailUsuario}</span></p>
                <button style={{width: '100%'}} onClick={fncLogout}>
                    Sair
                </button>
            </div>
        </div>
    )
}

export default PopUpPerfil;