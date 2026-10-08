module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { name, phone, unit_type, message, channel } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: '이름과 연락처는 필수입니다.' });

  /* 광고 유입 구분. 허용 값만 받는다(임의 문자열이 source 로 들어가지 않게). */
  const fromToss = channel === 'toss';
  const SOURCE = fromToss ? '토스-한강푸르지오리버프론트' : '한강푸르지오리버프론트';

  /* ── 1. Supabase 저장 ── */
  const SUPABASE_URL = 'https://tctilpuhknxucrlnhlky.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdGlscHVoa254dWNybG5obGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzE3NjQsImV4cCI6MjA5MTcwNzc2NH0._mS10zf3ayR7nbdFxQJHfZS57_tzOakGm-WkyQB8bxU';

  const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/consultations`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      name,
      phone,
      unit_type: unit_type || null,
      message: message || null,
      source: SOURCE
    })
  });

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('Supabase error:', err);
    return res.status(500).json({ error: err });
  }

  /* ── 2. Resend 이메일 알림 ── */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: ['xinkorea@naver.com'],
        subject: `[한강 푸르지오 리버프론트${fromToss ? ' · 토스 광고' : ''}] 새 방문예약 — ${name}`,
        html: `
          <div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#07302C;border-bottom:2px solid #C8A96A;padding-bottom:10px;margin-bottom:16px;">
              한강 푸르지오 리버프론트 · 새 방문예약이 접수되었습니다
            </h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 14px;background:#F2F5F3;font-weight:700;width:30%;border:1px solid #E4E8EE;color:#07302C;">현장</td>
                <td style="padding:10px 14px;border:1px solid #E4E8EE;"><strong style="color:#0E6B62;">한강 푸르지오 리버프론트</strong></td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#F2F5F3;font-weight:700;width:30%;border:1px solid #E4E8EE;color:#07302C;">이름</td>
                <td style="padding:10px 14px;border:1px solid #E4E8EE;">${esc(name)}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#F2F5F3;font-weight:700;border:1px solid #E4E8EE;color:#07302C;">연락처</td>
                <td style="padding:10px 14px;border:1px solid #E4E8EE;">
                  <a href="tel:${esc(phone)}" style="color:#0E6B62;font-weight:700;">${esc(phone)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#F2F5F3;font-weight:700;border:1px solid #E4E8EE;color:#07302C;">관심 타입</td>
                <td style="padding:10px 14px;border:1px solid #E4E8EE;">${esc(unit_type) || '미선택'}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#F2F5F3;font-weight:700;border:1px solid #E4E8EE;color:#07302C;">문의 내용</td>
                <td style="padding:10px 14px;border:1px solid #E4E8EE;white-space:pre-wrap;">${esc(message) || '없음'}</td>
              </tr>
            </table>
            <p style="margin-top:20px;color:#98A0AC;font-size:12px;">
              한강 푸르지오 리버프론트 분양 안내 ·
              <a href="https://hangang-prugio.vercel.app" style="color:#0E6B62;">홈페이지 바로가기</a>
            </p>
          </div>
        `
      })
    });
  } catch (_) {}

  return res.status(200).json({ success: true });
};
