// 네비게이션: 햄버거 메뉴, 부드러운 스크롤, 스크롤에 따른 헤더/맨 위로 버튼

const NAV_SCROLL_THRESHOLD = 60; // 이 값 이상 스크롤하면 헤더 배경 표시
const SCROLL_TOP_THRESHOLD = 300; // 이 값 이상 스크롤하면 맨 위로 버튼 표시

const header = document.querySelector('.header'); // 상단 고정 헤더
const navMenu = document.querySelector('.nav__menu'); // 메뉴 목록 (모바일에서는 숨겨져 있음)
const navToggle = document.querySelector('.nav__toggle'); // 햄버거 버튼 (☰)
const anchorLinks = document.querySelectorAll('a[href^="#"]'); // href가 #으로 시작하는 모든 링크 (페이지 안 이동용)
const scrollTopButton = document.querySelector('.scroll-top'); // 오른쪽 아래 ↑ 버튼

// 1) 햄버거 메뉴 토글
const updateToggleLabel = (isOpen) => { // 메뉴 상태를 스크린 리더용 속성에 반영하는 함수
  navToggle.setAttribute('aria-expanded', String(isOpen)); // 메뉴가 열렸는지 'true' / 'false'로 알림
  navToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기'); // 버튼 이름도 상태에 맞게 변경
};

const closeMenu = () => { // 메뉴를 닫는 함수
  navMenu.classList.remove('active'); // 메뉴 숨김
  navToggle.classList.remove('active'); // 햄버거 모양(X)을 원래대로(☰)
  updateToggleLabel(false); // 닫힘 상태를 알림
};

navToggle.addEventListener('click', () => { // 햄버거 버튼을 클릭하면
  const isOpen = navMenu.classList.toggle('active'); // toggle은 바뀐 뒤의 상태(true/false)를 돌려준다
  navToggle.classList.toggle('active', isOpen); // 버튼도 메뉴와 같은 상태로 맞춤 (☰ ↔ X)
  updateToggleLabel(isOpen); // 열림/닫힘 상태를 알림
});

// 2) 부드러운 스크롤: 앵커의 기본 "순간 이동"을 막고 scrollIntoView로 이동
anchorLinks.forEach((link) => { // 찾은 링크 하나하나에 대해
  link.addEventListener('click', (event) => { // 클릭 이벤트를 등록
    const target = document.querySelector(link.getAttribute('href')); // href 값('#about')을 그대로 선택자로 써서 이동할 섹션을 찾음
    if (!target) { // 해당 섹션이 없으면
      return; // 브라우저 기본 동작에 맡기고 끝냄
    }
    event.preventDefault(); // 순간 이동(기본 동작) 취소
    target.scrollIntoView({ behavior: 'smooth' }); // 대신 부드럽게 스크롤
    closeMenu(); // 모바일에서 메뉴를 눌렀다면 메뉴를 닫음
  });
});

// 3) 스크롤 위치 → 헤더 배경 / 맨 위로 버튼 표시
const handleScroll = () => { // 스크롤할 때마다 실행되는 함수
  const { scrollY } = window; // 구조분해: window.scrollY 값을 같은 이름의 변수로 꺼낸다

  if (scrollY >= NAV_SCROLL_THRESHOLD) { // 60px 이상 내려왔으면
    header.classList.add('scrolled'); // 헤더에 배경과 그림자 추가
  } else { // 맨 위 근처면
    header.classList.remove('scrolled'); // 투명한 헤더로 되돌림
  }

  if (scrollY >= SCROLL_TOP_THRESHOLD) { // 300px 이상 내려왔으면
    scrollTopButton.classList.add('visible'); // 맨 위로 버튼 보이기
  } else { // 300px보다 위면
    scrollTopButton.classList.remove('visible'); // 맨 위로 버튼 숨기기
  }
};

window.addEventListener('scroll', handleScroll, { passive: true }); // passive: 스크롤을 막지 않는다고 알려 스크롤이 버벅이지 않게 함
handleScroll(); // 새로고침으로 중간 위치에서 시작해도 상태를 맞춘다

// 4) 맨 위로 버튼
scrollTopButton.addEventListener('click', () => { // ↑ 버튼을 클릭하면
  window.scrollTo({ top: 0, behavior: 'smooth' }); // 페이지 맨 위(0px)로 부드럽게 이동
});
