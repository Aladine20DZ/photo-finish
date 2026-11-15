import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { verifyAdminLogin } from '../server/security.js';
import { licenseManager } from '../src/services/licenseManager';

describe('Stage 0: Security Remediation & Zero Hardcoded Secrets', () => {
  const originalEnvPassword = process.env.ADMIN_PORTAL_PASSWORD;

  beforeEach(() => {
    // Reset env
    delete process.env.ADMIN_PORTAL_PASSWORD;
  });

  afterEach(() => {
    if (originalEnvPassword !== undefined) {
      process.env.ADMIN_PORTAL_PASSWORD = originalEnvPassword;
    } else {
      delete process.env.ADMIN_PORTAL_PASSWORD;
    }
  });

  describe('Admin Gate Security & Rate Limiting', () => {
    it('rejects legacy hardcoded passwords PFP-ADMIN-2026 and PFP-SecureAdmin-2026', () => {
      process.env.ADMIN_PORTAL_PASSWORD = 'LegitimateSecretPassword2026!';
      const res1 = verifyAdminLogin('PFP-ADMIN-2026', '10.0.0.1');
      expect(res1.success).toBe(false);

      const res2 = verifyAdminLogin('PFP-SecureAdmin-2026', '10.0.0.2');
      expect(res2.success).toBe(false);

      // Verify that the legitimate password actually works
      const legitimateRes = verifyAdminLogin('LegitimateSecretPassword2026!', '10.0.0.3');
      expect(legitimateRes.success).toBe(true);
      expect(legitimateRes.status).toBe(200);
      expect(legitimateRes.adminToken).toBeDefined();
    });

    it('enforces lockout after 5 consecutive failed login attempts', () => {
      process.env.ADMIN_PORTAL_PASSWORD = 'LegitimateSecretPassword2026!';
      const testIp = '192.168.1.99';
      
      // Attempt 5 incorrect logins
      for (let i = 1; i <= 5; i++) {
        const res = verifyAdminLogin('wrong_pass_' + i, testIp);
        expect(res.success).toBe(false);
        expect(res.status).toBe(401);
      }

      // 6th attempt should return 429 rate limit error
      const lockedRes = verifyAdminLogin('any_attempt', testIp);
      expect(lockedRes.success).toBe(false);
      expect(lockedRes.status).toBe(429);
      expect(lockedRes.error).toContain('تم تجاوز الحد المسموح');
    });
  });

  describe('License Activation Zero-Backdoor Enforcement', () => {
    it('strictly rejects any legacy bypass code', async () => {
      const testBypasses = [
        'ALADINE-VIP-2026',
        'AQUACORE-ADMIN-KEY',
        'PRO-ATHLETICS-2026',
        'COACH-CLUB-PRO',
        'FAKE-CODE-1234'
      ];

      for (const code of testBypasses) {
        const res = await licenseManager.activateCode(code);
        expect(res.success).toBe(false);
        expect(res.license).toBeUndefined();
      }
    });
  });

  describe('Static Source Code Scan (Zero Hardcoded Secrets)', () => {
    function scanDirectory(dir: string, forbiddenPatterns: RegExp[]): string[] {
      const violations: string[] = [];
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          if (!file.name.startsWith('.') && file.name !== 'node_modules') {
            violations.push(...scanDirectory(fullPath, forbiddenPatterns));
          }
        } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(content)) {
              violations.push(`${fullPath}: matches ${pattern.toString()}`);
            }
          }
        }
      }
      return violations;
    }

    it('ensures no hardcoded passwords or offline secret salts remain in src/', () => {
      const srcDir = path.resolve(__dirname, '../src');
      const forbidden = [
        /PFP_ATHLETICS_OFFLINE_SECRET_2026_SECURE/,
        /PFP-ADMIN-2026/,
        /PFP-SECUREADMIN-2026/i,
      ];

      const violations = scanDirectory(srcDir, forbidden);
      expect(violations).toEqual([]);
    }, 120000);
  });
});
