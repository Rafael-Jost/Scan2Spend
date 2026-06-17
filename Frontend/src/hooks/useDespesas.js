import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import { authFetch } from '../utils/authFetch'

export function useDespesas(usuarioLogado, nomeUsuario, estadoTela) {
  const [despesasTotais, setDespesasTotais] = useState([])
  const [despesasCategorias, setDespesasCategorias] = useState([])
  const [despesasCategoriasPeriodo, setDespesasCategoriasPeriodo] = useState([])
  const [descontos, setDescontos] = useState([])
  const [insights, setInsights] = useState([])
  const [dadosPerfilDespesas, setDadosPerfilDespesas] = useState({})
  const [topProdutos, setTopProdutos] = useState([])
  const [notasFiscais, setNotasFiscais] = useState([])

  const buscarDespesasTotais = useCallback(async (dt_inicio, dt_fim, tipo_agrupamento) => {
    if (!dt_inicio || !dt_fim || !tipo_agrupamento) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
      tipo_agrupamento = 'MES'
    }
    const params = new URLSearchParams({
      dt_inicio: dt_inicio,
      dt_fim: dt_fim,
      tipo_agrupamento: tipo_agrupamento
    }).toString()

    try {
      const response = await authFetch(`/despesas/?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        setDespesasTotais(data)
      } else {
        console.error('Erro ao buscar dados.')
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar despesas totais. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
    }
  }, [])

  const buscarDespesasCategorias = useCallback(async (dt_inicio, dt_fim) => {
    if (!dt_inicio || !dt_fim) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
    }
    const params = new URLSearchParams({
      dt_inicio: dt_inicio,
      dt_fim: dt_fim
    }).toString()

    try {
      const response = await authFetch(`/despesas/categorias?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        setDespesasCategorias(data)
      } else {
        console.error('Erro ao buscar dados.')
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar despesas por categoria. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
    }
  }, [])

  const buscarDespesasCategoriasPeriodo = useCallback(async (dt_inicio, dt_fim, tipo_agrupamento) => {
    if (!dt_inicio || !dt_fim || !tipo_agrupamento) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
      tipo_agrupamento = 'MES'
    }

    const params = new URLSearchParams({ dt_inicio, dt_fim, tipo_agrupamento }).toString()

    try {
      const response = await authFetch(`/despesas/categorias/periodo?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Dados de despesas por categoria e período recebidos:', data)
        setDespesasCategoriasPeriodo(data)
      } else {
        console.error('Erro ao buscar dados.')
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar despesas por categoria e período. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
    }
  }, [])

  const buscarDescontos = useCallback(async (dt_inicio, dt_fim, tipo_agrupamento) => {
    if (!dt_inicio || !dt_fim || !tipo_agrupamento) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
      tipo_agrupamento = 'MES'
    }

    const params = new URLSearchParams({ dt_inicio, dt_fim, tipo_agrupamento }).toString()

    try {
      const response = await authFetch(`/descontos/?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Descontos recebidos:', data)
        setDescontos(data)
      } else {
        console.error('Erro ao buscar descontos.')
      }
    } catch (error) {
      console.error('Erro ao buscar descontos:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar descontos. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
    }
  }, [])

  const buscarInsights = useCallback(async () => {
    try {
      const response = await authFetch('/despesas/insights', {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Insights recebidos:', data)
        setInsights(data)
      } else {
        console.error('Erro ao buscar insights.')
      }
    } catch (error) {
      console.error('Erro ao buscar insights:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar insights. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
    }
  }, [])

  const buscarTopProdutos = useCallback(async (dt_inicio, dt_fim) => {
    if (!dt_inicio || !dt_fim) {
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const mes = String(hoje.getMonth() + 1).padStart(2, '0')
      const ultimoDiaMes = new Date(ano, hoje.getMonth() + 1, 0).getDate()

      dt_inicio = `01/${mes}/${ano}`
      dt_fim = `${String(ultimoDiaMes).padStart(2, '0')}/${mes}/${ano}`
    }
    const params = new URLSearchParams({ dt_inicio, dt_fim }).toString()

    try {
      const response = await authFetch(`/despesas/topProdutos?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Top produtos recebidos:', data)
        setTopProdutos(data)
      } else {
        console.error('Erro ao buscar top produtos.')
      }
    } catch (error) {
      console.error('Erro ao buscar top produtos:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar os top produtos. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
    }
  }, [])

  const buscarDadosPerfilDespesas = useCallback(async () => {
    try {
      const response = await authFetch('/despesas/perfil', {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Dados de perfil de despesas recebidos:', data)
        setDadosPerfilDespesas(data)
      } else {
        console.error('Erro ao buscar Dados de perfil de despesas.')
      }
    } catch (error) {
      console.error('Erro ao buscar Dados de perfil de despesas:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar Dados de perfil de despesas. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
    }
  }, [])

  const buscarNotasFiscais = useCallback(async () => {
    if (!nomeUsuario) {
      setNotasFiscais([])
      return
    }
    try {
      const response = await authFetch(`/nota_fiscal`, {
        method: 'GET'
      })

      if (!response.ok) {
        console.error('Erro ao buscar notas fiscais do usuário:', response.statusText)
        setNotasFiscais([])
        return
      }

      const data = await response.json()
      const listaNotas = Array.isArray(data) ? data : []

      setNotasFiscais(listaNotas.map((notaFiscal) => ({
        nota_fiscal_id: notaFiscal.nota_fiscal_id ?? notaFiscal.id ?? '',
        data: notaFiscal.data_compra ?? notaFiscal.data ?? '',
        numeroItens: Number(notaFiscal.quantidade_itens ?? notaFiscal.numeroItens ?? 0),
        valorPago: Number(notaFiscal.preco_final_pago ?? notaFiscal.valorPago ?? 0),
        desconto: Number(notaFiscal.desconto_total ?? notaFiscal.desconto ?? 0)
      })))
    } catch (error) {
      console.error('Erro ao buscar notas fiscais do usuário:', error)
      Swal.fire({
        toast: true,
        position: 'top-start',
        title: 'Algo deu errado :(',
        text: 'Ocorreu um erro ao buscar as notas fiscais. Tente novamente mais tarde.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
      setNotasFiscais([])
    }
  }, [nomeUsuario])

  const atualizarGraficos = useCallback(() => {
    if (!nomeUsuario) { return }

    buscarDespesasTotais()
    buscarDespesasCategorias()
    buscarDespesasCategoriasPeriodo()
    buscarInsights()
    buscarTopProdutos()
    buscarDadosPerfilDespesas()
    buscarDescontos()
  }, [buscarDespesasTotais, buscarDespesasCategorias, buscarDespesasCategoriasPeriodo, buscarInsights, buscarTopProdutos, buscarDadosPerfilDespesas, buscarDescontos, nomeUsuario])

  useEffect(() => {
    if (!usuarioLogado) { return }
    atualizarGraficos()
  }, [atualizarGraficos, usuarioLogado])

  useEffect(() => {
    if (estadoTela === 'login') { return }
    buscarNotasFiscais()
  }, [estadoTela, buscarNotasFiscais])

  return {
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
    buscarDescontos,
    atualizarGraficos
  }
}