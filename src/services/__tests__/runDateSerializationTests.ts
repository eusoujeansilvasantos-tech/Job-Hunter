import { toSafeISOString } from '../cloudSync';

export function runDateSerializationTests(): boolean {
  console.log('=== RUNNING DATE SERIALIZATION TESTS ===\n');
  let passed = true;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`PASS [${testName}]`);
    } else {
      console.error(`FAIL [${testName}]: ${detail || 'Assertion failed'}`);
      passed = false;
    }
  };

  // 1. ISO válido
  const isoInput = '2026-08-01T12:34:56.789Z';
  const res1 = toSafeISOString(isoInput);
  assert(res1 === isoInput, 'ISO Válido', `Expected ${isoInput}, got ${res1}`);

  // 2. Timestamp numérico válido
  const timestampInput = 1785542400000; // 2026-08-01T00:00:00.000Z
  const res2 = toSafeISOString(timestampInput);
  assert(
    res2 === '2026-08-01T00:00:00.000Z',
    'Timestamp Numérico Válido',
    `Expected 2026-08-01T00:00:00.000Z, got ${res2}`
  );

  // 3. Null
  const res3 = toSafeISOString(null);
  assert(res3 === null, 'Null', `Expected null, got ${res3}`);

  // 4. Undefined
  const res4 = toSafeISOString(undefined);
  assert(res4 === null, 'Undefined', `Expected null, got ${res4}`);

  // 5. String vazia
  const res5 = toSafeISOString('');
  assert(res5 === null, 'String Vazia', `Expected null, got ${res5}`);

  // 6. "Invalid Date"
  const res6 = toSafeISOString('Invalid Date');
  assert(res6 === null, 'String "Invalid Date"', `Expected null, got ${res6}`);

  // 7. Texto de data inválido (ex: "Há 2 dias", "Aproximadamente 1 mês atrás")
  const res7a = toSafeISOString('Há 2 dias');
  assert(res7a === null, 'Texto "Há 2 dias"', `Expected null, got ${res7a}`);

  const res7b = toSafeISOString('Publicada hoje');
  assert(res7b === null, 'Texto "Publicada hoje"', `Expected null, got ${res7b}`);

  // 8. Data válida proveniente de Adzuna (ex: ISO ou YYYY-MM-DD)
  const adzunaIso = '2026-08-08T10:00:00Z';
  const res8a = toSafeISOString(adzunaIso);
  assert(
    res8a === '2026-08-08T10:00:00.000Z',
    'Data Adzuna ISO',
    `Expected 2026-08-08T10:00:00.000Z, got ${res8a}`
  );

  const adzunaShort = '2026-08-08';
  const res8b = toSafeISOString(adzunaShort);
  assert(
    res8b === '2026-08-08T00:00:00.000Z',
    'Data Adzuna Short YYYY-MM-DD',
    `Expected 2026-08-08T00:00:00.000Z, got ${res8b}`
  );

  // 9. Data válida proveniente de Greenhouse (ex: ISO com milissegundos ou YYYY-MM-DD)
  const greenhouseIso = '2026-08-01T14:30:00.000Z';
  const res9a = toSafeISOString(greenhouseIso);
  assert(
    res9a === '2026-08-01T14:30:00.000Z',
    'Data Greenhouse ISO',
    `Expected 2026-08-01T14:30:00.000Z, got ${res9a}`
  );

  const greenhouseShort = '2026-08-01';
  const res9b = toSafeISOString(greenhouseShort);
  assert(
    res9b === '2026-08-01T00:00:00.000Z',
    'Data Greenhouse Short',
    `Expected 2026-08-01T00:00:00.000Z, got ${res9b}`
  );

  console.log(`\n=== DATE SERIALIZATION TESTS COMPLETED: ${passed ? 'ALL PASSED' : 'SOME FAILED'} ===\n`);
  return passed;
}

// Allow running directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runDateSerializationTests();
  if (!result) {
    process.exit(1);
  }
}
