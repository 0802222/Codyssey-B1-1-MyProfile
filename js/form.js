// 문의 폼: 입력 → 유효성 상태(formErrors) 변경 → 에러 메시지 표시/숨김

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 이메일 형식 정규식: "글자@글자.글자" (공백, @ 중복 불가)
const MESSAGE_MIN_LENGTH = 10; // 메시지 최소 글자 수

const contactForm = document.querySelector('.contact-form'); // 문의 폼 전체
const formSuccess = document.querySelector('.contact-form__success'); // 제출 성공 문구를 넣을 자리

// 필드 이름 → 검사 함수. 통과하면 '', 실패하면 에러 문구를 돌려준다
const validators = { // input의 name 값을 키로 쓰는 객체
  name: (value) => (value.trim() ? '' : '이름을 입력해 주세요.'), // 앞뒤 공백을 빼고 비어 있으면 에러
  email: (value) => { // 이메일 검사
    if (!value.trim()) { // 비어 있으면
      return '이메일을 입력해 주세요.'; // 필수값 에러
    }
    return EMAIL_PATTERN.test(value.trim()) ? '' : '이메일 형식이 올바르지 않습니다. (예: name@example.com)'; // 형식이 맞으면 통과, 아니면 형식 에러
  },
  message: (value) => { // 메시지 검사
    if (!value.trim()) { // 비어 있으면
      return '메시지를 입력해 주세요.'; // 필수값 에러
    }
    return value.trim().length >= MESSAGE_MIN_LENGTH ? '' : `메시지는 ${MESSAGE_MIN_LENGTH}자 이상 입력해 주세요.`; // 10자 이상이면 통과, 아니면 길이 에러
  },
};

// 상태: 필드별 현재 에러 문구
const formErrors = { name: '', email: '', message: '' }; // ''이면 에러 없음

// 렌더링: 상태에 맞춰 에러 문구와 빨간 테두리를 표시/숨김
const renderFieldError = (field) => { // 입력칸 하나의 에러 상태를 화면에 반영하는 함수
  const errorMessage = formErrors[field.name]; // 상태에서 이 칸의 에러 문구를 꺼냄
  const errorElement = document.querySelector(`#${field.id}-error`); // 예: id가 email이면 #email-error 요소를 찾음
  errorElement.textContent = errorMessage; // 에러 문구 표시 (없으면 빈 글자)

  if (errorMessage) { // 에러가 있으면
    field.classList.add('invalid'); // 빨간 테두리
    field.setAttribute('aria-invalid', 'true'); // 스크린 리더에 "잘못된 입력"이라고 알림
  } else { // 에러가 없으면
    field.classList.remove('invalid'); // 빨간 테두리 제거
    field.removeAttribute('aria-invalid'); // 알림 속성 제거
  }
};

const validateField = (field) => { // 입력칸 하나를 검사하는 함수
  formErrors[field.name] = validators[field.name](field.value); // 1. 검사 결과를 상태에 저장
  renderFieldError(field); // 2. 상태를 화면에 반영
  return formErrors[field.name] === ''; // 3. 통과했으면 true, 실패했으면 false
};

const hideSuccess = () => { // 성공 문구를 숨기는 함수
  formSuccess.textContent = ''; // 문구 비우기
  formSuccess.classList.remove('visible'); // 보이게 하던 클래스 제거
};

// input 이벤트는 폼에 한 번만 걸고, 어느 필드에서 왔는지는 event.target으로 구분한다
contactForm.addEventListener('input', (event) => { // 폼 안에서 글자를 입력할 때마다
  hideSuccess(); // 다시 입력을 시작하면 이전 성공 문구를 숨김
  if (event.target.name in validators) { // 검사 대상(name, email, message)인 칸이면
    validateField(event.target); // 그 칸만 바로 검사
  }
});

contactForm.addEventListener('submit', (event) => { // 보내기 버튼을 누르면
  event.preventDefault(); // 페이지 새로고침(기본 제출 동작) 방지

  const fields = [...contactForm.elements].filter(({ name }) => name in validators); // 구조분해: 각 요소에서 name만 꺼내 검사 대상인지 확인
  const results = fields.map(validateField); // 모든 칸을 검사해 [true, false, true] 같은 결과 배열을 만듦
  const firstInvalidIndex = results.indexOf(false); // 처음으로 실패한 칸의 위치 (모두 통과면 -1)

  if (firstInvalidIndex !== -1) { // 실패한 칸이 있으면
    fields[firstInvalidIndex].focus(); // 그 칸으로 커서를 옮겨 바로 고칠 수 있게 함
    return; // 성공 처리를 하지 않고 끝냄
  }

  const { name } = Object.fromEntries(new FormData(contactForm)); // 구조분해: 폼 값 객체 { name, email, message }에서 name만 꺼낸다
  formSuccess.textContent = `${name.trim()}님, 메시지가 정상적으로 접수되었습니다. 감사합니다!`; // 이름을 넣은 성공 문구
  formSuccess.classList.add('visible'); // 성공 문구 보이기
  contactForm.reset(); // 입력칸 비우기 (실제 전송은 하지 않음)
});
