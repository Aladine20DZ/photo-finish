/**
 * عدة اختبار المصادقة الخادمية الحقيقية (Stage 1 Harness)
 * ========================================================
 * تحقن بوابة مصادقة تستهلك المعالج الخادمي الفعلي (scrypt + جلسات HMAC موقعة)
 * بدل كلمات المرور المكتوبة قديماً. كل حساب اختبار يُنشأ عبر /api/league/register
 * في مخزن ذاكرة معزول لكل ملف اختبار.
 */

import { handleLeagueAuthRequest } from '../../server/leagueAuthApi.js';
import { resetLeagueAuthStoreForTest } from '../../server/leagueAuthStore.js';
import { portalAuthService, LeagueAuthGateway } from '../../src/services/portalAuthService';

/** كلمة مرور اختبار قوية — تُسجل عبر الخادم حصراً ولا تظهر في أي بذر إنتاج */
export const TEST_LEAGUE_PASSWORD = 'HarnessLeague2026#Pass';

export const SAIDA_ACCOUNT = {
  leagueId: 'lg_saida',
  username: 'saida_admin',
  email: 'lwassaida20@gmail.com',
  password: TEST_LEAGUE_PASSWORD,
  // المرادفات القديمة تُحل على الخادم الآن (كانت مقارنة نصية في الواجهة)
  aliases: ['saida', 'saida@athletic.dz', 'lwas', 'lwas_admin', 'lwassaida20']
};

/** بوابة تستهلك المعالج الخادمي الحقيقي داخل عملية الاختبار */
export function makeRealServerGateway(): LeagueAuthGateway {
  const call = async (pathname: string, body: any) => {
    const res = await handleLeagueAuthRequest({ pathname, method: 'POST', body, clientIp: 'test-harness-ip' });
    if (!res) throw new Error(`League auth endpoint unhandled: ${pathname}`);
    return res.json;
  };
  return {
    async login(req) {
      const data = await call('/api/league/login', req);
      if (!data?.ok) return { success: false, error: data?.error || 'فشل تسجيل الدخول الخادمي' };
      return { success: true, session: data.session };
    },
    async register(req) {
      const data = await call('/api/league/register', req);
      if (!data?.ok) return { success: false, error: data?.error || 'فشل تسجيل الرابطة الخادمي' };
      return { success: true, session: data.session };
    }
  };
}

/** تهيئة معزولة: مخزن حسابات جديد + بوابة خادمية حقيقية + حساب سعيدة المُسجل */
export async function installTestLeagueAuth(): Promise<void> {
  resetLeagueAuthStoreForTest();
  const gateway = makeRealServerGateway();
  portalAuthService.setLeagueAuthGatewayForTests(gateway);
  const reg = await gateway.register(SAIDA_ACCOUNT);
  if (!reg.success) throw new Error(`فشل تجهيز حساب الاختبار الخادمي: ${reg.error}`);
}

/** دخول كحساب سعيدة المعتمد بكلمة مرور الاختبار القوية (عبر الخادم فعلياً) */
export async function loginTestLeague(username = SAIDA_ACCOUNT.username, targetLeagueId: string = SAIDA_ACCOUNT.leagueId) {
  await installTestLeagueAuth();
  return portalAuthService.loginLeague(username, TEST_LEAGUE_PASSWORD, targetLeagueId);
}

/** دخول ببيانات مخصصة (لتجربة كلمات مرور خاطئة أو حسابات غير مسجلة) */
export async function loginLeagueWith(username: string, password: string, targetLeagueId?: string) {
  await installTestLeagueAuth();
  return portalAuthService.loginLeague(username, password, targetLeagueId);
}
