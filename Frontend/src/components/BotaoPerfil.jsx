import { useState } from 'react'
import BotaoSimples from './BotaoSimples.jsx'
import PopUpPerfil from './PopUpPerfil.jsx'
import perfilIcon from '../assets/perfil.png'

export default function BotaoPerfil({
  notasFiscais,
  nomeUsuario,
  sobrenomeUsuario,
  emailUsuario,
  orcamentoMensal,
  logoutUsuario,
  setPopupAberto,
  setTextoRecibo,
  carregaUsuario
}) {
  const [exibirPopUpPerfil, setExibirPopUpPerfil] = useState(false)

  return (
    <>
      <BotaoSimples className="botao-menu perfil" icone={perfilIcon} onClick={() => {
        setExibirPopUpPerfil((valorAtual) => !valorAtual)
      }}></BotaoSimples>
      {exibirPopUpPerfil ? (
        <PopUpPerfil
          notasFiscais={notasFiscais}
          nomeUsuario={nomeUsuario}
          sobrenomeUsuario={sobrenomeUsuario}
          emailUsuario={emailUsuario}
          orcamentoMensal={orcamentoMensal}
          fncLogout={logoutUsuario}
          fncFechar={() => setExibirPopUpPerfil(false)}
          setPopUpInformacoesAberto={setPopupAberto}
          setConteudo={setTextoRecibo}
          carregaUsuario={carregaUsuario}
        />
      ) : null}
    </>
  )
}
