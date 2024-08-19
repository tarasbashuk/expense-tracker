import CryptoJS from 'crypto-js';

function generateNumericKey(key: string) {
  const hash = CryptoJS.SHA256(key).toString();

  return parseInt(hash.slice(0, 8), 16); // Convert part of the hash to a numeric value
}

export const encrypt = (text: string, key: string) =>
  CryptoJS.AES.encrypt(text, key).toString();

export const decrypt = (ciphertext: string, key: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);

  return bytes.toString(CryptoJS.enc.Utf8);
};

export const encryptFloat = (value: number, key: string) => {
  const numericKey = generateNumericKey(key);

  return value + numericKey;
};

export const decryptFloat = (value: number, key: string) => {
  const numericKey = generateNumericKey(key);

  return value - numericKey;
};
