const crypto = require("crypto");
const QRCode = require("qrcode");
const { createCanvas } = require("canvas");

// New code
class visualCrypto {
  constructor() {
    this.blockSize = 8;
    this.hmacSecret = crypto.randomBytes(32);
  }

  async generateShares(secretData) {
    const { data, hmac } = this.prepareData(secretData);
    const [share1, share2] = this.splitData(data);

    const qrCode = await this.encodeQR(share1, hmac);
    const serverShare = this.encryptShare(share2);

    return {
      qrCode,
      serverShare,
      hmac,
    };
  }

  prepareData(data) {
    const hmac = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(data)
      .digest("hex");
    return { data: `${data}|${Date.now()}`, hmac };
  }

  splitData(data) {
    const buffer = Buffer.from(data);
    const share1 = Buffer.alloc(buffer.length);
    const share2 = Buffer.alloc(buffer.length);

    for (let i = 0; i < buffer.length; i++) {
      const rand = crypto.randomBytes(1)[0];
      share1[i] = rand;
      share2[i] = buffer[i] ^ rand;
    }

    return [share1.toString("base64"), share2.toString("base64")];
  }

  async encodeQR(data, hmac) {
    const canvas = createCanvas(300, 300);
    await QRCode.toCanvas(canvas, data, { errorCorrectionLevel: "H" });

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillText(hmac.slice(0, 8), 10, 290);

    return canvas.toDataURL();
  }

  encryptShare(share) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.hmacSecret, iv);
    return Buffer.concat([
      iv,
      cipher.update(share),
      cipher.final(),
      cipher.getAuthTag(),
    ]).toString("base64");
  }

  static reconstructSecret(clientShare, serverShare) {
    const client = Buffer.from(clientShare, "base64");
    const server = Buffer.from(serverShare, "base64");
    return client.map((b, i) => b ^ server[i]).toString("utf8");
  }
}

module.exports = visualCrypto;

// Old code
// module.exports = {
//   /**
//    * Generates VC shares using XOR-based algorithm (Research )
//    * @param {string} secret - Payment URL
//    * @returns {Object} clientShare and serverShare
//    */
//   generateShares: (secret) => {
//     const buffer = Buffer.from(secret, "utf8");
//     const clientShare = crypto.randomBytes(buffer.length);
//     const serverShare = buffer.map((b, i) => b ^ clientShare[i]);

//     return {
//       client: clientShare.toString("base64"),
//       server: serverShare.toString("base64"),
//     };
//   },

//   /**
//    * Reconstructs secret from VC shares (Research )
//    */
//   reconstructSecret: (clientShare, serverShare) => {
//     const client = Buffer.from(clientShare, "base64");
//     const server = Buffer.from(serverShare, "base64");
//     return client.map((b, i) => b ^ server[i]).toString("utf8");
//   },
// };
