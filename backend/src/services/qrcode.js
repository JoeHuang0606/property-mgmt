const QRCode = require('qrcode');

/**
 * 產生 QR Code Data URL
 * @param {string} data - 要編碼的資料（例如財產編號 URL）
 * @returns {Promise<string>} Base64 Data URL
 */
async function generateQRCode(data) {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
    return dataUrl;
  } catch (err) {
    console.error('QR Code 生成失敗:', err);
    throw new Error('QR Code 生成失敗');
  }
}

module.exports = { generateQRCode };
