import { SalvarPayload } from './CardsEdicao.jsx'

function PopUpDeInformacoes({conteudo}){

    return (
    <div id="popup-informacoes">
      <div id="painel-de-informacoes">
        {conteudo}
        <button
          style={{ marginTop: '20px' }}
          onClick={() => {
            const popup = document.getElementById('popup-informacoes')
            if(popup) popup.style.display = 'none';
          }}
        >
          Fechar
        </button>
        <button
          style={{ marginTop: '20px', marginLeft: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px' }}
          onClick={async () => {
            const status_salvamento = await SalvarPayload();
            alert(status_salvamento);
            const popup = document.getElementById('popup-informacoes')
            if(popup) popup.style.display = 'none';
          }}>
          Salvar
        </button>
      </div>
    </div>
  );
  
}

export default PopUpDeInformacoes
