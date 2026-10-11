// Projects: GitHub API 호출 → 상태(loading/success/empty/error) 변경 → 섹션 렌더링

// 주소에 ?user=아이디 를 붙이면 다른 계정으로 빈 상태·에러 상태를 확인할 수 있다
const GITHUB_USERNAME = new URLSearchParams(window.location.search).get('user') || '0802222';
const GITHUB_REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`;
const ALL_LANGUAGES = '전체';

const projectsFilters = document.querySelector('.projects__filters');
const projectsContent = document.querySelector('.projects__content');

// 상태: 이 객체만 바꾸고, 화면은 renderProjects()가 상태를 보고 다시 그린다
const projectsState = {
  status: 'loading', // 'loading' | 'success' | 'empty' | 'error'
  repos: [],
  selectedLanguage: ALL_LANGUAGES,
  errorMessage: '',
};

const setProjectsState = (nextState) => {
  Object.assign(projectsState, nextState);
  renderProjects();
};

// 저장소 설명 같은 외부 문자열을 innerHTML에 넣기 전에 태그로 해석되지 않도록 바꾼다
const escapeHTML = (text) => text.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const getErrorMessage = (status) => {
  if (status === 403 || status === 429) {
    return 'GitHub API 요청 한도(시간당 60회)를 초과했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (status === 404) {
    return `GitHub 사용자 "${GITHUB_USERNAME}"를 찾을 수 없습니다.`;
  }
  return `GitHub 서버 응답 오류가 발생했습니다. (HTTP ${status})`;
};

// API 응답 중 화면에 필요한 값만 꺼내 새 객체로 만든다
const toProject = ({ name, description, html_url, language, stargazers_count, updated_at }) => ({
  name,
  description: description || '설명이 없습니다.',
  url: html_url,
  language: language || '기타',
  stars: stargazers_count,
  updatedAt: new Date(updated_at).toLocaleDateString('ko-KR'),
});

const fetchRepos = async () => {
  setProjectsState({ status: 'loading', errorMessage: '' });

  try {
    const response = await fetch(GITHUB_REPOS_URL);
    if (!response.ok) {
      throw new Error(getErrorMessage(response.status));
    }

    const data = await response.json();
    const repos = data.filter(({ fork }) => !fork).map(toProject);

    setProjectsState({
      status: repos.length > 0 ? 'success' : 'empty',
      repos,
      selectedLanguage: ALL_LANGUAGES,
    });
  } catch (error) {
    // fetch 자체가 실패(네트워크 끊김 등)하면 TypeError가 발생한다
    const errorMessage = error instanceof TypeError
      ? '네트워크 연결을 확인해 주세요.'
      : error.message;
    setProjectsState({ status: 'error', errorMessage });
  }
};

// ----- 화면 조각을 만드는 함수들 (템플릿 리터럴) -----

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

const createFilterButtons = (repos, selectedLanguage) => {
  // Set으로 중복 언어를 제거한 뒤 '전체'를 맨 앞에 둔다
  const languages = [ALL_LANGUAGES, ...new Set(repos.map(({ language }) => language))];

  return languages.map((language) => {
    const count = language === ALL_LANGUAGES
      ? repos.length
      : repos.filter((repo) => repo.language === language).length;
    const isActive = language === selectedLanguage;

    return `
      <button class="filter-btn ${isActive ? 'active' : ''}" type="button"
        data-language="${escapeHTML(language)}" aria-pressed="${isActive}">
        ${escapeHTML(language)} (${count})
      </button>
    `;
  }).join('');
};

const createMessage = (text, modifier = '') => `
  <div class="projects__message ${modifier}">
    <p>${text}</p>
  </div>
`;

// ----- 렌더링: 상태 → 화면 -----

const renderProjects = () => {
  const { status, repos, selectedLanguage, errorMessage } = projectsState;

  projectsFilters.innerHTML = status === 'success'
    ? createFilterButtons(repos, selectedLanguage)
    : '';

  if (status === 'loading') {
    projectsContent.innerHTML = `
      <div class="projects__message">
        <div class="spinner" aria-hidden="true"></div>
        <p>로딩 중...</p>
      </div>
    `;
    return;
  }

  if (status === 'error') {
    projectsContent.innerHTML = `
      <div class="projects__message projects__message--error">
        <p><strong>프로젝트를 불러올 수 없습니다.</strong></p>
        <p>${escapeHTML(errorMessage)}</p>
        <button class="btn btn--primary projects__retry" type="button">다시 시도</button>
      </div>
    `;
    return;
  }

  const visibleRepos = selectedLanguage === ALL_LANGUAGES
    ? repos
    : repos.filter(({ language }) => language === selectedLanguage);

  if (status === 'empty' || visibleRepos.length === 0) {
    projectsContent.innerHTML = createMessage('표시할 프로젝트가 없습니다.');
    return;
  }

  projectsContent.innerHTML = `
    <div class="projects__grid">
      ${visibleRepos.map(createProjectCard).join('')}
    </div>
  `;
};

// ----- 이벤트: 버튼은 매번 새로 그려지므로 부모에 한 번만 걸어 둔다 (이벤트 위임) -----

projectsFilters.addEventListener('click', (event) => {
  const button = event.target.closest('.filter-btn');
  if (!button) {
    return;
  }
  setProjectsState({ selectedLanguage: button.dataset.language });
});

projectsContent.addEventListener('click', (event) => {
  if (event.target.closest('.projects__retry')) {
    fetchRepos();
  }
});

fetchRepos();
