// Projects: GitHub API 호출 → 상태(loading/success/empty/error) 변경 → 섹션 렌더링

// 주소에 ?user=아이디 를 붙이면 다른 계정으로 빈 상태·에러 상태를 확인할 수 있다
const GITHUB_USERNAME = new URLSearchParams(window.location.search).get('user') || '0802222'; // 주소의 ?user= 값, 없으면 내 아이디
const GITHUB_REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`; // 최근 수정 순, 최대 100개 요청
const ALL_LANGUAGES = '전체'; // 필터에서 "전부 보기"를 뜻하는 값

const projectsFilters = document.querySelector('.projects__filters'); // 언어 필터 버튼이 들어갈 자리
const projectsContent = document.querySelector('.projects__content'); // 카드 / 로딩 / 에러 문구가 들어갈 자리

// 상태: 이 객체만 바꾸고, 화면은 renderProjects()가 상태를 보고 다시 그린다
const projectsState = {
  status: 'loading', // 'loading' | 'success' | 'empty' | 'error'
  repos: [], // 화면에 쓸 저장소 목록
  selectedLanguage: ALL_LANGUAGES, // 지금 선택한 필터
  errorMessage: '', // 실패했을 때 보여 줄 문구
};

const setProjectsState = (nextState) => { // 상태를 바꾸는 유일한 함수
  Object.assign(projectsState, nextState); // 넘겨받은 값만 덮어씀 (나머지는 그대로)
  renderProjects(); // 상태가 바뀌었으니 화면을 다시 그림
};

// 저장소 설명 같은 외부 문자열을 innerHTML에 넣기 전에 태그로 해석되지 않도록 바꾼다
const escapeHTML = (text) => text.replace(/[&<>"']/g, (char) => ({ // 특수문자 5개를 찾아서
  '&': '&amp;', // & → &amp;
  '<': '&lt;', // < → &lt; (태그 시작으로 해석되지 않음)
  '>': '&gt;', // > → &gt;
  '"': '&quot;', // " → &quot; (속성 값이 끊기지 않음)
  "'": '&#39;', // ' → &#39;
}[char])); // 찾은 문자를 위 표에서 골라 바꿈

const getErrorMessage = (status) => { // HTTP 상태 코드에 맞는 에러 문구를 돌려주는 함수
  if (status === 403 || status === 429) { // 요청 한도 초과
    return 'GitHub API 요청 한도(시간당 60회)를 초과했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (status === 404) { // 없는 사용자
    return `GitHub 사용자 "${GITHUB_USERNAME}"를 찾을 수 없습니다.`;
  }
  return `GitHub 서버 응답 오류가 발생했습니다. (HTTP ${status})`; // 그 밖의 서버 오류 (500 등)
};

// API 응답 중 화면에 필요한 값만 꺼내 새 객체로 만든다
// 구조분해: 매개변수 자리에서 저장소 객체를 받아 6개 필드만 변수로 꺼낸다
const toProject = ({ name, description, html_url, language, stargazers_count, updated_at }) => ({
  name, // 저장소 이름 (name: name 을 줄여 쓴 것)
  description: description || '설명이 없습니다.', // 설명이 비어 있으면 기본 문구
  url: html_url, // 저장소 주소
  language: language || '기타', // 언어 정보가 없으면 '기타'
  stars: stargazers_count, // 별 개수
  updatedAt: new Date(updated_at).toLocaleDateString('ko-KR'), // "2026-10-26T..." → "2026. 10. 26."
});

const fetchRepos = async () => { // GitHub API를 호출하는 비동기 함수
  setProjectsState({ status: 'loading', errorMessage: '' }); // 1. 로딩 상태 → 스피너 표시

  try { // 에러가 날 수 있는 코드를 시도
    const response = await fetch(GITHUB_REPOS_URL); // 2. 요청을 보내고 응답이 올 때까지 기다림
    if (!response.ok) { // 상태 코드가 200번대가 아니면 (fetch는 404여도 에러를 던지지 않음)
      throw new Error(getErrorMessage(response.status)); // 직접 에러를 만들어 catch로 보냄
    }

    const data = await response.json(); // 3. 응답 본문(JSON 글자)을 JS 배열로 변환
    const repos = data.filter(({ fork }) => !fork).map(toProject); // 구조분해: 각 저장소에서 fork 여부만 꺼내 포크를 제외

    setProjectsState({ // 4. 성공 → 상태 변경
      status: repos.length > 0 ? 'success' : 'empty', // 저장소가 있으면 success, 없으면 empty
      repos, // 변환한 목록 저장
      selectedLanguage: ALL_LANGUAGES, // 필터는 '전체'로 초기화
    });
  } catch (error) { // 위에서 에러가 나면 여기로 옴
    // fetch 자체가 실패(네트워크 끊김 등)하면 TypeError가 발생한다
    const errorMessage = error instanceof TypeError // 네트워크 에러인지 확인
      ? '네트워크 연결을 확인해 주세요.' // 네트워크 에러 문구
      : error.message; // 아니면 위에서 throw한 HTTP 에러 문구
    setProjectsState({ status: 'error', errorMessage }); // 에러 상태 → 에러 문구 + 다시 시도 버튼
  }
};

// ----- 화면 조각을 만드는 함수들 (템플릿 리터럴) -----

// 구조분해: toProject()가 만든 객체에서 카드에 쓸 값을 꺼낸다
// 백틱 안은 HTML 문자열이라 주석을 넣으면 화면에 그대로 찍히므로 여기에 설명한다
// - 이름 · 설명 · 언어는 외부 문자열이라 escapeHTML로 감싸고, 링크는 새 탭(_blank)으로 연다
const createProjectCard = ({ name, description, url, language, stars, updatedAt }) => `
  <article class="project-card">
    <h3 class="project-card__title">${escapeHTML(name)}</h3>
    <p class="project-card__desc">${escapeHTML(description)}</p>
    <div class="project-card__meta">
      <span>💻 ${escapeHTML(language)}</span>
      <span>⭐ ${stars}</span>
      <span>🕒 ${updatedAt}</span>
    </div>
    <a class="project-card__link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">저장소 보기 →</a>
  </article>
