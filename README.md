# TryItOn-server-microservice 
[TryItOn] 마이크로 서비스 노드 레포지토리입니다.
---

## 🎯 Commit Convention

| 태그       | 설명                                           |
| ---------- | ---------------------------------------------- |
| `feat`     | 새로운 기능 추가                               |
| `fix`      | 버그 수정                                      |
| `docs`     | 문서 수정 (README 등)                          |
| `style`    | 코드 포맷팅, 세미콜론 누락 등 (기능 변경 없음) |
| `refactor` | 코드 리팩토링 (기능 변경 없음)                 |
| `test`     | 테스트 코드 추가 및 리팩토링                   |
| `chore`    | 빌드 설정, 패키지 매니저 등 기타 변경          |

💡 **예시**
```bash
git commit -m "feat: 로그인 페이지 UI 구현"
git commit -m "fix: 상품 상세 페이지 오류 수정"
```

## 🚀 프로젝트 실행 방법

### 1. 레포지토리 클론

```bash
git clone https://github.com/TryItOn-TIO/TryItOn-frontend.git
cd TryItOn-frontend
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 브라우저에 접속

http://localhost:3000<br/>
개발 서버가 실행되면 위 주소에서 결과를 확인할 수 있습니다.

### 5. 빌드 및 실행

```bash
npm run build     # 정적 파일 빌드
npm start         # 빌드된 앱 실행
```