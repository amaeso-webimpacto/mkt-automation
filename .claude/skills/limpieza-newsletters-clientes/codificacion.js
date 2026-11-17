// Decodificadores de transferencia de correo compartidos por la lectura de partes MIME y de cabeceras.
const CODIGO_HEXADECIMAL = /^[0-9A-Fa-f]{2}$/;

function decodificarQuotedPrintable(texto) {
  const limpio = texto.replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < limpio.length; i++) {
    const hex = limpio.slice(i + 1, i + 3);
    if (limpio[i] === "=" && CODIGO_HEXADECIMAL.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(limpio.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

module.exports = { decodificarQuotedPrintable };
