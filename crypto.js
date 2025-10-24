// crypto.js

function serializeArg(arg) {
    if (arg instanceof Uint8Array || arg instanceof ArrayBuffer) return arrayBufferToBase64(arg);
    if (arg && typeof arg === 'object') return JSON.stringify(arg, Object.keys(arg).sort());
    return String(arg);
}
function getSize(value) {
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (value instanceof Uint8Array) return value.byteLength;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'object' && value !== null) {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    }
    return 0;
}

function cacheAsync(fn) {
    const cache = new Map();
    return async (...args) => {
        const key = args.map(serializeArg).join('|');
        const start = performance.now();
        if (cache.has(key)) {
            const result = await cache.get(key);
            let totalUnits = 0;
            for (const v of cache.values()) totalUnits += getSize(await v);
            console.log(`[Cached - ${fn.name}]: ${performance.now() - start} ms, cache size: ${totalUnits} units`);
            return result;
        }
        const promise = fn(...args);
        cache.set(key, promise);
        const result = await promise;
        let totalUnits = 0;
        for (const v of cache.values()) totalUnits += getSize(await v);
        console.log(`[Executed - ${fn.name}]: ${performance.now() - start} ms, cache size: ${totalUnits} units`);
        return result;
    };
}

function buf2hex(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return buf2hex(hashBuffer);
}
sha256 = cacheAsync(sha256)

function base64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) =>
    String.fromCharCode(Number.parseInt(p1, 16))
  ));
}

function base64DecodeUnicode(str) {
  return decodeURIComponent(atob(str).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
	bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
deriveKey = cacheAsync(deriveKey);

async function encryptText(plainText, password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(plainText)
  );
  return JSON.stringify({
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(encrypted)
  });
}

async function decryptText(encryptedData, password) {
  try {
    const obj = JSON.parse(encryptedData);
    const salt = new Uint8Array(base64ToArrayBuffer(obj.salt));
    const iv = new Uint8Array(base64ToArrayBuffer(obj.iv));
    const data = base64ToArrayBuffer(obj.data);
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error(e);
    throw new Error("Invalid password or corrupted data");
  }
}
decryptText = cacheAsync(decryptText);

async function generateOTP(keyObj) {
    const digits = keyObj.digits;
    const period = keyObj.period;
    const algorithm = (() => {
        switch (keyObj.algorithm) {
            case "SHA1": return "SHA-1";
            case "SHA256": return "SHA-256";
            case "SHA512": return "SHA-512";
            default:
                console.error(`generateOTP: Unsupported algorithm "${keyObj.algorithm}"`);
                throw new Error("Unsupported algorithm");
        }
    })();

    const epoch = Math.floor(Date.now() / 1000);
    const counter = BigInt(Math.floor(epoch / period));
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigUint64(0, counter, false);

    const keyData = base32ToUint8Array(keyObj.secret);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: { name: algorithm } },
        false,
        ['sign']
    );

    const hmac = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
    const hmacBytes = new Uint8Array(hmac);
    const offset = hmacBytes[hmacBytes.length - 1] & 0xf;

    const binary = 
        (BigInt(hmacBytes[offset] & 0x7f) << 24n) |
        (BigInt(hmacBytes[offset + 1] & 0xff) << 16n) |
        (BigInt(hmacBytes[offset + 2] & 0xff) << 8n) |
        BigInt(hmacBytes[offset + 3] & 0xff);

    const otp = (binary % 10n ** BigInt(digits)).toString().padStart(digits, '0');

    return otp;
}

function base32ToUint8Array(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '', output = [];
  
  for (let char of base32) {
    let val = alphabet.indexOf(char.toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    output.push(Number.parseInt(bits.substring(i, i + 8), 2));
  }

  return new Uint8Array(output);
}

function base64ToBase32(base64) {
    const bytes = base64ToUint8Array(base64);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '', base32 = '';

    for (let byte of bytes) {
        bits += byte.toString(2).padStart(8, '0');
    }

    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.substring(i, i + 5);
        base32 += alphabet[Number.parseInt(chunk.padEnd(5, '0'), 2)];
    }

    return base32;
}