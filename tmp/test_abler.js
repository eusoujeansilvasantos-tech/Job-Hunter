const fs = require('fs');

async function main() {
  const packs = [
    "https://candidato.abler.com.br/packs/js/890-6e51244c01ae7553136f.js",
    "https://candidato.abler.com.br/packs/js/896-7b0e8e90846a1c0d920e.js",
    "https://candidato.abler.com.br/packs/js/594-3f99e988a4d63742db6e.js",
    "https://candidato.abler.com.br/packs/js/553-4144b17eab6fb1d420db.js",
    "https://candidato.abler.com.br/packs/js/vue-public-3b64044a5a9122f6aea2.js"
  ];

  for (const pack of packs) {
    const res = await fetch(pack);
    const text = await res.text();
    console.log("===", pack, "length:", text.length);

    // Look for axios / fetch / request patterns
    const regex = /(?:get|post|request|url)\s*[:(]\s*["'`]([^"'`]+)["'`]/gi;
    let match;
    const urls = new Set();
    while ((match = regex.exec(text)) !== null) {
      if (!match[1].startsWith('data:') && !match[1].endsWith('.png') && !match[1].endsWith('.svg')) {
        urls.add(match[1]);
      }
    }
    console.log("Discovered endpoints / URLs:", Array.from(urls));
  }
}

main().catch(console.error);
