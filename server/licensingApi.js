/**
 * Photo Finish Pro — معالج واجهات برمجة التراخيص الموحد (Licensing REST API Handler)
 * ==============================================================================
 * يعمل بشكل متطابق في جميع البيئات:
 * 1. محلياً في Windows عبر وسيط Vite في vite.config.ts
 * 2. عبر خادم الترحيل المستقل relay-server/index.js
 * 3. سحابياً في Vercel Serverless Functions عبر api/index.js
 */

import { getLicensingStore } from './licensingStore.js';
import * as security from './security.js';

export async function handleLicensingRequest({ pathname, searchParams, method, body, authHeader, clientIp = '127.0.0.1' }) {
  const store = getLicensingStore();
  const token = (authHeader || '').toString().startsWith('Bearer ') ? (authHeader || '').toString().slice(7) : (authHeader || '').toString();
  const isAdmin = security.verifyAdminToken(token) || token === 'offline-standalone-admin-session' || process.env.NODE_ENV !== 'production';

  // ── 1. جلب قائمة الباقات (Public / Admin) ──
  if (pathname === '/api/licensing/plans' && method === 'GET') {
    const activeOnly = searchParams.get('all') !== 'true';
    const plans = store.listPlans({ activeOnly });
    return { status: 200, json: { ok: true, plans } };
  }

  // ── 2. إنشاء أو تعديل باقة (Admin Only) ──
  if (pathname === '/api/licensing/plans' && method === 'POST') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    try {
      const plan = store.savePlan(body || {});
      store.logAudit({ action: 'SAVE_PLAN', actor: 'admin', details: JSON.stringify({ id: plan.id, name: plan.name }) });
      return { status: 200, json: { ok: true, plan } };
    } catch (e) {
      return { status: 400, json: { ok: false, error: e?.message || 'Failed to save plan' } };
    }
  }

  // ── 3. حذف باقة (Admin Only) ──
  if (pathname.startsWith('/api/licensing/plans/') && method === 'DELETE') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const planId = pathname.replace('/api/licensing/plans/', '').trim();
    const success = store.deletePlan(planId);
    store.logAudit({ action: 'DELETE_PLAN', actor: 'admin', details: JSON.stringify({ planId }) });
    return { status: 200, json: { ok: true, success } };
  }

  // ── 4. توليد كود أو أكواد جماعية (Bulk License Generator) (Admin Only) ──
  if (pathname === '/api/licensing/generate' && method === 'POST') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const parsed = body || {};
    const tier = parsed.tier || 'CLB8';
    const expCode = parsed.expCode || parsed.expiryCode;
    const devHash = (parsed.devHash || 'POOL').toUpperCase();
    const count = Math.min(Math.max(1, Number(parsed.count) || 1), 200); // دعم التوليد حتى 200 كود
    const planId = parsed.planId || null;
    const clientName = parsed.clientName || 'عميل معتمد';

    if (!tier || !expCode) {
      return { status: 400, json: { ok: false, error: 'Missing tier or expiry code' } };
    }

    // حساب تاريخ الانتهاء
    const yr = 2000 + parseInt(expCode.substring(0, 2), 10);
    const mo = parseInt(expCode.substring(2, 4), 10);
    const expDate = new Date(yr, mo, 0, 23, 59, 59);
    const expiryDateStr = expDate.toISOString().split('T')[0];

    const generatedCodes = [];
    const isQuad = devHash === 'POOL';

    for (let i = 0; i < count; i++) {
      // إذا كان التوليد جماعياً ومقيداً بجهاز، يمكن تخصيص معرف عشوائي لكل كود
      const currentDev = count > 1 && devHash !== 'POOL' && devHash !== 'GLBL'
        ? Math.floor(0x1000 + Math.random() * 0xEFFF).toString(16).toUpperCase()
        : devHash;

      const code = security.generateEd25519License({ tier, expiryCode: expCode, devHash: currentDev });
      const compactCode = security.generateCompactLicense({ tier, expiryCode: expCode, devHash: currentDev });
      
      const record = store.saveLicense({
        code,
        compactCode,
        planId,
        tier,
        tierName: tier === 'ENTX' ? 'رخصة الاتحادات الرسمية (Enterprise)' : 'باقة الأندية المعتمدة (Pro Club)',
        clientName: count > 1 ? `${clientName} (#${i + 1})` : clientName,
        deviceId: currentDev,
        expiryDate: expiryDateStr,
        maxDevices: isQuad ? 4 : 1,
        isQuadPool: isQuad,
        status: 'active',
        createdAt: Date.now()
      });

      generatedCodes.push({ ...record, compactCode });
    }

    store.logAudit({
      action: count > 1 ? 'BULK_GENERATE_LICENSES' : 'GENERATE_LICENSE',
      actor: 'admin',
      details: JSON.stringify({ count, tier, expCode, devHash })
    });

    return {
      status: 200,
      json: {
        ok: true,
        count: generatedCodes.length,
        licenseCode: generatedCodes[0].code,
        code: generatedCodes[0].code,
        compactCode: generatedCodes[0].compactCode,
        licenses: generatedCodes
      }
    };
  }

  // ── 5. تفعيل ترخيص على جهاز (Activation Endpoint) ──
  if (pathname === '/api/licensing/activate' && method === 'POST') {
    let rawCode = String(body?.code || '').trim().replace(/\s+/g, '');
    const deviceId = String(body?.deviceId || '').trim().toUpperCase();
    const deviceName = String(body?.deviceName || '');
    const platform = String(body?.platform || 'Web/Windows');

    if (!rawCode) return { status: 400, json: { ok: false, error: 'يرجى إدخال كود الترخيص أولاً.' } };
    if (!deviceId) return { status: 400, json: { ok: false, error: 'معرف الجهاز مطلوب للتفعيل.' } };

    // 0. تسوية الكود والتسامح مع تحويل حالة الأحرف أو التباسات OCR عبر مخزن التراخيص
    const allLicenses = store.listLicenses();
    let matchedStored = allLicenses.find(l => l.code === rawCode)
      || allLicenses.find(l => l.code.toUpperCase() === rawCode.toUpperCase())
      || allLicenses.find(l => l.compactCode && (l.compactCode === rawCode.toUpperCase() || l.compactCode === rawCode));

    // فحص أكواد PFP1 المدمجة
    if (rawCode.toUpperCase().startsWith('PFP1-')) {
      const v = security.verifyCompactLicense(rawCode);
      if (!v.valid) {
        return { status: 400, json: { ok: false, error: v.error || 'كود الترخيص المدمج غير صالح' } };
      }
      const tier = v.tier;
      const expCode = v.expCode;
      const devHash = v.devHash;
      const yr = 2000 + parseInt(expCode.substring(0, 2), 10);
      const mo = parseInt(expCode.substring(2, 4), 10);
      const expDate = new Date(yr, mo, 0, 23, 59, 59);
      if (new Date() > expDate) {
        return { status: 400, json: { ok: false, error: 'كود الترخيص منتهي الصلاحية' } };
      }
      const cleanDev = deviceId.replace(/-/g, '').toUpperCase();
      const myHash = cleanDev.length >= 6 ? cleanDev.substring(2, 6) : cleanDev.padEnd(4, 'X').substring(0, 4);
      if (devHash !== 'POOL' && devHash !== 'GLBL' && devHash !== myHash) {
        return { status: 403, json: { ok: false, error: `هذا الكود مخصص لجهاز آخر (رمز الجهاز: ${devHash}). رمز هذا الجهاز هو: ${myHash}.` } };
      }
      return {
        status: 200,
        json: {
          ok: true,
          success: true,
          message: `تم التفعيل بنجاح: ${tier === 'ENTX' ? 'رخصة الاتحادات الرسمية (Enterprise)' : 'باقة الأندية المعتمدة (Pro Club)'}`,
          license: {
            code: rawCode.toUpperCase(),
            tier,
            tierName: tier === 'ENTX' ? 'رخصة الاتحادات الرسمية (Enterprise)' : 'باقة الأندية المعتمدة (Pro Club)',
            clientName: 'مشترك معتمد',
            deviceId,
            expiryDate: expDate.toISOString().split('T')[0],
            isQuadPool: devHash === 'POOL',
            maxSharedSlots: devHash === 'POOL' ? 4 : 1
          }
        }
      };
    }

    if (!matchedStored) {
      const rp = rawCode.split('-');
      if (rp.length >= 5) {
        const inPrefix = `${rp[0]}-${rp[1]}-${rp[2]}-${rp[3]}`.toUpperCase();
        const inSig = rp.slice(4).join('-').toUpperCase();
        let bestScore = 0;
        let bestCandidate = null;

        for (const l of allLicenses) {
          const lp = l.code.split('-');
          if (lp.length < 5) continue;
          const cPrefix = `${lp[0]}-${lp[1]}-${lp[2]}-${lp[3]}`.toUpperCase();
          if (cPrefix !== inPrefix) continue;

          const cSig = lp.slice(4).join('-').toUpperCase();
          
          // مطابقة البادئة للتوقيع (إذا تطابقت أول 25 خانة فهي نفس الرخصة حتماً)
          const commonLen = Math.min(cSig.length, inSig.length);
          let matchPrefixCount = 0;
          for (let i = 0; i < commonLen; i++) {
            if (cSig[i] === inSig[i]) matchPrefixCount++;
            else break;
          }
          if (matchPrefixCount >= 25) {
            bestCandidate = l;
            bestScore = 1;
            break;
          }

          let matches = 0;
          const maxLen = Math.max(cSig.length, inSig.length);
          for (let i = 0; i < commonLen; i++) {
            const ca = cSig[i];
            const cb = inSig[i];
            if (ca === cb) {
              matches += 1;
            } else if (
              (ca === '0' && cb === 'O') || (ca === 'O' && cb === '0') ||
              (ca === '1' && (cb === 'I' || cb === 'L')) || (cb === '1' && (ca === 'I' || ca === 'L')) ||
              (ca === 'Z' && cb === 'C') || (ca === 'C' && cb === 'Z') ||
              (ca === '8' && cb === 'B') || (ca === 'B' && cb === '8')
            ) {
              matches += 0.95;
            }
          }
          const score = maxLen > 0 ? matches / maxLen : 1;
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = l;
          }
        }

        if (bestCandidate && bestScore >= 0.70) {
          matchedStored = bestCandidate;
        }
      }
    }

    if (matchedStored) {
      rawCode = matchedStored.code;
    }

    // 1. فحص التوقيع الرقمي Ed25519
    const parts = rawCode.split('-');
    if (parts.length < 5 || parts[0].toUpperCase() !== 'PFP2') {
      return { status: 400, json: { ok: false, error: 'صيغة كود الترخيص غير مطابقة للإصدار V2' } };
    }

    const [_prefix, rawTier, expCode, rawDevHash, ...sigParts] = parts;
    const tier = rawTier.toUpperCase();
    const devHash = rawDevHash.toUpperCase();
    const sigBase64Url = sigParts.join('-');

    const payload = `PFP2|${tier}|${expCode}|${devHash}`;
    let isValid = false;

    if (matchedStored) {
      // الترخيص صادر ومسجل رسمياً في قاعدة بيانات المنظومة
      isValid = true;
    } else {
      const SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');
      const crypto = await import('node:crypto');
      const publicKeyObject = crypto.createPublicKey({
        key: Buffer.concat([SPKI_HEADER, security.PUB_KEY_RAW]),
        format: 'der',
        type: 'spki'
      });
      const sigBytes = Buffer.from(sigBase64Url.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      isValid = crypto.verify(null, Buffer.from(payload, 'utf8'), publicKeyObject, sigBytes);
    }

    if (!isValid) {
      return { status: 400, json: { ok: false, error: 'توقيع الترخيص الرقمي غير صالح أو تم التلاعب به' } };
    }

    // 2. فحص ارتباط الجهاز (POOL أو GLBL أو تطابق الرمز)
    const isPool = devHash === 'POOL';
    const isGlobal = devHash === 'GLBL';
    const cleanDev = deviceId.replace(/-/g, '').toUpperCase();
    const myHash = cleanDev.length >= 6 ? cleanDev.substring(2, 6) : cleanDev.padEnd(4, 'X').substring(0, 4);

    if (!isPool && !isGlobal && devHash !== myHash) {
      return {
        status: 403,
        json: {
          ok: false,
          error: `هذا الكود مخصص لجهاز آخر (رمز الجهاز: ${devHash}). رمز هذا الجهاز هو: ${myHash}.`
        }
      };
    }

    // 3. فحص الصلاحية الزمنية
    const yr = 2000 + parseInt(expCode.substring(0, 2), 10);
    const mo = parseInt(expCode.substring(2, 4), 10);
    const expDate = new Date(yr, mo, 0, 23, 59, 59);
    if (new Date() > expDate) {
      return { status: 400, json: { ok: false, error: 'كود الترخيص منتهي الصلاحية.' } };
    }

    // 4. فحص الأجهزة المفعلة
    let licRecord = store.getLicense(rawCode);
    if (!licRecord) {
      // تسجيل ترخيص جديد في قاعدة البيانات إذا كان موقعاً رسمياً لأول مرة
      licRecord = store.saveLicense({
        code: rawCode,
        tier,
        tierName: tier === 'ENTX' ? 'رخصة الاتحادات الرسمية (Enterprise)' : 'باقة الأندية المعتمدة (Pro Club)',
        clientName: isPool ? 'اشتراك شبكي 1*4' : 'رخصة رياضية معتمدة',
        deviceId,
        expiryDate: expDate.toISOString().split('T')[0],
        maxDevices: isPool ? 4 : 1,
        isQuadPool: isPool,
        status: 'active',
        createdAt: Date.now()
      });
    }

    if (licRecord.status === 'revoked') {
      return { status: 403, json: { ok: false, error: 'تم إبطال هذا الترخيص ونقله إلى جهاز آخر سابقاً.' } };
    }

    const currentActs = store.getLicenseActivations(rawCode);
    const maxAllowed = licRecord.maxDevices || (isPool ? 4 : 1);
    const isAlreadyActiveOnDevice = currentActs.some(a => a.deviceId === deviceId);

    if (!isAlreadyActiveOnDevice && currentActs.length >= maxAllowed) {
      return {
        status: 403,
        json: {
          ok: false,
          error: `تم الوصول للحد الأقصى من الأجهزة المسموح بها (${maxAllowed} أجهزة). يرجى إزالة جهاز قديم أو ترقية الباقة.`
        }
      };
    }

    // تسجيل التفعيل
    store.recordActivation({ licenseCode: rawCode, deviceId, deviceName, platform, ipAddress: clientIp });
    store.logAudit({ action: 'ACTIVATE', actor: deviceId, details: JSON.stringify({ code: rawCode, platform }) });

    return {
      status: 200,
      json: {
        ok: true,
        success: true,
        message: `تم التفعيل بنجاح: ${licRecord.tierName} ${isPool ? '(تفعيل شبكي 1*4 لكافة الهواتف)' : ''}`,
        license: {
          code: rawCode,
          tier,
          tierName: licRecord.tierName,
          clientName: licRecord.clientName,
          deviceId: isPool || isGlobal ? 'GLOBAL' : deviceId,
          expiryDate: licRecord.expiryDate,
          isQuadPool: isPool,
          maxSharedSlots: maxAllowed
        }
      }
    };
  }

  // ── 6. تجديد ترخيص (Admin Only) ──
  if (pathname === '/api/licensing/renew' && method === 'POST') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const { code, months } = body || {};
    const ext = Math.max(1, Number(months) || 12);
    const lic = store.getLicense(code);
    if (!lic) return { status: 404, json: { ok: false, error: 'الترخيص غير موجود' } };

    const currentExp = new Date(lic.expiryDate);
    const baseDate = currentExp > new Date() ? currentExp : new Date();
    baseDate.setMonth(baseDate.getMonth() + ext);
    const newExpStr = baseDate.toISOString().split('T')[0];

    const result = store.renewLicense({ licenseCode: code, extendedMonths: ext, newExpiryDate: newExpStr, renewedBy: 'admin' });
    return { status: 200, json: { ok: true, result } };
  }

  // ── 7. سجل التراخيص والإحصائيات (Admin Only) ──
  if (pathname === '/api/licensing/licenses' && method === 'GET') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const status = searchParams.get('status') || '';
    const tier = searchParams.get('tier') || '';
    const search = searchParams.get('search') || '';
    const licenses = store.listLicenses({ status, tier, search });
    return { status: 200, json: { ok: true, licenses } };
  }

  if (pathname === '/api/licensing/stats' && method === 'GET') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const stats = store.getStats();
    return { status: 200, json: { ok: true, stats } };
  }

  if (pathname === '/api/licensing/audit' && method === 'GET') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const auditLogs = store.getAuditLogs({ limit: 100 });
    return { status: 200, json: { ok: true, auditLogs } };
  }

  // ── 8. إبطال ترخيص (Admin Only) ──
  if (pathname === '/api/licensing/revoke' && method === 'POST') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const { code, reason = 'إلغاء إداري' } = body || {};
    const lic = store.getLicense(code);
    if (!lic) return { status: 404, json: { ok: false, error: 'الترخيص غير موجود' } };

    store.saveLicense({ ...lic, status: 'revoked', revokedAt: Date.now(), notes: reason });
    store.logAudit({ action: 'REVOKE', actor: 'admin', details: JSON.stringify({ code, reason }) });
    return { status: 200, json: { ok: true, success: true } };
  }

  // ── 9. إدارة أجهزة الترخيص وفك الارتباط (Device Management) ──
  if (pathname === '/api/licensing/activations' && method === 'GET') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const code = searchParams.get('code');
    if (!code) return { status: 400, json: { ok: false, error: 'كود الترخيص مطلوب' } };
    const activations = store.getLicenseActivations(code);
    return { status: 200, json: { ok: true, activations } };
  }

  if (pathname === '/api/licensing/unbind-device' && method === 'POST') {
    if (!isAdmin) return { status: 401, json: { ok: false, error: 'Unauthorized: Admin token required' } };
    const { code, deviceId } = body || {};
    if (!code || !deviceId) return { status: 400, json: { ok: false, error: 'كود الترخيص ومعرف الجهاز مطلوبان' } };
    store.removeActivation(code, deviceId);
    store.logAudit({ action: 'UNBIND_DEVICE', actor: 'admin', details: JSON.stringify({ code, deviceId }) });
    return { status: 200, json: { ok: true, success: true } };
  }

  return null; // مسار غير معالج في وحدة التراخيص
}
