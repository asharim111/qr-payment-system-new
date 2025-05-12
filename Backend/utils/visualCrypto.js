const crypto = require("crypto");
const QRCode = require("qrcode");
const sharp = require("sharp");
const jsQR = require("jsqr");

// New code
class visualCrypto {
  constructor() {
    this.blockSize = 8;
    this.hmacSecret = Buffer.from(process.env.VC_SECRET, "hex");
  }

  async generateShares(paymentUrl, amount, transactionId) {
    const { hmac } = this.prepareData(paymentUrl, amount, transactionId);
    const [share1, share2] = this.splitData(paymentUrl);
    console.log("share1 : " + share1);
    console.log("share2 : " + share2);

    // Generate QR code with raw share1 data
    const qrCode = await QRCode.toBuffer(share1, {
      errorCorrectionLevel: "H",
      type: "png",
    });

    const serverShare = this.encryptShare(share2);

    return {
      qrCode: `data:image/png;base64,${qrCode.toString("base64")}`,
      serverShare,
      hmac,
    };
  }

  prepareData(paymentUrl, amount, transactionId) {
    const hmacPayload = JSON.stringify({
      paymentUrl: String(paymentUrl),
      transactionId: String(transactionId),
      amount: String(amount),
    });

    const hmac = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(hmacPayload)
      .digest("hex");

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

    // Convert share1 to Uint8Array if needed
    const share1Buffer = Buffer.from(String(share1), "base64");
    const share2Buffer = Buffer.from(String(share2), "base64");

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
    return reconstructedString.toString("utf8");
  }
}

module.exports = visualCrypto;
