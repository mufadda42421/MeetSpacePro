/**
 * Meeting URL and code extraction and normalization utilities.
 * Ensures consistent room mapping across any link or code representation.
 */

export function extractMeetingCodeFromUrl(urlStr?: string): string | null {
  if (typeof window === 'undefined' && !urlStr) return null;
  const target = urlStr || (typeof window !== 'undefined' ? window.location.href : '');
  if (!target) return null;

  try {
    // 1. Check ?meeting= or &meeting= in query or hash
    const queryMatch = target.match(/[?&#](?:meeting|room|code)=([^&#]+)/i);
    if (queryMatch && queryMatch[1]) {
      return normalizeMeetingCode(decodeURIComponent(queryMatch[1]));
    }

    // 2. Check /meeting/:id or /room/:id
    const pathMatch = target.match(/(?:\/meeting\/|\/room\/)([a-zA-Z0-9_-]+)/i);
    if (pathMatch && pathMatch[1]) {
      return normalizeMeetingCode(pathMatch[1]);
    }

    // 3. If window.location.pathname has code like /abc-defg-hij
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length === 1 && /^[a-zA-Z0-9_-]+$/.test(parts[0])) {
        return normalizeMeetingCode(parts[0]);
      }
    }
  } catch (err) {
    console.warn('Error parsing meeting code from URL:', err);
  }

  return null;
}

export function normalizeMeetingCode(input: string): string {
  if (!input) return '';
  let str = input.trim();

  // If input contains full URL or query parameter
  try {
    if (str.includes('http://') || str.includes('https://') || str.includes('?') || str.includes('#')) {
      const queryMatch = str.match(/[?&#](?:meeting|room|code)=([^&#]+)/i);
      if (queryMatch && queryMatch[1]) {
        str = decodeURIComponent(queryMatch[1]);
      } else {
        const parsed = new URL(str.startsWith('http') ? str : `https://meetspace.app/${str.replace(/^\//, '')}`);
        const paramCode = parsed.searchParams.get('meeting') || parsed.searchParams.get('room') || parsed.searchParams.get('code');
        if (paramCode) {
          str = paramCode;
        } else {
          const pathParts = parsed.pathname.split('/').filter(Boolean);
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart !== 'meeting' && lastPart !== 'room') {
            str = lastPart;
          }
        }
      }
    }
  } catch {
    if (str.includes('meeting=')) {
      str = str.split('meeting=')[1].split('&')[0];
    }
  }

  // Remove hashes, queries, slashes
  str = str.replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '').trim().toLowerCase();

  // Remove any characters other than a-z, 0-9, and hyphen
  str = str.replace(/[^a-z0-9-]/g, '');

  return str;
}

export function toCanonicalRoomKey(meetingCode: string): string {
  const norm = normalizeMeetingCode(meetingCode);
  return norm.replace(/-/g, '');
}

export function formatMeetingDisplayCode(code: string): string {
  const norm = normalizeMeetingCode(code);
  const plain = norm.replace(/-/g, '');
  if (plain.length === 9) {
    return `${plain.slice(0, 3)}-${plain.slice(3, 6)}-${plain.slice(6)}`;
  }
  if (plain.length === 10) {
    return `${plain.slice(0, 3)}-${plain.slice(3, 7)}-${plain.slice(7)}`;
  }
  return norm;
}
