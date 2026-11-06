import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { backupService } from '../src/services/backupService';

describe('Stage 9: Automated Backup & Disaster Recovery Tooling', () => {
  it('generates a complete database backup archive with metadata and checksum', async () => {
    const backup = await backupService.generateBackupArchive();
    expect(backup.metadata).toBeDefined();
    expect(backup.metadata.system).toBe('PHOTO FINISH PRO AI');
    expect(backup.metadata.version).toBe('2.0.0-supabase');
    expect(backup.metadata.checksum.startsWith('CHK-')).toBe(true);

    expect(Array.isArray(backup.data.leagues)).toBe(true);
    expect(Array.isArray(backup.data.clubs)).toBe(true);
    expect(Array.isArray(backup.data.athletes)).toBe(true);
    expect(Array.isArray(backup.data.competitions)).toBe(true);
    expect(Array.isArray(backup.data.results)).toBe(true);
    expect(Array.isArray(backup.data.licenses)).toBe(true);
  });

  it('verifies backup CLI script exists and is executable', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/backup-database.mjs');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('PHOTO FINISH PRO AI');
    expect(content).toContain('runBackup');
  });

  it('verifies all user manuals and documentation guides exist', () => {
    const docs = [
      '../docs/SUPABASE_SETUP.md',
      '../docs/ADMIN_GUIDE.md',
      '../docs/COACH_GUIDE.md',
      '../docs/JUDGE_FIELD_GUIDE.md'
    ];

    for (const doc of docs) {
      const fullPath = path.resolve(__dirname, doc);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content.length).toBeGreaterThan(200);
    }
  });
});
