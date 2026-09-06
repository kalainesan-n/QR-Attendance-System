const QRCode = require("qrcode");

async function eventIdToDataUrl(eventId) {
  return QRCode.toDataURL(String(eventId), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
  });
}

module.exports = { eventIdToDataUrl };
