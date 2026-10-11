// 다크 모드: 클릭 → 테마 상태 변경 → <html data-theme> 갱신 (+ 로컬스토리지 저장)

const THEME_STORAGE_KEY = 'theme';
const themeToggle = document.querySelector('.theme-toggle');
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// 로컬스토리지는 사생활 보호 모드 등에서 예외를 던질 수 있어 try/catch로 감싼다
const readSavedTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveTheme = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 저장에 실패해도 현재 화면의 테마 전환은 그대로 동작한다
  }
};

// 저장된 설정이 있으면 그것을, 없으면 시스템 설정(prefers-color-scheme)을 따른다
const getInitialTheme = () => {
  const savedTheme = readSavedTheme();
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }
  return systemDarkQuery.matches ? 'dark' : 'light';
};

// 상태
let currentTheme = getInitialTheme();

// 렌더링: 상태를 화면에 반영
const renderTheme = () => {
  const isDark = currentTheme === 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
};

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  saveTheme(currentTheme);
  renderTheme();
});

// 사용자가 직접 고른 적이 없을 때만 시스템 설정 변경을 따라간다
systemDarkQuery.addEventListener('change', (event) => {
  if (readSavedTheme()) {
    return;
  }
  currentTheme = event.matches ? 'dark' : 'light';
  renderTheme();
});

renderTheme();
