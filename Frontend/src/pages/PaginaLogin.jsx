import Login from '../components/Login.jsx'
import CadastroUsuario from '../components/CadastroUsuario.jsx'

export default function PaginaLogin({ cadastrandoUsuario, setCadastrandoUsuario, setUsuarioLogado }) {
  if (cadastrandoUsuario) {
    return <CadastroUsuario setCadastrandoUsuario={setCadastrandoUsuario} />
  }
  return <Login setUsuarioLogado={setUsuarioLogado} setCadastrandoUsuario={setCadastrandoUsuario} />
}