`;

const createFilterButtons = (repos, selectedLanguage) => { // 언어 필터 버튼 HTML을 만드는 함수
  // Set으로 중복 언어를 제거한 뒤 '전체'를 맨 앞에 둔다
  const languages = [ALL_LANGUAGES, ...new Set(repos.map(({ language }) => language))]; // 구조분해: 각 저장소에서 language만 꺼낸다

  return languages.map((language) => { // 언어마다 버튼 하나씩 만듦
    const count = language === ALL_LANGUAGES // '전체' 버튼이면
      ? repos.length // 전체 개수
      : repos.filter((repo) => repo.language === language).length; // 아니면 그 언어인 저장소 개수
    const isActive = language === selectedLanguage; // 지금 선택된 버튼인지

    // 선택된 버튼은 active 클래스 + aria-pressed="true", data-language에 언어 이름을 담아 클릭 때 읽는다
    return `
      <button class="filter-btn ${isActive ? 'active' : ''}" type="button"
        data-language="${escapeHTML(language)}" aria-pressed="${isActive}">
        ${escapeHTML(language)} (${count})
      </button>
    `;
  }).join(''); // 버튼 문자열 배열을 하나의 문자열로 합침
};

// 안내 문구(빈 상태 등)를 감싸는 HTML을 만든다
const createMessage = (text, modifier = '') => `
  <div class="projects__message ${modifier}">
    <p>${text}</p>
  </div>
`;

// ----- 렌더링: 상태 → 화면 -----

const renderProjects = () => { // 상태를 보고 Projects 섹션을 다시 그리는 함수
  const { status, repos, selectedLanguage, errorMessage } = projectsState; // 구조분해: 상태 객체의 값 4개를 한 번에 변수로 꺼낸다

  projectsFilters.innerHTML = status === 'success' // 성공했을 때만
    ? createFilterButtons(repos, selectedLanguage) // 필터 버튼 표시
    : ''; // 그 외에는 비움

  if (status === 'loading') { // 로딩 중이면 스피너 + "로딩 중..." (스피너는 장식이라 aria-hidden)
    projectsContent.innerHTML = `
      <div class="projects__message">
        <div class="spinner" aria-hidden="true"></div>
        <p>로딩 중...</p>
      </div>
    `;
    return; // 여기서 끝냄
  }

  if (status === 'error') { // 에러면 문구 + 다시 시도 버튼
    projectsContent.innerHTML = `
      <div class="projects__message projects__message--error">
        <p><strong>프로젝트를 불러올 수 없습니다.</strong></p>
        <p>${escapeHTML(errorMessage)}</p>
        <button class="btn btn--primary projects__retry" type="button">다시 시도</button>
      </div>
    `;
    return; // 여기서 끝냄
  }

  const visibleRepos = selectedLanguage === ALL_LANGUAGES // '전체'면
    ? repos // 목록 그대로
    : repos.filter(({ language }) => language === selectedLanguage); // 구조분해: language만 꺼내 선택한 언어와 비교

  if (status === 'empty' || visibleRepos.length === 0) { // 보여 줄 저장소가 없으면
    projectsContent.innerHTML = createMessage('표시할 프로젝트가 없습니다.'); // 빈 상태 문구
    return; // 여기서 끝냄
  }

  // 저장소마다 카드 HTML을 만들어(map) 하나로 합친 뒤(join) Grid 안에 넣는다
  projectsContent.innerHTML = `
    <div class="projects__grid">
      ${visibleRepos.map(createProjectCard).join('')}
    </div>
  `;
};

// ----- 이벤트: 버튼은 매번 새로 그려지므로 부모에 한 번만 걸어 둔다 (이벤트 위임) -----

projectsFilters.addEventListener('click', (event) => { // 필터 영역 어디든 클릭하면
  const button = event.target.closest('.filter-btn'); // 클릭한 곳에서 가장 가까운 필터 버튼을 찾음
  if (!button) { // 버튼이 아닌 빈 곳을 눌렀으면
    return; // 무시
  }
  setProjectsState({ selectedLanguage: button.dataset.language }); // data-language 값으로 상태 변경 → 다시 그림
});

projectsContent.addEventListener('click', (event) => { // 카드 영역 어디든 클릭하면
  if (event.target.closest('.projects__retry')) { // 다시 시도 버튼을 눌렀으면
    fetchRepos(); // API를 다시 호출
  }
});

fetchRepos(); // 페이지를 열자마자 저장소 목록을 불러옴
