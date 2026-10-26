// 시연 자동화 스크립트
// 실행: node scripts/demo.mjs
// 1) 코드 규칙을 정적으로 검사하고, 2) 로컬 서버 + Chrome(헤드리스)을 띄워 실제로 클릭·입력하며 기능을 확인한다
// 외부 패키지 없이 Node 내장 기능(http, fs, WebSocket)과 Chrome DevTools Protocol만 사용한다

import { spawn } from 'node:child_process'; // Chrome을 별도 프로세스로 실행하기 위해 사용
import { createServer } from 'node:http'; // 로컬 웹 서버를 만들기 위해 사용
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'; // 파일 읽기·쓰기
import { tmpdir } from 'node:os'; // 임시 폴더 위치를 얻기 위해 사용
import { dirname, extname, join, normalize, resolve } from 'node:path'; // 경로 계산
import { fileURLToPath } from 'node:url'; // 현재 파일 위치를 경로로 바꾸기 위해 사용

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // 저장소 최상위 폴더
const OUTPUT_DIR = join(ROOT, 'demo-output'); // 스크린샷을 저장할 폴더 (.gitignore 대상)
const DEPLOY_URL = 'https://0802222.github.io/Codyssey-B1-1-MyProfile/'; // GitHub Pages 배포 주소
const CHROME_PATH = process.env.CHROME_PATH // 환경 변수로 Chrome 경로를 바꿀 수 있다
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; // 기본값: macOS Chrome 위치

const results = []; // 모든 검사 결과를 모아 두는 배열

// ----- 출력 도우미 -----

const title = (text) => console.log(`\n\x1b[1m\x1b[36m■ ${text}\x1b[0m`); // 굵은 하늘색 제목 출력

