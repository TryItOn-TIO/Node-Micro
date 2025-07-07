# TryItOn 실시간 통신 서버 (Node.js)

TryItOn 프로젝트의 실시간 통신을 담당하는 Node.js 서버입니다.

## 🎯 서버 역할

- **실시간 채팅**: Socket.IO를 통한 방별 채팅
- **방 관리**: 메모리 기반 방 생성/삭제/입장/퇴장
- **사용자 관리**: 방 내 사용자 상태 관리
- **아바타 동기화**: 의상 착용 결과 실시간 공유

## 🏗️ 아키텍처

```
Frontend (Next.js:3000)
    ↓ REST API (로그인, 데이터)
Spring Boot (8080) ← DB + S3 + JWT

Frontend (Next.js:3000)  
    ↓ Socket.IO (실시간 통신)
Node.js (8081) ← 방 관리 (메모리)
```

**Spring Boot와 Node.js는 서로 통신하지 않음**

## 🚀 실행 방법

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일이 자동으로 설정되어 있습니다:
```
PORT=8081
SOCKET_CORS_ORIGIN=http://localhost:3000
```

### 3. 서버 실행
```bash
npm start
```

### 4. 접속 확인
- HTTP: http://localhost:8081
- Socket.IO: ws://localhost:8081

## 📡 API 엔드포인트

### REST API
- `POST /api/rooms` - 방 생성
- `GET /api/rooms` - 방 목록 조회
- `GET /api/rooms/:roomId` - 특정 방 정보 조회

### Socket.IO 이벤트

#### 클라이언트 → 서버
- `joinRoom` - 방 입장
- `message` - 메시지 전송
- `updateAvatar` - 아바타 업데이트
- `leaveRoom` - 방 나가기

#### 서버 → 클라이언트
- `joinRoomSuccess` - 방 입장 성공
- `joinRoomError` - 방 입장 실패
- `userJoined` - 새 사용자 입장
- `userLeft` - 사용자 퇴장
- `update` - 메시지 수신
- `avatarUpdated` - 아바타 업데이트
- `roomListUpdate` - 방 목록 업데이트

## 🧪 테스트

```bash
# 서버 실행 후 다른 터미널에서
node test-api.js
```

## 🎯 프론트엔드 연동 예시

```typescript
// Socket.IO 연결
const socket = io('http://localhost:8081');

// 방 생성 (REST API)
const response = await fetch('http://localhost:8081/api/rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomName: '내 방',
    creatorName: '사용자명'
  })
});

// 방 입장 (Socket.IO)
socket.emit('joinRoom', {
  roomId: room.id,
  userName: '사용자명',
  userId: 'user123'
});

// 메시지 전송
socket.emit('message', {
  message: '안녕하세요!'
});

// 아바타 업데이트 (Spring Boot 처리 후)
socket.emit('updateAvatar', {
  avatarUrl: 'https://example.com/avatar.jpg',
  productInfo: { id: 1, name: '티셔츠' }
});
```

## 🔧 주요 특징

- **메모리 기반**: 방 정보는 서버 메모리에 저장 (재시작 시 초기화)
- **최대 2명**: 각 방은 최대 2명까지 입장 가능
- **자동 정리**: 빈 방은 자동으로 삭제
- **실시간 동기화**: 모든 이벤트가 실시간으로 동기화
- **CORS 설정**: Next.js 프론트엔드와 연동 가능

## 📝 Commit Convention

| 태그       | 설명                                           |
| ---------- | ---------------------------------------------- |
| `feat`     | 새로운 기능 추가                               |
| `fix`      | 버그 수정                                      |
| `docs`     | 문서 수정 (README 등)                          |
| `style`    | 코드 포맷팅, 세미콜론 누락 등 (기능 변경 없음) |
| `refactor` | 코드 리팩토링 (기능 변경 없음)                 |
| `test`     | 테스트 코드 추가 및 리팩토링                   |
| `chore`    | 빌드 설정, 패키지 매니저 등 기타 변경          |
