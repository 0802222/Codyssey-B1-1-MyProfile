// 네비게이션: 햄버거 메뉴, 부드러운 스크롤, 스크롤에 따른 헤더/맨 위로 버튼

const NAV_SCROLL_THRESHOLD = 60; // 이 값 이상 스크롤하면 헤더 배경 표시
const SCROLL_TOP_THRESHOLD = 300; // 이 값 이상 스크롤하면 맨 위로 버튼 표시

const header = document.querySelector('.header');
const navMenu = document.querySelector('.nav__menu');
const navToggle = document.querySelector('.nav__toggle');
const anchorLinks = document.querySelectorAll('a[href^="#"]');
const scrollTopButton = document.querySelector('.scroll-top');

// 1) 햄버거 메뉴 토글
const updateToggleLabel = (isOpen) => {
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
};

const closeMenu = () => {
  navMenu.classList.remove('active');
  navToggle.classList.remove('active');
  updateToggleLabel(false);
};

navToggle.addEventListener('click', () => {
  const isOpen = navMenu.classList.toggle('active'); // toggle은 바뀐 뒤의 상태(true/false)를 돌려준다
  navToggle.classList.toggle('active', isOpen);
  updateToggleLabel(isOpen);
});

// 2) 부드러운 스크롤: 앵커의 기본 "순간 이동"을 막고 scrollIntoView로 이동
anchorLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) {
      return;
    }
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    closeMenu();
  });
});

// 3) 스크롤 위치 → 헤더 배경 / 맨 위로 버튼 표시
const handleScroll = () => {
  const { scrollY } = window;

  if (scrollY >= NAV_SCROLL_THRESHOLD) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }

  if (scrollY >= SCROLL_TOP_THRESHOLD) {
    scrollTopButton.classList.add('visible');
  } else {
    scrollTopButton.classList.remove('visible');
  }
};

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll(); // 새로고침으로 중간 위치에서 시작해도 상태를 맞춘다

// 4) 맨 위로 버튼
scrollTopButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
