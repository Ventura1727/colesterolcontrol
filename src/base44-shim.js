// Shim para evitar crash enquanto remove dependências do Base44
if (!globalThis.base44) {
  globalThis.base44 = {};
}
