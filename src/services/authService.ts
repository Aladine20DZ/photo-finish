/**
 * PHOTO FINISH PRO AI — Authentication & Role-Based Access Control (RBAC) Service (Stage 1)
 * Supports Multi-Factor Authentication (MFA/TOTP), Multi-Tenant League Isolation, and Offline Session Caching.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { UserRole, Database } from '../types/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

const CACHED_PROFILE_KEY = 'pfp_cached_auth_profile_v1';

export class AuthService {
  private cachedProfile: Profile | null = null;

  constructor() {
    this.loadCachedProfile();
  }

  private loadCachedProfile(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(CACHED_PROFILE_KEY);
        if (raw) {
          this.cachedProfile = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Failed to load cached auth profile:', e);
      }
    }
  }

  private setCachedProfile(profile: Profile | null): void {
    this.cachedProfile = profile;
    if (typeof localStorage !== 'undefined') {
      try {
        if (profile) {
          localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
        } else {
          localStorage.removeItem(CACHED_PROFILE_KEY);
        }
      } catch {}
    }
  }

  /**
   * Get currently active user profile (from cache or Supabase)
   */
  public async getCurrentProfile(): Promise<Profile | null> {
    if (!isSupabaseConfigured()) {
      return this.cachedProfile;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        this.setCachedProfile(null);
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        return this.cachedProfile;
      }

      this.setCachedProfile(profile);
      return profile;
    } catch {
      return this.cachedProfile;
    }
  }

  /**
   * Sign in with Email and Password
   */
  public async signIn(email: string, pass: string): Promise<{
    success: boolean;
    profile?: Profile;
    mfaRequired?: boolean;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      // Offline mock authentication fallback
      const mockProfile: Profile = {
        id: 'mock-offline-user-id',
        league_id: 'mock-league-id',
        club_id: null,
        full_name: email.split('@')[0] || 'المستخدم الميداني',
        role: 'league_admin',
        phone: null,
        is_verified: true,
        avatar_url: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.setCachedProfile(mockProfile);
      return { success: true, profile: mockProfile };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check for MFA requirements
      const mfaFactors = await supabase.auth.mfa.listFactors();
      if (mfaFactors.data?.totp && mfaFactors.data.totp.length > 0) {
        const verifiedFactor = mfaFactors.data.totp.find(f => f.status === 'verified');
        if (verifiedFactor) {
          return { success: true, mfaRequired: true };
        }
      }

      const profile = await this.getCurrentProfile();
      return { success: true, profile: profile || undefined };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل تسجيل الدخول' };
    }
  }

  /**
   * Enroll MFA TOTP Authenticator (Google Authenticator, Authy, etc.)
   */
  public async enrollMfaTotp(): Promise<{
    success: boolean;
    factorId?: string;
    qrCodeUri?: string;
    secret?: string;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase غير متصل. تفعيل التحقق بخطوتين (MFA) يتطلب اتصالاً سحابياً نشطاً.'
      };
    }

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Photo Finish Pro AI MFA'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        factorId: data.id,
        qrCodeUri: data.totp.qr_code,
        secret: data.totp.secret
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل تهيئة التحقق بخطوتين' };
    }
  }

  /**
   * Challenge & Verify MFA Code
   */
  public async verifyMfaCode(factorId: string, code: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        return { success: false, error: challenge.error.message };
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim()
      });

      if (verify.error) {
        return { success: false, error: verify.error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'رمز التحقق غير صحيح' };
    }
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    this.setCachedProfile(null);
  }

  // ═══ صلاحيات وأدوار RBAC Helpers ═══

  public hasRole(role: UserRole | undefined, allowedRoles: UserRole[]): boolean {
    if (!role) return false;
    if (role === 'super_admin') return true;
    return allowedRoles.includes(role);
  }

  public canManageLeague(profile: Profile | null): boolean {
    if (!profile) return false;
    return this.hasRole(profile.role, ['super_admin', 'league_admin']);
  }

  public canCoachClub(profile: Profile | null, targetClubId: string): boolean {
    if (!profile) return false;
    if (profile.role === 'super_admin' || profile.role === 'league_admin') return true;
    return profile.role === 'club_coach' && profile.club_id === targetClubId;
  }

  public canJudgeEvent(profile: Profile | null): boolean {
    if (!profile) return false;
    return this.hasRole(profile.role, ['super_admin', 'league_admin', 'chief_judge', 'field_judge', 'timing_operator']);
  }

  public canCertifyResults(profile: Profile | null): boolean {
    if (!profile) return false;
    return this.hasRole(profile.role, ['super_admin', 'league_admin', 'chief_judge']);
  }
}

export const authService = new AuthService();
