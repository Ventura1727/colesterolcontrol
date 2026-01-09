import { useState } from 'react';

export default function GerarPix() {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const gerarPix = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: 100,
          nome: 'João Silva',
          email: 'joao@email.com'
        })
      });

      const data = await response.json();
      const base64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
      setQrCode(base64);
    } catch (error) {
      alert('Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={gerarPix} disabled={loading}>
        {loading ? 'Gerando...' : 'Gerar PIX'}
      </button>
      {qrCode && (
        <div>
          <h3>Escaneie o QR Code para pagar:</h3>
          <img src={`data:image/png;base64,${qrCode}`} alt="QR Code PIX" />
        </div>
      )}
    </div>
  );
}
