const crypto = require("crypto");
const QRCode = require("qrcode");
// const { createCanvas } = require("canvas");
const sharp = require("sharp");
// const Jimp = require("jimp").default;
const jsQR = require("jsqr");

// New code
class visualCrypto {
  constructor() {
    this.blockSize = 8;
    this.hmacSecret = Buffer.from(process.env.VC_SECRET, "hex");
    // this.hmacSecret = crypto.randomBytes(32);
  }

  async generateShares(paymentUrl) {
    const { hmac } = this.prepareData(paymentUrl);
    const [share1, share2] = this.splitData(paymentUrl);
    console.log("share1 : " + share1);
    console.log("share2 : " + share2);

    // Old code for QR code generation
    // const qrCode = await this.encodeQR(share1, hmac);

    // Generate QR code with raw share1 data
    const qrCode = await QRCode.toBuffer(share1, {
      errorCorrectionLevel: "H",
      type: "png",
    });

    // Process with sharp if needed (optional)
    // const processedQr = await sharp(qrCode).ensureAlpha().toBuffer();

    const serverShare = this.encryptShare(share2);
    console.log("serverShare : " + serverShare);

    return {
      qrCode: `data:image/png;base64,${qrCode.toString("base64")}`,
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
    return { hmac };
  }

  splitData(data) {
    const buffer = Buffer.from(data);
    const share1 = Buffer.alloc(buffer.length);
    const share2 = Buffer.alloc(buffer.length);

    for (let i = 0; i < buffer.length; i++) {
      share1[i] = crypto.randomBytes(1)[0];
      share2[i] = buffer[i] ^ share1[i];
    }

    const share1Base64 = share1.toString("base64");
    const share2Base64 = share2.toString("base64");

    return [share1Base64, share2Base64];
  }

  // async encodeQR(data, hmac) {
  //   const canvas = createCanvas(300, 300);
  //   await QRCode.toCanvas(canvas, data, { errorCorrectionLevel: "H" });

  //   const ctx = canvas.getContext("2d");
  //   ctx.fillStyle = "black";
  //   ctx.fillText(hmac.slice(0, 8), 10, 290);

  //   return canvas.toDataURL();
  // }

  encryptShare(share) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.hmacSecret, iv);

    const encryptedData = Buffer.concat([cipher.update(share), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, encryptedData, authTag]).toString("base64");
  }

  async reconstructSecret(clientShare, serverShare) {
    // 1. Decode QR to get clientShare
    const base64Data = clientShare.split(",")[1];
    const qrBuffer = Buffer.from(base64Data, "base64");
    // console.log(buffer);
    const { data, info } = await sharp(qrBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const decoded = jsQR(
      new Uint8ClampedArray(data.buffer),
      info.width,
      info.height
    );
    if (!decoded) throw new Error("QR decoding failed");
    // const share1 = Buffer.from(decoded.data, "base64");
    const share1 = decoded.data;

    // 2. Decrypt serverShare
    const encryptedBuffer = Buffer.from(serverShare, "base64");
    const iv = encryptedBuffer.subarray(0, 12); // First 12 bytes
    const encryptedData = encryptedBuffer.subarray(
      12,
      encryptedBuffer.length - 16
    ); // Middle
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16); // Last 16 bytes

    const decipher = crypto
      .createDecipheriv("aes-256-gcm", this.hmacSecret, iv)
      .setAuthTag(authTag);

    const share2 = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    // 3. Validate and reconstruct
    if (share1.length !== share2.length)
      throw new Error("Share length mismatch");
    // const reconstructed = share1.map((b, i) => b ^ share2[i]);

    console.log("share1 : " + share1);
    console.log("share2 : " + share2);

    // const share1Base64 =
    //   "T6DKo7cwpMgItmQ/XRmUL7eN5nNbCboVAmfeo4DyH3V3pV3A6iBl1deghbv2Kwfno/8mZHzww3qjErGj7sJy+eLkt+nTG2x0nepH11fcXI3cNoycuKc1F7QXB6mJXOmYv+M=";
    // const share2Base64 =
    //   "J9S+08QKi+d70wdKL3y5X9b0yBYjaNdlbgLx0+GLIBQayiiunh1U5fHE8YbHHDPRlM4SXUXF9EmUNMXb0/REzdfXhNjmNgpDrttq427oaaC9ALr+lZMMJtEhP8ywZdr6i54=";

    // Convert share1 to Uint8Array if needed
    const share1Buffer = Buffer.from(String(share1), "base64");
    const share2Buffer = Buffer.from(String(share2), "base64");
    // const share2Buffer = new Uint8Array(Buffer.from(share2, "base64"));

    // XOR using array indices
    const reconstructedBuffer = Buffer.alloc(share1Buffer.length);
    for (let i = 0; i < share1Buffer.length; i++) {
      reconstructedBuffer[i] = share1Buffer[i] ^ share2Buffer[i];
    }

    const reconstructedString = reconstructedBuffer.toString(
      "utf8",
      (error) => {
        if (error) console.warn("Ignoring decoding error:", error.message);
      }
    );

    console.log("reconstructed : " + reconstructedString);
    console.log("reconstructed : " + reconstructedString.toString("base64"));
    console.log("reconstructed : " + reconstructedString.toString("utf8"));
    return reconstructedString.toString("utf8");

    // Reconstruct original secret
    // const reconstructedSecret = Buffer.from(
    //   share1.map((b, i) => b ^ share2[i])
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
