import { Beat } from '../types';

/**
 * Validates whether a beat is an AI placeholder, fake beat, or starter/sample beat.
 * Returns true if the beat is an AI/placeholder/sample beat, false if it's a real human beat.
 */
export function isAIPlaceholderBeat(beat: Partial<Beat> | null | undefined): boolean {
  if (!beat) return true;

  const idLower = (beat.id || '').toLowerCase();
  const titleLower = (beat.title || '').toLowerCase();
  const audioLower = ((beat.audioUrl || '') + ' ' + (beat.watermarkedAudioUrl || '')).toLowerCase();

  if (
    idLower.includes('placeholder') ||
    idLower.includes('ai_') ||
    idLower.includes('sample') ||
    idLower.includes('demo') ||
    idLower.includes('test') ||
    idLower === 'voodoo_magic' ||
    idLower === 'sub_zero_bass' ||
    idLower === 'voodoo_anthem' ||
    idLower === 'night_owl_pack' ||
    idLower === 'dark_portal_pack' ||
    idLower === 'vp-001' ||
    idLower === 'empty' ||
    titleLower.includes('placeholder') ||
    titleLower.includes('ai beat') ||
    titleLower.includes('ai generated') ||
    titleLower.includes('sample beat') ||
    titleLower.includes('example beat') ||
    titleLower.includes('demo beat') ||
    titleLower.includes('test beat') ||
    titleLower.includes('no human beats available') ||
    audioLower.includes('soundhelix.com')
  ) {
    return true;
  }

  return false;
}

/**
 * Generates a URL-safe, clean, human-readable slug from a beat title.
 */
export function generateBeatSlug(title: string): string {
  if (!title) return 'beat';
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '') // remove unnecessary special characters
    .trim()
    .replace(/[\s_-]+/g, '-')     // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '');     // trim leading/trailing hyphens
}

/**
 * Assigns unique and stable slugs to an array of beats to handle duplicates safely.
 */
export function assignBeatSlugs(beats: Beat[]): Beat[] {
  if (!Array.isArray(beats)) return [];
  const slugCounts = new Map<string, number>();
  return beats.map(beat => {
    let baseSlug = generateBeatSlug(beat.title);
    if (!baseSlug) {
      baseSlug = 'beat';
    }
    let slug = baseSlug;
    const count = slugCounts.get(baseSlug) || 0;
    if (count > 0) {
      slug = `${baseSlug}-${count + 1}`;
    }
    slugCounts.set(baseSlug, count + 1);
    return {
      ...beat,
      slug
    };
  });
}

/**
 * Filters an array of beats to only retain genuine human-produced beats.
 */
export function filterHumanBeats(beats: Beat[]): Beat[] {
  if (!Array.isArray(beats)) return [];
  const humanBeats = beats.filter((beat) => !isAIPlaceholderBeat(beat));
  return assignBeatSlugs(humanBeats);
}

/**
 * Robustly downloads an audio track to the user's local device.
 * Handles blob URLs, same-origin, and cross-origin audio links seamlessly.
 */
export async function downloadAudioFile(fileUrl: string, title: string) {
  if (!fileUrl) return;

  const cleanTitle = (title || 'beat-track').replace(/[/\\?%*:|"<>]/g, '-').trim();
  const hasExt = cleanTitle.toLowerCase().endsWith('.mp3') || cleanTitle.toLowerCase().endsWith('.wav');
  const fileName = hasExt ? cleanTitle : `${cleanTitle}.mp3`;

  try {
    // 1. Direct download for Blob or Data URLs
    if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 2. Fetch as blob for remote/local audio files to force browser download prompt
    const res = await fetch(fileUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
  } catch (err) {
    console.warn('Direct blob download attempt failed, attempting fallback download:', err);
  }

  // 3. Fallback direct anchor click
  const a = document.createElement('a');
  a.href = fileUrl;
  a.download = fileName;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

