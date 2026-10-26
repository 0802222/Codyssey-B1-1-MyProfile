// 다크 모드: 클릭 → 테마 상태 변경 → <html data-theme> 갱신 (+ 로컬스토리지 저장)

const THEME_STORAGE_KEY = 'theme'; // 로컬스토리지에 저장할 때 쓰는 키 이름
const themeToggle = document.querySelector('.theme-toggle'); // 헤더의 테마 전환 버튼(🌙/☀️)
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)'); // OS가 다크 모드인지 알려 주는 객체

// 로컬스토리지는 사생활 보호 모드 등에서 예외를 던질 수 있어 try/catch로 감싼다
const readSavedTheme = () => { // 저장해 둔 테마를 읽는 함수
  try { // 에러가 날 수 있는 코드를 시도
    return localStorage.getItem(THEME_STORAGE_KEY); // 'light' / 'dark' / 저장값이 없으면 null
  } catch { // 로컬스토리지 접근이 막힌 경우
    return null; // 저장값이 없는 것으로 처리
  }
};

const saveTheme = (theme) => { // 고른 테마를 저장하는 함수
  try { // 에러가 날 수 있는 코드를 시도
    localStorage.setItem(THEME_STORAGE_KEY, theme); // 'theme' 키에 'light' 또는 'dark' 저장
  } catch {
    // 저장에 실패해도 현재 화면의 테마 전환은 그대로 동작한다
  }
};

// 저장된 설정이 있으면 그것을, 없으면 시스템 설정(prefers-color-scheme)을 따른다
const getInitialTheme = () => { // 페이지를 열었을 때의 테마를 정하는 함수
  const savedTheme = readSavedTheme(); // 1순위: 사용자가 직접 고른 값
  if (savedTheme === 'light' || savedTheme === 'dark') { // 올바른 값이 저장돼 있으면
    return savedTheme; // 그 값을 그대로 사용
  }
  return systemDarkQuery.matches ? 'dark' : 'light'; // 2순위: OS 설정을 따름
};

// 상태
let currentTheme = getInitialTheme(); // 현재 테마 ('light' 또는 'dark'), 클릭할 때마다 바뀌므로 let

// 렌더링: 상태를 화면에 반영
const renderTheme = () => { // currentTheme을 보고 화면을 맞추는 함수
  const isDark = currentTheme === 'dark'; // 다크 모드인지 true/false로 저장
  document.documentElement.setAttribute('data-theme', currentTheme); // <html data-theme="dark"> → CSS 변수 값이 바뀜
  themeToggle.textContent = isDark ? '☀️' : '🌙'; // 버튼 아이콘은 "누르면 바뀔 모드"를 보여 줌
  themeToggle.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환'); // 스크린 리더가 읽을 버튼 이름
};

themeToggle.addEventListener('click', () => { // 테마 버튼을 클릭하면
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark'; // 1. 상태를 반대로 바꿈
  saveTheme(currentTheme); // 2. 새로고침해도 유지되도록 저장
  renderTheme(); // 3. 바뀐 상태를 화면에 반영
});

// 사용자가 직접 고른 적이 없을 때만 시스템 설정 변경을 따라간다
systemDarkQuery.addEventListener('change', (event) => { // OS 다크 모드 설정이 바뀌면
  if (readSavedTheme()) { // 사용자가 직접 고른 값이 있으면
    return; // 그 선택을 우선하고 아무것도 하지 않음
  }
  currentTheme = event.matches ? 'dark' : 'light'; // OS 설정에 맞춰 상태 변경
  renderTheme(); // 화면에 반영
});

renderTheme(); // 페이지를 열자마자 처음 상태로 한 번 그림
