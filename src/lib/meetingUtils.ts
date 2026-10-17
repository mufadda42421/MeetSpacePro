/**
 * Meeting URL and code extraction and normalization utilities.
 * Ensures consistent room mapping across any link or code representation.
 */

export function normalizeMeetingCode(input: string): string {
  if (!input) return '';
  let str = input.trim();

  // If input contains full URL or query parameter
  try {
    if (str.includes('http://') || str.includes('https://') || str.includes('?') || str.includes('#')) {
      // Handle hash-based query like /#/?meeting=xyz or /?meeting=xyz
      const queryMatch = str.match(/[?&#]meeting=([^&#]+)/);
      if (queryMatch && queryMatch[1]) {
        str = decodeURIComponent(queryMatch[1]);
      } else {
        const url = new URL(str.startsWith('http') ? str : `https://meetspace.app/${str.replace(/^\//, '')}`);
        const paramCode = url.searchParams.get('meeting');
        if (paramCode) {
          str = paramCode;
        } else {
          const pathParts = url.pathname.split('/').filter(Boolean);
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart !== 'meeting') {
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
    return `${plain.slice(0, 3)}-${plain.slice(3, 7)}-${plain.slice(7)}`;
  }
  if (plain.length === 10) {
    return `${plain.slice(0, 3)}-${plain.slice(3, 7)}-${plain.slice(7)}`;
  }
  return norm;
}