const check = (name, passed, detail = '') => { // 검사 하나의 결과를 기록하고 출력
  results.push({ name, passed }); // 마지막 요약을 위해 저장
  const mark = passed ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m'; // 통과는 초록, 실패는 빨강
  console.log(`  ${mark} ${name}${detail ? `  \x1b[90m→ ${detail}\x1b[0m` : ''}`); // 상세 내용은 회색으로
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms)); // ms만큼 기다리는 함수

// ===================================================================
// 1. 정적 검사: 파일을 읽어 과제 규칙을 문자열로 확인
// ===================================================================

const runStaticChecks = () => {
  title('1. 코드 규칙 정적 검사');

  const read = (file) => readFileSync(join(ROOT, file), 'utf8'); // 파일 내용을 문자열로 읽기
  const html = read('index.html'); // 메인 페이지
  const css = read('css/style.css'); // 스타일시트
  const jsFiles = ['theme.js', 'nav.js', 'animation.js', 'form.js', 'projects.js']; // 검사할 JS 파일 목록
  const js = jsFiles.map((file) => read(`js/${file}`)).join('\n'); // JS 전체를 하나로 합침

  const folders = ['index.html', 'css', 'js', 'images'].filter((item) => existsSync(join(ROOT, item))); // 존재하는 항목만 남김
  check('폴더 구조 (index.html, css/, js/, images/)', folders.length === 4, folders.join(', '));

  check('외부 스타일시트 css/style.css 연결', html.includes('href="css/style.css"'));

  const scriptTags = html.match(/<script[^>]*>/g) || []; // 모든 <script> 태그 추출
  const deferCount = scriptTags.filter((tag) => tag.includes('defer')).length; // defer가 붙은 태그 수
  check('JS 파일 모두 defer로 연결', scriptTags.length > 0 && deferCount === scriptTags.length, `${deferCount}/${scriptTags.length}개`);

  const externalScripts = scriptTags.filter((tag) => /src="https?:/.test(tag)); // 외부 주소에서 불러오는 스크립트
  check('외부 라이브러리 미사용 (외부 script 0개)', externalScripts.length === 0);

  check('var 사용 0건', !/\bvar\s/.test(js));
  check('onclick 속성 0건', !/onclick/i.test(html + js));
  check('인라인 style="..." 0건', !/style="/.test(html + js));

  const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'footer']; // 과제가 요구한 시맨틱 태그
  const missingTags = semanticTags.filter((tag) => !html.includes(`<${tag}`) && !js.includes(`<${tag}`)); // 빠진 태그 찾기
  check('시맨틱 태그 6종 사용', missingTags.length === 0, missingTags.length ? `누락: ${missingTags}` : semanticTags.join(', '));

  const sectionIds = ['hero', 'about', 'skills', 'projects', 'contact']; // 필수 섹션 id
  const missingSections = sectionIds.filter((id) => !html.includes(`id="${id}"`)); // 없는 섹션 찾기
  check('필수 섹션 (Hero/About/Skills/Projects/Contact/Footer)', missingSections.length === 0 && html.includes('<footer'));

  const navAnchors = ['about', 'skills', 'projects', 'contact'].filter((id) => html.includes(`class="nav__link" href="#${id}"`)); // 메뉴 앵커
  check('네비게이션 앵커 링크', navAnchors.length === 4, navAnchors.map((id) => `#${id}`).join(' '));

  const images = html.match(/<img[^>]*>/g) || []; // 모든 <img> 태그
  const imagesWithAlt = images.filter((tag) => /alt="[^"]+"/.test(tag)); // 비어 있지 않은 alt가 있는 이미지
  check('모든 이미지에 alt 존재', imagesWithAlt.length === images.length, `${imagesWithAlt.length}/${images.length}개`);

  const labelTargets = [...html.matchAll(/<label[^>]*for="([^"]+)"/g)].map(([, id]) => id); // label의 for 값 목록
  const matchedLabels = labelTargets.filter((id) => html.includes(`id="${id}"`)); // 같은 id를 가진 요소가 있는지
  check('label for ↔ input id 매칭', labelTargets.length === 3 && matchedLabels.length === 3, matchedLabels.join(', '));

  check('CSS 변수 :root 정의', css.includes(':root {'));
  check('다크 모드 변수 [data-theme="dark"] 정의', css.includes('[data-theme="dark"] {'));
  check('브레이크포인트 768px / 1024px', css.includes('min-width: 768px') && css.includes('min-width: 1024px'));
  check('Projects Grid auto-fit + minmax', /repeat\(auto-fit,\s*minmax\(/.test(css));
  check('hover + transition + box-shadow', css.includes(':hover') && css.includes('transition') && css.includes('box-shadow'));

  const jsApis = ['querySelector(', 'querySelectorAll(', 'textContent', 'innerHTML', 'classList.add', 'classList.remove', 'classList.toggle']; // DOM 조작 API
  check('DOM 조작 API 사용', jsApis.every((api) => js.includes(api)), jsApis.join(', '));

  const events = ['click', 'submit', 'scroll', 'input']; // 과제가 요구한 이벤트
  check('이벤트 click / submit / scroll / input', events.every((type) => js.includes(`addEventListener('${type}'`)));
  check('event.preventDefault()', js.includes('event.preventDefault()'));

  const es6 = { // ES6+ 문법별 확인 조건
    '화살표 함수': js.includes('=>'),
    '템플릿 리터럴': js.includes('`'),
    '구조분해 할당': /const \{|\(\{ /.test(js),
    'map / filter / forEach': js.includes('.map(') && js.includes('.filter(') && js.includes('.forEach('),
  };
  Object.entries(es6).forEach(([name, ok]) => check(`ES6+ ${name}`, ok)); // 항목마다 결과 출력

  check('fetch + async/await + try/catch', ['fetch(', 'async', 'await', 'try {', 'catch'].every((word) => js.includes(word)));
};

// ===================================================================
// 2. 네트워크 확인: 배포 사이트와 GitHub API
// ===================================================================

const getRateLimit = async () => { // GitHub API 남은 호출 수 확인 (이 요청 자체는 한도를 쓰지 않는다)
  try {
    const response = await fetch('https://api.github.com/rate_limit'); // 한도 조회 전용 주소
    const { rate } = await response.json(); // 응답에서 rate 객체만 꺼냄
    return rate; // { limit, remaining, reset }
  } catch {
    return null; // 네트워크가 없으면 null
  }
};

const runNetworkChecks = async () => {
  title('2. 배포 · GitHub API 확인');

  try {
    const response = await fetch(DEPLOY_URL); // 배포 주소 요청
    check('GitHub Pages 배포 URL 접속', response.ok, `${DEPLOY_URL} (HTTP ${response.status})`);
  } catch (error) {
    check('GitHub Pages 배포 URL 접속', false, error.message); // 인터넷 연결 문제 등
  }

  const rate = await getRateLimit(); // 남은 호출 수 조회
  if (!rate) {
    check('GitHub API 연결', false, '네트워크 연결을 확인하세요');
    return false; // 이후 브라우저 검사가 실제 API를 쓰지 못함을 알림
  }
  const resetTime = new Date(rate.reset * 1000).toLocaleTimeString('ko-KR'); // 한도가 초기화되는 시각
  check('GitHub API 남은 호출 수', rate.remaining >= 10, `${rate.remaining}/${rate.limit}회 (초기화 ${resetTime})`);
  return rate.remaining >= 10; // 브라우저 검사는 실제 호출을 9번 사용한다
};

// ===================================================================
// 3. 로컬 서버: Live Server 대신 Node 내장 http로 정적 파일 제공
// ===================================================================

const MIME_TYPES = { // 확장자별 Content-Type
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const startServer = () => new Promise((done) => {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); // 주소에서 경로만 추출
    const filePath = normalize(join(ROOT, pathname === '/' ? 'index.html' : pathname)); // 실제 파일 경로로 변환
    if (!filePath.startsWith(ROOT) || !existsSync(filePath)) { // 저장소 밖 접근(../)이나 없는 파일은 차단
      response.writeHead(404).end('Not Found');
      return;
    }
    response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream' }); // 파일 종류 알림
    response.end(readFileSync(filePath)); // 파일 내용 전송
  });
  server.listen(0, '127.0.0.1', () => done(server)); // 포트 0 = 비어 있는 포트를 자동 선택, 내 컴퓨터에서만 접근 가능
});

// ===================================================================
// 4. Chrome 제어: DevTools Protocol(CDP)을 WebSocket으로 직접 호출
// ===================================================================

const launchChrome = async () => {
  if (!existsSync(CHROME_PATH)) { // Chrome이 없으면 경로 안내
    throw new Error(`Chrome을 찾을 수 없습니다: ${CHROME_PATH} (CHROME_PATH 환경 변수로 지정 가능)`);
  }
  const profileDir = mkdtempSync(join(tmpdir(), 'b11-demo-')); // 매번 새 프로필 → 로컬스토리지가 빈 상태로 시작
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', // 화면 없이 실행
    '--remote-debugging-port=0', // 제어용 포트를 자동 선택
    `--user-data-dir=${profileDir}`, // 위에서 만든 임시 프로필 사용
    '--no-first-run', // 첫 실행 안내 화면 생략
    '--no-default-browser-check', // 기본 브라우저 확인 생략
    'about:blank', // 빈 페이지로 시작
  ], { stdio: 'ignore' }); // Chrome 로그는 출력하지 않음

  const portFile = join(profileDir, 'DevToolsActivePort'); // Chrome이 제어 포트를 적어 두는 파일
  for (let i = 0; i < 100 && !existsSync(portFile); i += 1) { // 최대 10초 동안 파일이 생기길 기다림
    await sleep(100);
  }
  const [port] = readFileSync(portFile, 'utf8').split('\n'); // 첫 줄이 포트 번호
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }); // 새 탭 생성
  const { webSocketDebuggerUrl } = await response.json(); // 그 탭을 제어할 WebSocket 주소

  const stop = async () => { // 검사가 끝나면 Chrome 종료 + 임시 프로필 삭제
    const exited = new Promise((done) => chrome.once('exit', done)); // 프로세스가 완전히 끝나는 시점
    chrome.kill();
    await exited; // 종료 전에 지우면 Chrome이 쓰던 파일 때문에 삭제가 실패한다
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  return { webSocketDebuggerUrl, stop };
};

const connectCdp = (wsUrl) => new Promise((done, fail) => {
  const socket = new WebSocket(wsUrl); // Node 22+ 내장 WebSocket
  const pending = new Map(); // 응답을 기다리는 요청: id → { resolve, reject }
  const listeners = new Map(); // 이벤트 구독: 이벤트 이름 → 함수 배열
  let nextId = 0; // 요청마다 붙일 번호

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data); // Chrome이 보낸 JSON 메시지
    if (message.id && pending.has(message.id)) { // 내가 보낸 요청에 대한 응답이면
      const { resolve: ok, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message)); // 실패 응답
      } else {
        ok(message.result); // 성공 응답
      }
      return;
    }
    (listeners.get(message.method) || []).forEach((listener) => listener(message.params)); // 이벤트면 구독자에게 전달
  });

  const send = (method, params = {}) => new Promise((ok, reject) => { // CDP 명령 보내기
    nextId += 1;
    pending.set(nextId, { resolve: ok, reject });
    socket.send(JSON.stringify({ id: nextId, method, params }));
  });

  const on = (method, listener) => { // 이벤트 구독
    listeners.set(method, [...(listeners.get(method) || []), listener]);
  };

  const once = (method) => new Promise((ok) => { // 이벤트를 한 번만 기다리기
    const listener = (params) => {
      listeners.set(method, listeners.get(method).filter((fn) => fn !== listener)); // 한 번 받으면 구독 해제
      ok(params);
    };
    on(method, listener);
  });

  socket.addEventListener('open', () => done({ send, on, once, close: () => socket.close() })); // 연결되면 도구 묶음 반환
  socket.addEventListener('error', () => fail(new Error('Chrome 연결 실패')));
});

