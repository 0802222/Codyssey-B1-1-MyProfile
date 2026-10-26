// 스크롤 애니메이션(Intersection Observer)과 Hero 타이핑 효과

const REVEAL_THRESHOLD = 0.2; // 요소가 20% 이상 보이면 등장
const TYPING_INTERVAL_MS = 90; // 한 글자를 쓰는 간격 (0.09초)

// 1) 스크롤 애니메이션
const revealTargets = document.querySelectorAll('.reveal'); // 등장 효과를 줄 요소 전부 (처음엔 CSS로 투명하게 숨겨져 있음)

const revealObserver = new IntersectionObserver((entries, observer) => { // 요소가 화면에 들어오고 나갈 때 실행될 관찰자
  entries.forEach(({ isIntersecting, target }) => { // 구조분해: entry 객체에서 보이는지 여부와 대상 요소만 꺼낸다
    if (!isIntersecting) { // 아직 화면에 안 들어왔으면
      return; // 아무것도 하지 않음
    }
    target.classList.add('is-visible'); // 클래스를 붙이면 CSS transition으로 서서히 떠오름
    observer.unobserve(target); // 한 번 나타난 요소는 더 이상 관찰하지 않는다
  });
}, { threshold: REVEAL_THRESHOLD }); // 20% 보였을 때 실행하도록 설정

revealTargets.forEach((target) => revealObserver.observe(target)); // 모든 대상을 관찰 시작

// 2) 타이핑 효과: HTML에 적힌 문장을 지웠다가 한 글자씩 다시 채운다
const typingTarget = document.querySelector('.hero__typing'); // Hero 제목 안의 타이핑할 부분
const fullText = typingTarget.textContent; // HTML에 적어 둔 전체 문장을 미리 저장
let typedLength = 0; // 지금까지 쓴 글자 수, 계속 늘어나므로 let

const typeNextChar = () => { // 한 글자를 더 쓰는 함수
  typedLength += 1; // 쓸 글자 수를 1 늘림
  typingTarget.textContent = fullText.slice(0, typedLength); // 앞에서부터 typedLength 글자만 잘라서 표시

  if (typedLength < fullText.length) { // 아직 다 안 썼으면
    setTimeout(typeNextChar, TYPING_INTERVAL_MS); // 90ms 뒤에 자기 자신을 다시 호출
  } else { // 다 썼으면
    typingTarget.classList.add('done'); // 커서 깜빡임 종료
  }
};

typingTarget.textContent = ''; // 처음엔 글자를 비움
typeNextChar(); // 첫 글자부터 타이핑 시작
