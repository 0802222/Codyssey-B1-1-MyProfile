// 문의 폼: 입력 → 유효성 상태(formErrors) 변경 → 에러 메시지 표시/숨김

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MIN_LENGTH = 10;

const contactForm = document.querySelector('.contact-form');
const formSuccess = document.querySelector('.contact-form__success');

// 필드 이름 → 검사 함수. 통과하면 '', 실패하면 에러 문구를 돌려준다
const validators = {
  name: (value) => (value.trim() ? '' : '이름을 입력해 주세요.'),
  email: (value) => {
    if (!value.trim()) {
      return '이메일을 입력해 주세요.';
    }
    return EMAIL_PATTERN.test(value.trim()) ? '' : '이메일 형식이 올바르지 않습니다. (예: name@example.com)';
  },
  message: (value) => {
    if (!value.trim()) {
      return '메시지를 입력해 주세요.';
    }
    return value.trim().length >= MESSAGE_MIN_LENGTH ? '' : `메시지는 ${MESSAGE_MIN_LENGTH}자 이상 입력해 주세요.`;
  },
};

// 상태: 필드별 현재 에러 문구
const formErrors = { name: '', email: '', message: '' };

// 렌더링: 상태에 맞춰 에러 문구와 빨간 테두리를 표시/숨김
const renderFieldError = (field) => {
  const errorMessage = formErrors[field.name];
  const errorElement = document.querySelector(`#${field.id}-error`);
  errorElement.textContent = errorMessage;

  if (errorMessage) {
    field.classList.add('invalid');
    field.setAttribute('aria-invalid', 'true');
  } else {
    field.classList.remove('invalid');
    field.removeAttribute('aria-invalid');
  }
};

const validateField = (field) => {
  formErrors[field.name] = validators[field.name](field.value);
  renderFieldError(field);
  return formErrors[field.name] === '';
};

const hideSuccess = () => {
  formSuccess.textContent = '';
  formSuccess.classList.remove('visible');
};

// input 이벤트는 폼에 한 번만 걸고, 어느 필드에서 왔는지는 event.target으로 구분한다
contactForm.addEventListener('input', (event) => {
  hideSuccess();
  if (event.target.name in validators) {
    validateField(event.target);
  }
});

contactForm.addEventListener('submit', (event) => {
  event.preventDefault(); // 페이지 새로고침(기본 제출 동작) 방지

  const fields = [...contactForm.elements].filter(({ name }) => name in validators);
  const results = fields.map(validateField);
  const firstInvalidIndex = results.indexOf(false);

  if (firstInvalidIndex !== -1) {
    fields[firstInvalidIndex].focus();
    return;
  }

  const { name } = Object.fromEntries(new FormData(contactForm));
  formSuccess.textContent = `${name.trim()}님, 메시지가 정상적으로 접수되었습니다. 감사합니다!`;
  formSuccess.classList.add('visible');
  contactForm.reset();
});
