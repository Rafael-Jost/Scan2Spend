import { SalvarPayload } from './CardsEdicao.jsx'

function PopUpDeInformacoes({conteudo, popupAberto, setPopupAberto, atualizarGraficos}) {

    return (
    <div id="popup-informacoes" style={{ display: popupAberto ? 'flex' : 'none' }}>
      <div id="painel-de-informacoes">
        {conteudo}
        <button
          style={{ marginTop: '20px' }}
          onClick={() => {
            setPopupAberto(false)
          }}
        >
          Fechar
        </button>
        <button
          style={{ marginTop: '20px', marginLeft: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px' }}
          onClick={async () => {
            const status_salvamento = await SalvarPayload();
            alert(status_salvamento);
            setPopupAberto(false);
            atualizarGraficos();
          }}>
          Salvar
        </button>
      </div>
    </div>
  );
  
}

export default PopUpDeInformacoes
