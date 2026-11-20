/**
 * اختبارات خدمة مساحات العمل المستقلة — PHASE 3.1 «العمل المستقل»
 * تعمل في بيئة Node: الخدمة تسقط تلقائياً إلى البديل في الذاكرة (حارس window/localStorage).
 * تُستخدم أسماء فريدة لكل اختبار لتجنب تداخل حالة الـ singleton بين الاختبارات.
 */
import { describe, it, expect } from 'vitest';
import {
  standaloneWorkspaceService,
  type StandaloneWorkspace,
} from '../src/services/standaloneWorkspaceService';
import type { JudgeAssignment } from '../src/services/judgesAssignmentService';

const svc = standaloneWorkspaceService;

let seq = 0;
const uniq = (base: string): string => `${base}-${Date.now()}-${++seq}`;

const makeInput = () => ({
  nameAr: uniq('مساحة مستقلة'),
  competitionTitleAr: uniq('لقاء مفتوح'),
  venue: 'ملعب 5 جويلية 1985',
  date: '2026-04-18',
});

describe('PHASE 3.1: Standalone Workspace Service (العمل المستقل بلا حساب رابطة)', () => {
  it('create → list ordering by updatedAt; ids STW-*; leagueId undefined; isStandalone true', () => {
    const nameA = uniq('مساحة ألفا');
    const a = svc.createWorkspace({ ...makeInput(), nameAr: nameA });
    const b = svc.createWorkspace(makeInput());

    expect(a.id).toMatch(/^STW-/);
    expect(b.id).toMatch(/^STW-/);
    expect(a.isStandalone).toBe(true);
    expect(a.leagueId).toBeUndefined();
    expect(a.disciplines).toEqual([]);
    expect(a.athletes).toEqual([]);

    // نرفع updatedAt للمساحة ألفا لتصبح الأحدث رغم أن بيتا أُنشئت بعدها
    const bumped = svc.updateWorkspace(a.id, { notes: 'تحديث لاحق' });
    expect(bumped).not.toBeNull();

    const list: StandaloneWorkspace[] = svc.listWorkspaces();
    const idxA = list.findIndex((w) => w.id === a.id);
    const idxB = list.findIndex((w) => w.id === b.id);
    expect(idxA).toBeGreaterThan(-1);
    expect(idxB).toBeGreaterThan(-1);
    expect(idxA).toBeLessThan(idxB); // الأحدث تحديثاً أولاً
    expect(list[0]!.nameAr).toBe(nameA);
  });

  it('addAthlete dedups by bib (second add → null); removeAthlete works', () => {
    const ws = svc.createWorkspace(makeInput());
    const first = svc.addAthlete(ws.id, {
      bib: '101',
      fullName: 'محمد بلقاسم',
      clubName: 'نادي الوئام',
      categoryAge: 'U20',
      gender: 'M',
    });
    expect(first).not.toBeNull();
    expect(first!.id).toMatch(/^STA-/);
    expect(first!.bib).toBe('101');

    expect(svc.addAthlete(ws.id, { bib: '101', fullName: 'آخر بنفس الصدرية' })).toBeNull();
    const second = svc.addAthlete(ws.id, { bib: '102', fullName: 'سارة قاسمي', gender: 'F' });
    expect(second).not.toBeNull();

    expect(svc.addAthlete('STW-does-not-exist', { bib: '999', fullName: 'غريب' })).toBeNull();

    expect(svc.removeAthlete(ws.id, first!.id)).toBe(true);
    const after = svc.getWorkspace(ws.id)!;
    expect(after.athletes.map((x) => x.bib)).toEqual(['102']);
    expect(svc.removeAthlete(ws.id, first!.id)).toBe(false);
  });

  it('addDiscipline dedups by nameAr; buildLocalAssignment returns FULL JudgeAssignment (or null)', () => {
    const ws = svc.createWorkspace(makeInput());
    const discName = uniq('وثب طويل');
    const disc = svc.addDiscipline(ws.id, discName, 'jumps_horizontal', [
      'chief_field_jumps',
      'field_judge_jumps',
    ]);
    expect(disc).not.toBeNull();
    expect(disc!.id).toMatch(/^SDS-/);
    expect(svc.addDiscipline(ws.id, discName, 'throws', ['field_judge_throws'])).toBeNull();

    const fresh = svc.getWorkspace(ws.id)!;
    const assignment: JudgeAssignment | null = svc.buildLocalAssignment(
      fresh,
      disc!.id,
      'Ahmed Standalone',
      'photo_finish_operator',
    );
    expect(assignment).not.toBeNull();
    const asg = assignment!;
    expect(asg.id).toMatch(/^ASG-STW-/);
    expect(asg.competitionId).toBe(ws.id);
    expect(asg.leagueId).toBeUndefined(); // عزل صريح
    expect(asg.dutyCode).toBe(`LOCAL-${ws.id}`);
    expect(asg.status).toBe('active');
    expect(asg.assignmentStatus).toBe('active');
    expect(asg.assignedBy).toBe('local');
    expect(asg.assignmentRole).toBe('standalone');
    expect(asg.judgeId).toBe('JUD-LOCAL-ahmed-standalone');
    expect(asg.judgeName).toBe('Ahmed Standalone');
    expect(typeof asg.judgeGrade).toBe('string');
    expect(asg.disciplineId).toBe(disc!.id);
    expect(asg.disciplineNameAr).toBe(disc!.nameAr);
    expect(asg.date).toBe(fresh.date);
    expect(asg.venue).toBe(fresh.venue);
    expect(asg.scheduledStartTime).toBe(`${fresh.date}T00:00:00.000Z`);
    expect(asg.scheduledEndTime).toBe(`${fresh.date}T23:59:59.999Z`);
    expect(asg.permissions).toEqual({
      canRecord: true,
      canEdit: true,
      canCertify: false,
      canDelete: true,
      canApprove: false,
    });
    expect(asg.taskTitleAr.length).toBeGreaterThan(0);

    // سلم غير معروف → null
    expect(svc.buildLocalAssignment(fresh, 'SDS-unknown-xyz', 'Ahmed', 'starter')).toBeNull();
  });

  it('export → import round-trip: parse, conflict error without rename, STW-IMP- with rename', () => {
    const ws = svc.createWorkspace(makeInput());
    svc.addAthlete(ws.id, { bib: '7', fullName: 'عمر يحيى', gender: 'M' });
    const disc = svc.addDiscipline(ws.id, uniq('رمي الجلة'), 'throws', ['chief_field_throws']);
    expect(disc).not.toBeNull();

    const json = svc.exportWorkspace(ws.id);
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json!) as Record<string, unknown>;
    expect(parsed['id']).toBe(ws.id);
    expect(parsed['isStandalone']).toBe(true);
    expect('leagueId' in parsed).toBe(false); // التصدير لا يحمل أي أثر للرابطة

    // استيراد بنفس المعرّف دون إعادة تسمية → خطأ تعارض
    const clash = svc.importWorkspace(json!);
    expect(clash.ok).toBe(false);
    expect(typeof clash.error).toBe('string');
    expect(clash.error!.length).toBeGreaterThan(0);

    // استيراد مع onConflictRename → معرّف جديد STW-IMP- و leagueId غير معرّف
    const renamed = svc.importWorkspace(json!, { onConflictRename: true });
    expect(renamed.ok).toBe(true);
    expect(renamed.workspace!.id).toMatch(/^STW-IMP-/);
    expect(renamed.workspace!.leagueId).toBeUndefined();
    expect(renamed.workspace!.isStandalone).toBe(true);
    expect(renamed.workspace!.nameAr).toBe(svc.getWorkspace(ws.id)!.nameAr);

    const fresh = svc.getWorkspace(ws.id)!;
    expect(renamed.workspace!.athletes.length).toBe(fresh.athletes.length);
    expect(renamed.workspace!.disciplines.length).toBe(fresh.disciplines.length);

    // JSON تالف → خطأ
    expect(svc.importWorkspace('::{broken-json').ok).toBe(false);
    // JSON صالح لكنه ليس مساحة عمل STW → خطأ
    expect(svc.importWorkspace(JSON.stringify({ id: 'CMP-1', nameAr: 'x' })).ok).toBe(false);
  });

  it('getIsolationAudit: standaloneCount matches created count; anyLeagueLeak false', () => {
    const before = svc.getIsolationAudit();
    expect(before.namespaces).toEqual(['pfp_standalone_workspaces_v1']);

    const w1 = svc.createWorkspace(makeInput());
    const w2 = svc.createWorkspace(makeInput());
    expect(w1.id).not.toBe(w2.id);

    const after = svc.getIsolationAudit();
    expect(after.standaloneCount).toBe(before.standaloneCount + 2);
    expect(after.anyLeagueLeak).toBe(false);
  });

  it('updateWorkspace bumps updatedAt; deleteWorkspace is permanent (get → null)', () => {
    const ws = svc.createWorkspace({ ...makeInput(), notes: 'ملاحظة أولى' });
    const before = svc.getWorkspace(ws.id)!;

    const updated = svc.updateWorkspace(ws.id, {
      venue: 'مدرجة المجاهد',
      date: '2026-06-01',
      notes: 'ملاحظة معدلة',
    });
    expect(updated).not.toBeNull();
    expect(updated!.venue).toBe('مدرجة المجاهد');
    expect(updated!.nameAr).toBe(before.nameAr); // ما لم يُعدَّل يبقى كما هو
    expect(Date.parse(updated!.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before.updatedAt));
    expect(svc.updateWorkspace('STW-does-not-exist', { venue: 'x' })).toBeNull();

    expect(svc.deleteWorkspace(ws.id)).toBe(true);
    expect(svc.getWorkspace(ws.id)).toBeNull();
    expect(svc.deleteWorkspace(ws.id)).toBe(false);
    expect(svc.listWorkspaces().find((w) => w.id === ws.id)).toBeUndefined();
  });
});
