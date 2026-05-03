import { FaArrowLeft } from 'react-icons/fa'
import { useState } from 'react'

function CadastroUsuario({setCadastrandoUsuario}) {
    const [nome, setNome] = useState('')
    const [sobrenome, setSobrenome] = useState('')
    const [email, setEmail] = useState('')
    const [orcamentoMensal, setOrcamentoMensal] = useState('')
    const [senha, setSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')
    const [erroCadastro, setErroCadastro] = useState('')
    const [sucessoCadastro, setSucessoCadastro] = useState('')

    const formatarOrcamento = (valor) => {
        const digitos = valor.replace(/\D/g, '')

        if (!digitos) {
            return ''
        }

        const numero = Number(digitos) / 100

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(numero)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (senha && confirmarSenha && senha !== confirmarSenha) {
            setErroCadastro('As senhas digitadas não coincidem!')
        }else{
            setErroCadastro('')

            const response = await fetch('https://scan2spend-fastapi-dockerbased.onrender.com/cadastrarUsuario/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    nome,
                    sobrenome,
                    email,
                    senha,
                    orcamento_mensal: parseFloat(orcamentoMensal.replace(/[^0-9,]+/g, '').replace(',', '.'))
                })
            })

            if (response.ok) {
                // Cadastro realizado com sucesso
                setSucessoCadastro('Usuário cadastrado com sucesso!')
                setInterval(() => {
                    setCadastrandoUsuario(false)
                }, 2000)
            } else {
                // Tratar erro de cadastro
                setErroCadastro('Erro ao cadastrar usuário.')
            }
        }
    }


    return <>
        <div className="pagina-login cadastro-usuario">
            <a className="btn-voltar" onClick={() => setCadastrandoUsuario(false)}><FaArrowLeft/></a>
            <form onSubmit={handleSubmit}>
                <h1>Cadastro</h1>
                <div className='input-container' style={{gap: "10px"}}>
                    <input className='cadastro-input' type='text' placeholder='Nome' onChange={(e) => {setNome(e.target.value)}}/>
                    <input className='cadastro-input' type='text' placeholder='Sobrenome' onChange={(e) => {setSobrenome(e.target.value)}}/>
                </div>
                <div className='input-container'>
                    <input className='cadastro-input' type='email' placeholder='Email' onChange={(e) => {setEmail(e.target.value)}}/>
                </div>
                <div className='input-container'>
                    <input
                        className='cadastro-input'
                        type='text'
                        placeholder='Orçamento Mensal (R$)'
                        value={orcamentoMensal}
                        onChange={(e) => {
                            setOrcamentoMensal(formatarOrcamento(e.target.value))
                        }}
                    />
                </div>
                <div className='input-container'>
                    <input className='cadastro-input' type='password' placeholder='Senha' onChange={(e) => {setSenha(e.target.value)}}/>
                </div>
                <div className='input-container'>
                    <input className='cadastro-input' type='password' placeholder='Confirmar Senha' onChange={(e) => {setConfirmarSenha(e.target.value)}}/>
                </div>
                <span className={erroCadastro ? 'span-msg-erro' : 'span-msg-erro oculto'}>{erroCadastro}</span>
                <span className={sucessoCadastro ? 'span-msg-sucesso' : 'span-msg-sucesso oculto'}>{sucessoCadastro}</span>
                <button id="btn-cadastro" type="submit">Cadastrar</button>
            </form>
        </div>
    </>
}

export default CadastroUsuario;