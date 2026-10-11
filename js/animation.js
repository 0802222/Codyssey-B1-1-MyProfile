// 스크롤 애니메이션(Intersection Observer)과 Hero 타이핑 효과

const REVEAL_THRESHOLD = 0.2; // 요소가 20% 이상 보이면 등장
const TYPING_INTERVAL_MS = 90;

// 1) 스크롤 애니메이션
const revealTargets = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(({ isIntersecting, target }) => {
    if (!isIntersecting) {
      return;
    }
    target.classList.add('is-visible');
    observer.unobserve(target); // 한 번 나타난 요소는 더 이상 관찰하지 않는다
  });
}, { threshold: REVEAL_THRESHOLD });

revealTargets.forEach((target) => revealObserver.observe(target));

// 2) 타이핑 효과: HTML에 적힌 문장을 지웠다가 한 글자씩 다시 채운다
const typingTarget = document.querySelector('.hero__typing');
const fullText = typingTarget.textContent;
let typedLength = 0;

const typeNextChar = () => {
  typedLength += 1;
  typingTarget.textContent = fullText.slice(0, typedLength);

  if (typedLength < fullText.length) {
    setTimeout(typeNextChar, TYPING_INTERVAL_MS);
  } else {
    typingTarget.classList.add('done'); // 커서 깜빡임 종료
  }
};

typingTarget.textContent = '';
typeNextChar();
