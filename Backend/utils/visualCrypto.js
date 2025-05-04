const crypto = require("crypto");

module.exports = {
  /**
   * Generates VC shares using XOR-based algorithm (Research )
   * @param {string} secret - Payment URL
   * @returns {Object} clientShare and serverShare
   */
  generateShares: (secret) => {
    const buffer = Buffer.from(secret, "utf8");
    const clientShare = crypto.randomBytes(buffer.length);
    const serverShare = buffer.map((b, i) => b ^ clientShare[i]);

    return {
      client: clientShare.toString("base64"),
      server: serverShare.toString("base64"),
    };
  },

  /**
   * Reconstructs secret from VC shares (Research )
   */
  reconstructSecret: (clientShare, serverShare) => {
    const client = Buffer.from(clientShare, "base64");
    const server = Buffer.from(serverShare, "base64");
    return client.map((b, i) => b ^ server[i]).toString("utf8");
  },
};
