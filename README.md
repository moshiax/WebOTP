![Concept](demo.png)

- deep secrets encryption (see demo.png)
- can export to text/file with encryption
- can import from google authentificator/qr codes/file/text
- no google spyware/cloud sync
- no stupid specification limits like Aegis "Secret is not valid base32". All secrets are valid

```javascript
await addKeyUI("Email-Gmail", "JBSWY3DPEHPK3PXP", {issuer: "Gmail", digits: 6, period: 30, algorithm: "SHA1"});
await addKeyUI("Game-Steam", "KRSXG5DSMFZWK3TQ", {issuer: "Valve", digits: 8, period: 15, algorithm: "SHA256"});
await addKeyUI("Work-GitHub", "ONSWG4TFOQ======", {issuer: "GitHub", digits: 6, period: 60, algorithm: "SHA1"});
await addKeyUI("VPN-Nord", "MZXW6YTBOI======", {issuer: "NordVPN", digits: 6, period: 30, algorithm: "SHA512"});
```