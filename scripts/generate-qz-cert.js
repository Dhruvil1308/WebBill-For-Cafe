const forge = require('node-forge');
const fs = require('fs');

console.log('Generating 2048-bit key-pair...');
const keys = forge.pki.rsa.generateKeyPair(2048);
console.log('Key-pair generated.');

const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10); // Valid for 10 years

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'US' },
  { shortName: 'ST', value: 'New York' },
  { name: 'localityName', value: 'New York' },
  { name: 'organizationName', value: 'WebBill Cafe' },
  { shortName: 'OU', value: 'POS System' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Self-sign the certificate
cert.sign(keys.privateKey, forge.md.sha256.create());

// Convert to PEM
const pemCert = forge.pki.certificateToPem(cert);
const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync('qz-cert.pem', pemCert);
fs.writeFileSync('qz-key.pem', pemKey);

console.log('Successfully wrote qz-cert.pem and qz-key.pem');
