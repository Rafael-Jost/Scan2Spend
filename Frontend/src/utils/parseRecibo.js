function parseRecibo(textoRecibo) {
    if (!textoRecibo) return 'texto nao recebido';

    if (typeof textoRecibo === 'object') {
        return textoRecibo;
    }

    try {
        let parsed = JSON.parse(textoRecibo);

        // se ainda for string, era JSON duplo
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }

        return parsed;
    } catch (e) {
        console.error('Erro ao fazer parse:', e);
        return 'texto nao recebido';
    }
}

export default parseRecibo