// ===================================================================
// 5. 브라우저 시연: README 12. 테스트 표의 항목을 자동으로 수행
// ===================================================================

const runBrowserChecks = async (baseUrl) => {
  const { webSocketDebuggerUrl, stop } = await launchChrome(); // Chrome 실행
  const cdp = await connectCdp(webSocketDebuggerUrl); // 탭에 연결

  // --- 브라우저 조작 도우미 ---

  const evaluate = async (expression) => { // 페이지 안에서 JS를 실행하고 결과를 받음
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text); // 페이지 쪽 에러를 그대로 전달
    }
    return result.value;
  };

  const waitFor = async (expression, timeout = 10000) => { // 조건이 참이 될 때까지 기다림
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) {
        return true;
      }
      await sleep(100); // 0.1초마다 다시 확인
    }
    return false; // 시간 초과
  };

  const navigate = async (path) => { // 페이지 이동 후 load 이벤트까지 대기
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${baseUrl}${path}` });
    await loaded;
  };

  const reload = async () => { // 새로고침 후 load 이벤트까지 대기
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.reload');
    await loaded;
  };

  const setViewport = (width, height, mobile = false) => cdp.send('Emulation.setDeviceMetricsOverride', { // 화면 크기 변경
    width, height, deviceScaleFactor: 1, mobile,
  });

  const screenshot = async (name) => { // 현재 화면을 PNG로 저장
    await sleep(800); // 스크롤 등장 애니메이션(transition)이 끝난 뒤 캡처
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUTPUT_DIR, `${name}.png`), Buffer.from(data, 'base64'));
  };

  const typeInto = async (selector, text) => { // 입력칸을 비우고 실제 키보드 입력처럼 글자를 넣음 (input 이벤트 발생)
    await evaluate(`(() => { const el = document.querySelector('${selector}'); el.focus(); el.select(); })()`);
    await cdp.send('Input.insertText', { text });
  };

  const projectsText = () => evaluate(`document.querySelector('.projects__content').innerText`); // Projects 영역 글자
  const notLoading = `!document.querySelector('.projects__content').innerText.includes('로딩 중')`; // 로딩이 끝났는지
  const cardCount = () => evaluate(`document.querySelectorAll('.project-card').length`); // 카드 개수

  // GitHub API 요청을 가로채는 장치: 로딩 유지 / 403 응답 / 네트워크 끊김을 흉내 낸다
  let interceptMode = null; // null | 'hold' | '403' | 'offline'
  let heldRequestId = null; // 'hold' 모드에서 붙잡아 둔 요청 번호
  cdp.on('Fetch.requestPaused', ({ requestId }) => {
    if (interceptMode === 'hold') {
      heldRequestId = requestId; // 응답을 보내지 않고 붙잡아 둠 → 화면은 로딩 상태 유지
    } else if (interceptMode === '403') {
      cdp.send('Fetch.fulfillRequest', { // 레이트 리밋 초과 응답을 가짜로 돌려줌
        requestId,
        responseCode: 403,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: '*' }, // 브라우저 CORS 검사 통과용
        ],
        body: Buffer.from('{"message":"API rate limit exceeded"}').toString('base64'),
      });
    } else if (interceptMode === 'offline') {
      cdp.send('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' }); // 인터넷 끊김 흉내
    } else {
      cdp.send('Fetch.continueRequest', { requestId }); // 그 외에는 그대로 통과
    }
  });
  const intercept = async (mode) => { // 가로채기 켜기
    interceptMode = mode;
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*api.github.com*' }] });
  };
  const stopIntercept = async () => { // 가로채기 끄기
    interceptMode = null;
    await cdp.send('Fetch.disable');
  };

  try {
    await cdp.send('Page.enable'); // 페이지 이벤트(load 등) 수신 시작
    await cdp.send('Runtime.enable'); // JS 실행 기능 사용
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); // 시스템 테마를 라이트로 고정
    await setViewport(1280, 800); // 데스크톱 크기로 시작

    // ----- 3-1. GitHub API 성공 상태 + 언어 필터 -----
    title('3. GitHub API 연동 (데스크톱 1280px)');

    await navigate('/'); // 메인 페이지 열기
    await waitFor(notLoading); // 로딩 끝날 때까지 대기
    const total = await cardCount(); // 카드 개수
    const allLabel = await evaluate(`document.querySelector('.filter-btn')?.innerText.trim() || ''`); // '전체 (N)' 버튼 글자
    check('성공 상태: 카드 리스트 렌더링', total > 0, `카드 ${total}개, 필터 "${allLabel}"`);
    await screenshot('01-desktop-hero');

    const filter = await evaluate(`(() => { // 두 번째 필터 버튼(첫 번째 언어)을 클릭
      const button = document.querySelectorAll('.filter-btn')[1];
      if (!button) return null;
      button.click();
      return { language: button.dataset.language, label: button.innerText.trim() };
    })()`);
    if (filter) {
      const filtered = await evaluate(`(() => { // 필터 결과 확인: 카드 언어가 모두 선택한 언어인지
        const cards = [...document.querySelectorAll('.project-card')];
        const allMatch = cards.every((card) => card.querySelector('.project-card__meta span').innerText.includes(${JSON.stringify(filter.language)}));
        const pressed = [...document.querySelectorAll('.filter-btn[aria-pressed="true"]')].map((b) => b.dataset.language);
        return { count: cards.length, allMatch, pressed };
      })()`);
      const expected = Number(filter.label.match(/\((\d+)\)/)?.[1]); // 버튼에 적힌 개수
      check('[보너스] 언어 필터 (filter)', filtered.allMatch && filtered.count === expected && filtered.pressed.length === 1,
        `"${filter.label}" 클릭 → 카드 ${filtered.count}개, 모두 ${filter.language}`);
      await evaluate(`document.querySelector('.filter-btn').click()`); // 다시 '전체'로 되돌림
    } else {
      check('[보너스] 언어 필터 (filter)', false, '필터 버튼이 없습니다');
    }

    // ----- 3-2. 로딩 / 에러 / 빈 상태 -----
    await intercept('hold'); // API 응답을 붙잡아 로딩 상태를 유지
    await navigate('/');
    const loadingShown = await waitFor(`document.querySelector('.spinner') && document.querySelector('.projects__content').innerText.includes('로딩 중...')`);
    await evaluate(`document.querySelector('#projects').scrollIntoView({ behavior: 'instant' })`); // Projects 영역으로 이동
    await screenshot('02-state-loading');
    check('로딩 상태: 스피너 + "로딩 중..."', loadingShown);
    if (heldRequestId) {
      await cdp.send('Fetch.continueRequest', { requestId: heldRequestId }); // 붙잡았던 요청을 풀어 줌
    }
    await stopIntercept();
    check('로딩 → 성공 전환', await waitFor(`document.querySelectorAll('.project-card').length > 0`), `카드 ${await cardCount()}개`);

    await intercept('403'); // 레이트 리밋 상황 흉내
    await navigate('/');
    await waitFor(notLoading);
    let text = await projectsText();
    check('에러 상태 (403 레이트 리밋)', text.includes('프로젝트를 불러올 수 없습니다') && text.includes('시간당 60회'), text.split('\n')[2] || text);

    await intercept('offline'); // 인터넷 끊김 흉내
    await evaluate(`document.querySelector('.projects__retry').click()`); // 다시 시도 클릭
    await waitFor(`document.querySelector('.projects__content').innerText.includes('네트워크')`);
    text = await projectsText();
    await evaluate(`document.querySelector('#projects').scrollIntoView({ behavior: 'instant' })`);
    await screenshot('03-state-error');
    check('에러 상태 (네트워크 끊김) + 다시 시도 버튼', text.includes('네트워크 연결을 확인해 주세요') && text.includes('다시 시도'));

    await stopIntercept(); // 인터넷 복구
    await evaluate(`document.querySelector('.projects__retry').click()`); // 다시 시도
    check('다시 시도 → 성공 복구', await waitFor(`document.querySelectorAll('.project-card').length > 0`), `카드 ${await cardCount()}개`);

    await navigate('/?user=this-user-should-not-exist-b11'); // 없는 계정
    await waitFor(notLoading);
    text = await projectsText();
    check('에러 상태 (404 없는 사용자)', text.includes('찾을 수 없습니다'), '?user=this-user-should-not-exist-b11');

    await navigate('/?user=ghost'); // 저장소가 0개인 계정
    await waitFor(notLoading);
    text = await projectsText();
    await evaluate(`document.querySelector('#projects').scrollIntoView({ behavior: 'instant' })`);
    await screenshot('04-state-empty');
    check('빈 상태: "표시할 프로젝트가 없습니다"', text.includes('표시할 프로젝트가 없습니다'), '?user=ghost');

    // ----- 4. 스크롤 인터랙션 -----
    title('4. 스크롤 인터랙션 (데스크톱 1280px)');

    await navigate('/');
    await waitFor(notLoading);

    await evaluate(`window.scrollTo({ top: 50, behavior: 'instant' })`); // 50px 스크롤
    await sleep(200); // scroll 이벤트 처리 대기
    const headerAt50 = await evaluate(`document.querySelector('.header').classList.contains('scrolled')`);
    await evaluate(`window.scrollTo({ top: 100, behavior: 'instant' })`); // 100px 스크롤
    const headerAt100 = await waitFor(`document.querySelector('.header').classList.contains('scrolled')`, 2000);
    check('헤더 배경 변경 (기준 60px)', !headerAt50 && headerAt100, '50px: 없음, 100px: .scrolled');

    const topButtonAt100 = await evaluate(`document.querySelector('.scroll-top').classList.contains('visible')`);
    await evaluate(`window.scrollTo({ top: 400, behavior: 'instant' })`); // 400px 스크롤
    const topButtonAt400 = await waitFor(`document.querySelector('.scroll-top').classList.contains('visible')`, 2000);
    await evaluate(`document.querySelector('.scroll-top').click()`); // 맨 위로 버튼 클릭
    const backToTop = await waitFor(`window.scrollY === 0`, 3000);
    check('맨 위로 버튼 (기준 300px)', !topButtonAt100 && topButtonAt400 && backToTop, '100px: 숨김, 400px: 보임, 클릭 후 scrollY 0');

    await evaluate(`document.querySelector('.nav__link[href="#projects"]').click()`); // 메뉴의 Projects 클릭
    await sleep(100);
    const midScroll = await evaluate(`Math.round(window.scrollY)`); // 이동 도중 위치 (부드럽게 움직이는 중인지 확인용)
    const arrived = await waitFor(`Math.abs(document.querySelector('#projects').getBoundingClientRect().top - document.querySelector('.header').offsetHeight) < 2`, 3000);
    const finalScroll = await evaluate(`Math.round(window.scrollY)`); // 도착 위치
    const noHash = await evaluate(`location.hash === ''`); // 주소에 #이 붙지 않았는지
    check('부드러운 스크롤 (메뉴 → Projects)', arrived && noHash, `0 → ${midScroll}(이동 중) → ${finalScroll}px, 주소에 # 없음`);

    await evaluate(`document.querySelector('#contact').scrollIntoView({ behavior: 'instant' })`); // Contact까지 스크롤
    check('스크롤 애니메이션 (threshold 0.2)', await waitFor(`document.querySelector('.contact-form').classList.contains('is-visible')`, 3000), '폼에 .is-visible 추가');

    const typingDone = await evaluate(`document.querySelector('.hero__typing').classList.contains('done')`); // 타이핑 완료 여부
    const typingText = await evaluate(`document.querySelector('.hero__typing').textContent`);
    check('[보너스] 타이핑 효과', typingDone && typingText.length > 0, `"${typingText}"`);

    // ----- 5. 다크 모드 -----
    title('5. 다크 모드 + 로컬스토리지');

    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    const before = await evaluate(`document.documentElement.dataset.theme`); // 클릭 전 테마
    await evaluate(`document.querySelector('.theme-toggle').click()`); // 토글 클릭
    const after = await evaluate(`document.documentElement.dataset.theme`); // 클릭 후 테마
    const saved = await evaluate(`localStorage.getItem('theme')`); // 저장된 값
    check('토글 클릭 → 테마 전환', before === 'light' && after === 'dark', `${before} → ${after}`);
    check('로컬스토리지 저장', saved === 'dark', `localStorage.theme = "${saved}"`);

    await reload(); // 새로고침
    await waitFor(notLoading);
    const afterReload = await evaluate(`document.documentElement.dataset.theme`);
    await screenshot('05-dark-desktop');
    check('새로고침 후에도 유지', afterReload === 'dark', `새로고침 후 ${afterReload}`);

    await evaluate(`localStorage.removeItem('theme')`); // 저장값을 지우고
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }); // 시스템을 다크로 변경
    await reload(); // 처음 방문한 것처럼 다시 열기
    await waitFor(notLoading);
    const systemTheme = await evaluate(`document.documentElement.dataset.theme`); // 저장값 없이 정해진 테마
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); // 시스템을 라이트로 되돌림
    check('[보너스] 시스템 다크 모드 감지', systemTheme === 'dark', `저장값 없음 + 시스템 다크 → ${systemTheme}`);

    // ----- 6. 반응형 + 햄버거 메뉴 -----
    title('6. 반응형 + 햄버거 메뉴');

    const isShown = (selector) => `getComputedStyle(document.querySelector('${selector}')).display !== 'none'`; // 보이는지 판정식

    const desktopMenu = await evaluate(isShown('.nav__menu')); // 데스크톱: 메뉴 보임
    const desktopToggle = await evaluate(isShown('.nav__toggle')); // 데스크톱: 햄버거 숨김
    const projectColumns = await evaluate(`getComputedStyle(document.querySelector('.projects__grid')).gridTemplateColumns.split(' ').length`); // 카드 열 수
    check('데스크톱 1280px: 메뉴 표시, 햄버거 숨김', desktopMenu && !desktopToggle, `Projects 카드 ${projectColumns}열`);

    await setViewport(800, 1000); // 태블릿 크기
    const tabletColumns = await evaluate(`getComputedStyle(document.querySelector('.projects__grid')).gridTemplateColumns.split(' ').length`);
    check('태블릿 800px: 메뉴 표시', await evaluate(isShown('.nav__menu')), `Projects 카드 ${tabletColumns}열`);

    await setViewport(375, 812, true); // 모바일 크기
    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    const mobileColumns = await evaluate(`getComputedStyle(document.querySelector('.projects__grid')).gridTemplateColumns.split(' ').length`);
    const mobileMenu = await evaluate(isShown('.nav__menu')); // 모바일: 메뉴 숨김
    const mobileToggle = await evaluate(isShown('.nav__toggle')); // 모바일: 햄버거 보임
    await screenshot('06-mobile-hero');
    check('모바일 375px: 메뉴 숨김, 햄버거 표시', !mobileMenu && mobileToggle, `Projects 카드 ${mobileColumns}열`);

    await evaluate(`document.querySelector('.nav__toggle').click()`); // 햄버거 클릭
    const opened = await evaluate(`document.querySelector('.nav__menu').classList.contains('active') && ${isShown('.nav__menu')}`);
    await screenshot('07-mobile-menu');
    await evaluate(`document.querySelector('.nav__toggle').click()`); // 다시 클릭
    const closed = await evaluate(`!document.querySelector('.nav__menu').classList.contains('active') && !(${isShown('.nav__menu')})`);
    check('햄버거 메뉴 토글 (classList.toggle)', opened && closed, '클릭 → 열림(.active), 다시 클릭 → 닫힘');

    // ----- 7. 문의 폼 -----
    title('7. 문의 폼 유효성 검사');

    await setViewport(1280, 800); // 데스크톱으로 복귀
    await evaluate(`document.querySelector('#contact').scrollIntoView({ behavior: 'instant' })`);
    const errorOf = (id) => evaluate(`document.querySelector('#${id}-error').textContent`); // 필드 아래 에러 문구

    await evaluate(`document.querySelector('.contact-form__submit').click()`); // 빈 폼 제출
    const emptyErrors = await Promise.all(['name', 'email', 'message'].map(errorOf)); // 세 필드 에러 문구
    const focused = await evaluate(`document.activeElement.id`); // 포커스 위치
    await screenshot('08-form-error');
    check('빈 폼 제출 차단 (필수값)', emptyErrors.every(Boolean) && focused === 'name', `${emptyErrors.join(' / ')} · 포커스: ${focused}`);

    await typeInto('#name', '김평가'); // 이름 입력
    check('입력하면 에러 즉시 사라짐 (input 이벤트)', (await errorOf('name')) === '', '이름 입력 → 이름 에러 사라짐');

    await typeInto('#email', 'test@'); // 잘못된 이메일
    const emailError = await errorOf('email');
    await typeInto('#email', 'test@example.com'); // 올바른 이메일
    check('이메일 형식 검증', emailError.includes('형식') && (await errorOf('email')) === '', `"test@" → ${emailError}`);

    await typeInto('#message', '짧은 글'); // 4자 메시지
    const messageError = await errorOf('message');
    check('메시지 길이 검증 (10자 이상)', messageError.includes('10자'), `"짧은 글" → ${messageError}`);

    await typeInto('#message', '과제 잘 봤습니다. 연락 주세요!'); // 올바른 메시지
    const urlBefore = await evaluate(`location.href`);
    await evaluate(`document.querySelector('.contact-form__submit').click()`); // 제출
    const success = await evaluate(`document.querySelector('.contact-form__success').textContent`); // 성공 문구
    const cleared = await evaluate(`['name', 'email', 'message'].every((id) => document.querySelector('#' + id).value === '')`); // 입력칸 비워졌는지
    const samePage = (await evaluate(`location.href`)) === urlBefore; // 페이지 이동이 없었는지 (preventDefault)
    await screenshot('09-form-success');
    check('제출 성공 메시지 + preventDefault', success.includes('김평가님') && cleared && samePage, success);

    // ----- 콘솔 에러 -----
    const consoleErrors = []; // 페이지에서 발생한 JS 에러 모음
    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => consoleErrors.push(exceptionDetails.text));
    await navigate('/');
    await waitFor(notLoading);
    await setViewport(1280, 2400); // 페이지 전체가 보이도록 세로를 늘림
    await evaluate(`document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'))`); // 캡처용으로 모든 섹션 표시
    await screenshot('10-desktop-full');
    title('8. 콘솔');
    check('콘솔 JS 에러 0건', consoleErrors.length === 0, consoleErrors.join(' | ') || '에러 없음');
  } finally {
    cdp.close(); // 연결 종료
    await stop(); // Chrome 종료
  }
};

