// Konfiguracja wersji produkcyjnej systemu sędziowskiego.
// Adres i klucz publiczny (anon / publishable) z Supabase → Project Settings → API.
// Klucz publiczny może być jawny — dostęp do danych chronią zasady RLS w bazie.
window.TTS_CONFIG = {
  mode: 'live',
  supabaseUrl: '',
  supabaseAnonKey: '',
};
