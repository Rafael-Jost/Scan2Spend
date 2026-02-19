import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { useEffect, useState } from "react";

export default function QrScanner({ funcAnalisarRecibo }) {
    // const [url, setUrl] = useState(null);
    
    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", {
            qrbox: {
                width: 250,
                height: 250,
            },
            fps: 2,
            rememberLastUsedCamera: false,
            supportedScanTypes: [
                Html5QrcodeScanType.SCAN_TYPE_CAMERA, 
                Html5QrcodeScanType.SCAN_TYPE_FILE,
            ],
        });

        scanner.render(success, error);

        function success(result) {
            scanner.clear();
            const url = result;
            console.log("URL escaneada: ", url);
            // setUrl(result);
            funcAnalisarRecibo(url);
        }

        function error(err) {
            console.warn(err);
        }

    }, []);

    return (

        <div>
            <h3>Escaneie o QR da sua nota fiscal</h3>
            <div id="reader"></div>
            {/* <div>
                {url && <p>URL escaneada: {url}</p>}
            </div> */}
        </div>
    );
}