// ===================================================================
// 실행 순서
// ===================================================================

const main = async () => {
  console.log('\x1b[1mB1-1 포트폴리오 시연 자동화\x1b[0m');

  runStaticChecks(); // 1. 정적 검사
  const apiAvailable = await runNetworkChecks(); // 2. 배포·API 확인

  if (apiAvailable) {
    mkdirSync(OUTPUT_DIR, { recursive: true }); // 스크린샷 폴더 생성
    const server = await startServer(); // 로컬 서버 시작
    const { port } = server.address(); // 자동 선택된 포트
    console.log(`\n  로컬 서버: http://127.0.0.1:${port}`);
    try {
      await runBrowserChecks(`http://127.0.0.1:${port}`); // 3~8. 브라우저 시연
    } catch (error) {
      check('브라우저 시연', false, error.message); // 중간에 실패해도 요약은 출력
    } finally {
      server.close(); // 서버 종료
    }
  } else {
    console.log('\n  ⚠️  GitHub API 호출 한도가 부족하거나 네트워크가 없어 브라우저 시연을 건너뜁니다.');
  }

  const failed = results.filter(({ passed }) => !passed); // 실패 항목만 추림
  title('요약');
  console.log(`  통과 ${results.length - failed.length} / 전체 ${results.length}`);
  failed.forEach(({ name }) => console.log(`  \x1b[31m실패: ${name}\x1b[0m`));
  if (apiAvailable) {
    console.log(`  스크린샷: demo-output/ 폴더`);
  }
  const rate = await getRateLimit(); // 시연 후 남은 API 호출 수
  if (rate) {
    console.log(`  GitHub API 남은 호출 수: ${rate.remaining}/${rate.limit}회`);
  }
  process.exitCode = failed.length ? 1 : 0; // 실패가 있으면 종료 코드 1
};

main();
