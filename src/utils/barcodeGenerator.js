// barcodeGenerator.js
export const generateBarcode = () => {
    // Generates a unique barcode each day (e.g., using date + random string)
    const date = new Date().toISOString().slice(0, 10);
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${date}-${randomStr}`;
  };
  