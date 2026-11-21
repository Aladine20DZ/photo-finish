#!/usr/bin/env node
/**
 * Photo Finish Pro — مولد/مُدوِّر أزواج مفاتيح التراخيص Ed25519 (Stage 1)
 * ========================================================================
 * الاستعمال:
 *   node scripts/rotate-license-keys.mjs
 *
 * السلوك:
 *   1) يولّد زوج Ed25519 جديداً.
 *   2) يكتب المفتاحين في مجلد gitignored:
 *        data/license-private.b64   (الخاص — لا يغادر الخادم أبداً)
 *        data/license-public.b64    (العام — يُثبَّت في Vercel عبر LICENSE_PUBLIC_KEY_BASE64)
 *   3) يطبع بصمة المفتاح العام فقط (SHA-256 أول 16 خانة) — لا يطبع أي مفتاح.
 *
 * بعد التدوير:
 *   - انقل قيمة المفتاحين إلى متغيرات بيئة الخادم:
 *       LICENSE_PRIVATE_KEY_BASE64 / LICENSE_PUBLIC_KEY_BASE64
 *   - أعد إصدار كل التراخيص القائمة (أي زوج منشور سابقاً يُعد مفسوحاً).
 *   - حدّث VITE_LICENSE_PUBLIC_KEY في Vercel إن كنت تعتمد التثبيت وقت البناء
 *     (dev middleware يضبطه تلقائياً من الخادم).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.PFP_DATA_DIR || path.join(process.cwd(), 'data');
const privFile = path.join(dataDir, 'license-private.b64');
const pubFile = path.join(dataDir, 'license-public.b64');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(16);
const pub = publicKey.export({ type: 'spki', format: 'der' }).subarray(12);

fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(privFile, priv.toString('base64') + '\n', { mode: 0o600 });
fs.writeFileSync(pubFile, pub.toString('base64') + '\n', { mode: 0o600 });

const fingerprint = crypto.createHash('sha256').update(pub).digest('hex').slice(0, 16);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  تم توليد زوج مفاتيح Ed25519 جديد (Stage 1 Key Rotation)   ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  المفتاح الخاص (سرّي، لا يُطبع): ${privFile}`);
console.log(`║  المفتاح العام (يُثبَّت في بيئة الخادم): ${pubFile}`);
console.log(`║  بصمة المفتاح العام (SHA-256/16): ${fingerprint}`);
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  الخطوات الإلزامية بعد التدوير:                             ║');
console.log('║  1) انقل محتوى الملفين إلى LICENSE_PRIVATE_KEY_BASE64 و     ║');
console.log('║     LICENSE_PUBLIC_KEY_BASE64 في Vercel/Render حصراً.        ║');
console.log('║  2) أعد إصدار كل التراخيص القديمة — أي مفتاح سبق نشره       ║');
console.log('║     في مستودع عام يُعد مفسوحاً نهائياً.                      ║');
console.log('║  3) لا تُطبع المفاتيح ولا تُضمَّن في أي ملف مُتعقب.           ║');
console.log('╚════════════════════════════════════════════════════════════╝');
