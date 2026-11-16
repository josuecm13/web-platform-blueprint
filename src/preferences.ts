type Preferences = { density: 'compact' | 'comfortable'; reduceMotion: boolean };

const defaults: Preferences = { density: 'comfortable', reduceMotion: false };

export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem('blueprint-preferences') || '{}');
    return {
      density: saved.density === 'compact' ? 'compact' : 'comfortable',
      reduceMotion: saved.reduceMotion === true,
    };
  } catch {
    return defaults;
  }
}

export function applyPreferences(preferences: Preferences) {
  document.documentElement.dataset.density = preferences.density;
  document.documentElement.dataset.motion = preferences.reduceMotion ? 'reduce' : 'system';
}
