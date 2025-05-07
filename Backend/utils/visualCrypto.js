const crypto = require("crypto");
const QRCode = require("qrcode");
const { createCanvas } = require("canvas");

// New code
class visualCrypto {
  constructor() {
    this.blockSize = 8;
    this.hmacSecret = Buffer.from(process.env.VC_SECRET, "hex");
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
    // return { data: `${data}|${Date.now()}`, hmac };
    return { data: `${data}}`, hmac };
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

  async reconstructSecret(clientShare, serverShare) {
    // Extract client share from data URL
    const clientBase64 = clientShare.split(",")[1];
    const clientBuffer = Buffer.from(clientBase64, "base64");
    console.log("Client Buffer Length:", clientBuffer.length);

    // Parse encrypted server share
    const encryptedBuffer = Buffer.from(serverShare, "base64");
    const iv = encryptedBuffer.subarray(0, 16);
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16);
    const ciphertext = encryptedBuffer.subarray(
      16,
      encryptedBuffer.length - 16
    );

    console.log("IV:", iv);
    console.log("Auth Tag:", authTag);
    console.log("Ciphertext Length:", ciphertext.length);

    // Decrypt server share
    const decipher = crypto
      .createDecipheriv("aes-256-gcm", this.hmacSecret, iv)
      .setAuthTag(authTag);

    const serverBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    console.log("Server Buffer Length:", serverBuffer.length);

    // Ensure buffers have the same length
    // if (clientBuffer.length !== serverBuffer.length) {
    //   throw new Error(
    //     `Buffer length mismatch: clientBuffer (${clientBuffer.length}) and serverBuffer (${serverBuffer.length})`
    //   );
    // }

    const reconstructed = clientBuffer.map((b, i) => b ^ serverBuffer[i]);
    return reconstructed.toString("utf8");

    // Reconstruct original secret
    // const reconstructedSecret = Buffer.from(
    //   clientBuffer.map((b, i) => b ^ serverBuffer[i])
    // ).toString("utf8");
    // console.log("Reconstructed Secret:", reconstructedSecret);

    // return reconstructedSecret;

    // const client = Buffer.from(clientShare, "base64");
    // const server = Buffer.from(serverShare, "base64");
    // return client.map((b, i) => b ^ server[i]).toString("utf8");
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
