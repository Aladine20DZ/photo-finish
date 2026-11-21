/**
 * Photo Finish Pro — جلسات غرف المزامنة الخادمية (Durable Room Sessions)
 * ========================================================================
 * يحل مشكلة زوال الملفات على Vercel Serverless: جلسات الغرف تُخزَّن دائماً في
 * Supabase (بمفتاح service_role من الخادم حصراً) عند توفر المتغيرات، وإلا تعمل
 * في الذاكرة برموز عشوائية لكل إقلاع — لا قيمة ثابتة معروفة إطلاقاً
 * (كانت سابقاً 'vercel-session' ثابتة للجميع، وقد أُزيلت).
 */

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cachedClient;
}

function generateRoomToken() {
  return `rs_${crypto.randomBytes(24).toString('base64url')}`;
}

const memorySessions = new Map(); // room -> token (احتياط بلا Supabase)

export async function getOrCreateRoomSession(room) {
  const normalized = String(room || '').trim().toUpperCase();
  if (!normalized) return generateRoomToken();

  const client = getClient();
  if (!client) {
    if (!memorySessions.has(normalized)) memorySessions.set(normalized, generateRoomToken());
    return memorySessions.get(normalized);
  }

  const { data, error } = await client
    .from('pfp_room_sessions')
    .select('session_token')
    .eq('room', normalized)
    .maybeSingle();
  if (!error && data?.session_token) return data.session_token;

  const token = generateRoomToken();
  const { error: upsertError } = await client
    .from('pfp_room_sessions')
    .upsert(
      { room: normalized, session_token: token, created_at: Date.now(), updated_at: Date.now() },
      { onConflict: 'room' }
    );
  if (upsertError) {
    console.warn('[SyncSessions] تعذر حفظ جلسة الغرفة في Supabase — تحويل إلى الذاكرة:', upsertError.message);
    if (!memorySessions.has(normalized)) memorySessions.set(normalized, token);
  }
  return token;
}
