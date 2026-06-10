import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import { useAuth } from './hooks/useAuth'
import { useDespesas } from './hooks/useDespesas'
import PaginaLogin from './pages/PaginaLogin'
import PaginaInicial from './pages/PaginaInicial'
import PaginaDespesas from './pages/PaginaDespesas'
import './App.css'

function App() {
  const [cadastrandoUsuario, setCadastrandoUsuario] = useState(false)
  const [estadoTela, setEstadoTela] = useState(Cookies.get('estadoTela') || 'login')
  const [textoRecibo, setTextoRecibo] = useState(null)
  const [popupAberto, setPopupAberto] = useState(false)

  const {
    usuarioLogado,
    setUsuarioLogado,
    nomeUsuario,
    sobrenomeUsuario,
    emailUsuario,
    orcamentoMensal,
    carregaUsuario,
    logoutUsuario
  } = useAuth(estadoTela, setEstadoTela)

  const {
    despesasTotais,
    despesasCategorias,
    despesasCategoriasPeriodo,
    descontos,
    insights,
    dadosPerfilDespesas,
    topProdutos,
    notasFiscais,
    buscarDespesasTotais,
    buscarDespesasCategorias,
    buscarDespesasCategoriasPeriodo,
    atualizarGraficos
  } = useDespesas(usuarioLogado, nomeUsuario, estadoTela)

  useEffect(() => {
    if (estadoTela === 'login') {
      Cookies.remove('estadoTela')
    } else {
      Cookies.set('estadoTela', estadoTela, { expires: 1 })
    }
    const root = document.getElementById('root')
    if (!root) return

    if (estadoTela === 'despesas') {
      root.classList.add('modo-despesas')
    } else {
      root.classList.remove('modo-despesas')
    }

    return () => {
      root.classList.remove('modo-despesas')
    }
  }, [estadoTela])

  if (estadoTela === 'login') {
    return (
      <PaginaLogin
        cadastrandoUsuario={cadastrandoUsuario}
        setCadastrandoUsuario={setCadastrandoUsuario}
        setUsuarioLogado={setUsuarioLogado}
      />
    )
  }

  const perfilProps = {
    notasFiscais,
    nomeUsuario,
    sobrenomeUsuario,
    emailUsuario,
    orcamentoMensal,
    logoutUsuario,
    setPopupAberto,
    setTextoRecibo,
    carregaUsuario
  }

  if (estadoTela === 'inicial') {
    return (
      <PaginaInicial
        {...perfilProps}
        textoRecibo={textoRecibo}
        popupAberto={popupAberto}
        setPopupAberto={setPopupAberto}
        setEstadoTela={setEstadoTela}
        atualizarGraficos={atualizarGraficos}
      />
    )
  }

  if (estadoTela === 'despesas') {
    return (
      <PaginaDespesas
        {...perfilProps}
        textoRecibo={textoRecibo}
        popupAberto={popupAberto}
        setPopupAberto={setPopupAberto}
        setEstadoTela={setEstadoTela}
        atualizarGraficos={atualizarGraficos}
        insights={insights}
        topProdutos={topProdutos}
        dadosPerfilDespesas={dadosPerfilDespesas}
        despesasTotais={despesasTotais}
        despesasCategorias={despesasCategorias}
        despesasCategoriasPeriodo={despesasCategoriasPeriodo}
        descontos={descontos}
        buscarDespesasTotais={buscarDespesasTotais}
        buscarDespesasCategorias={buscarDespesasCategorias}
        buscarDespesasCategoriasPeriodo={buscarDespesasCategoriasPeriodo}
      />
    )
  }

  return null
}

export default App
