import { useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import Swal from 'sweetalert2'
import { authFetch } from '../utils/authFetch'

export function useAuth(estadoTela, setEstadoTela) {
  const [usuarioLogado, setUsuarioLogado] = useState(Cookies.get('usuarioLogado') === 'true' || false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [sobrenomeUsuario, setSobrenomeUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const [orcamentoMensal, setOrcamentoMensal] = useState(null)
  const [avisoFimSessaoExibido, setAvisoFimSessaoExibido] = useState(false)

  const carregaUsuario = useCallback((dadosUsuario) => {
    if (estadoTela === 'login') {
      setEstadoTela('inicial')
    }
    setNomeUsuario(dadosUsuario.nome)
    setSobrenomeUsuario(dadosUsuario.sobrenome)
    setEmailUsuario(dadosUsuario.email)
    setOrcamentoMensal(dadosUsuario.orcamento_mensal)
  }, [estadoTela])

  const logoutUsuario = useCallback(() => {
    localStorage.removeItem('jwt')
    Cookies.remove('usuarioLogado')
    setUsuarioLogado(false)
    Cookies.remove('estadoTela')
    setEstadoTela('login')
    setNomeUsuario('')
    setAvisoFimSessaoExibido(false)
  }, [])

  useEffect(() => {
    console.log('Verificando estado de login do usuário...')

    if (usuarioLogado == false) { Cookies.remove('estadoTela'); return }
    else {
      if (!Cookies.get('usuarioLogado')) {
        Cookies.set('usuarioLogado', 'true', { expires: 30 })
      }
    }

    ;(async () => {
      const dados_usuario_response = await authFetch(`/api/me`, {
        method: 'GET'
      })

      if (!dados_usuario_response.ok) {
        console.error('Erro ao buscar dados do usuário:', await dados_usuario_response.text())
        return
      }

      if (Cookies.get('usuarioLogado') !== 'true' && usuarioLogado === true) {
        Cookies.set('usuarioLogado', 'true', { expires: 30 })
      }
      carregaUsuario(await dados_usuario_response.json())
    })()
  }, [usuarioLogado])

  useEffect(() => {
    if (!usuarioLogado) { return }

    function parseData(dataString) {
      const [data, hora] = dataString.split(' ')
      const [dia, mes, ano] = data.split('/')
      const [horaStr, minuto] = hora.split(':')

      return new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia),
        Number(horaStr),
        Number(minuto)
      )
    }

    const verificarToken = async () => {
      try {
        const response = await authFetch('/api/validarToken', {
          method: 'GET'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.msg === "Token válido") {
            var data_atual = new Date()
            console.warn('Hora de expiração do token (string):', data.hora_expiracao)
            const horaExpiracao = parseData(data.hora_expiracao)
            console.warn('Token válido. Expira em:', horaExpiracao)

            if ((horaExpiracao - data_atual < 5 * 60 * 1000) && !avisoFimSessaoExibido) {
              Swal.fire({
                position: 'top',
                title: 'Atenção!',
                text: 'Sua sessão irá expirar em 5 minutos, por favor faça login novamente para continuar usando o Scan2Spend sem interrupções.',
                icon: 'info',
                timer: 15000,
                timerProgressBar: true
              })
              setAvisoFimSessaoExibido(true)
            }
          }
        } else if (response.status === 401) {
          console.warn('Token inválido ou expirado. Realizando logout.')
          logoutUsuario()
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error)
        Swal.fire({
          toast: true,
          position: 'top-start',
          title: 'Algo deu errado :(',
          text: 'Ocorreu um erro ao verificar o token. Tente novamente mais tarde.',
          icon: 'error',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        })
      }
    }

    verificarToken()
    const verificarTokenIntervalo = setInterval(verificarToken, 60000)

    return () => clearInterval(verificarTokenIntervalo)
  }, [usuarioLogado, logoutUsuario, avisoFimSessaoExibido])

  return {
    usuarioLogado,
    setUsuarioLogado,
    nomeUsuario,
    sobrenomeUsuario,
    emailUsuario,
    orcamentoMensal,
    carregaUsuario,
    logoutUsuario
  }
}