const assert = require("node:assert/strict");
const qrcode = require("../lib/qrcode-generator.js");

const verificationUrl = "https://zion.example/recibo/verificar?codigo=0123456789ABCDEF0123456789ABCDEF";
const qr = qrcode(0, "M");
qr.addData(verificationUrl);
qr.make();

const size = qr.getModuleCount();
assert.ok(size >= 21 && size <= 177, "QR matrix size must be a valid QR version");
let darkModules = 0;
for (let row = 0; row < size; row += 1) {
  for (let column = 0; column < size; column += 1) {
    const value = qr.isDark(row, column);
    assert.equal(typeof value, "boolean", "every QR module must be defined");
    if (value) darkModules += 1;
  }
}
assert.ok(darkModules > 0, "QR matrix must contain encoded modules");
assert.ok(darkModules < size * size, "QR matrix must preserve light modules");
process.stdout.write(`Receipt QR smoke test passed (${size}x${size}, ${darkModules} dark modules).\\n`);
