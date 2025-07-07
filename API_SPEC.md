# TryItOn Node.js 실시간 통신 서버 API 명세서

## 📋 서버 정보
- **Base URL**: `http://localhost:8081`
- **Protocol**: HTTP/1.1, WebSocket
- **CORS**: `http://localhost:3000` 허용

---

## 🔗 REST API

### 1. 방 생성 (초대 링크 포함)
**POST** `/api/rooms`

#### Request
```typescript
interface CreateRoomRequest {
  roomName: string;      // 방 이름 (필수)
  creatorName: string;   // 생성자 이름 (필수)
  maxUsers?: number;     // 최대 인원 (선택, 기본값: 2)
}
```

#### Example Request
```javascript
const response = await fetch('http://localhost:8081/api/rooms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    roomName: '내 방',
    creatorName: '홍길동',
    maxUsers: 2
  })
});
```

#### Response
```typescript
interface CreateRoomResponse {
  success: boolean;
  message: string;
  room: {
    id: string;           // 방 고유 ID
    name: string;         // 방 이름
    creator: string;      // 생성자 이름
    maxUsers: number;     // 최대 인원
    currentUsers: number; // 현재 인원
    users: User[];        // 현재 사용자 목록
    inviteCode: string;   // 초대 코드 (8자리 대문자+숫자)
    inviteLink: string;   // 전체 초대 링크
    createdAt: string;    // 생성 시간 (ISO 8601)
  };
}
```

#### Example Response
```json
{
  "success": true,
  "message": "방이 성공적으로 생성되었습니다.",
  "room": {
    "id": "room_1234567890_abc123",
    "name": "내 방",
    "creator": "홍길동",
    "maxUsers": 2,
    "currentUsers": 0,
    "users": [],
    "inviteCode": "A1B2C3D4",
    "inviteLink": "http://localhost:3000/rooms/A1B2C3D4",
    "createdAt": "2025-07-07T12:00:00.000Z"
  }
}
```

---

### 2. 초대 코드로 방 조회 (새로 추가)
**GET** `/api/rooms/invite/:inviteCode`

#### Request
- **Path Parameter**: `inviteCode` (string) - 8자리 초대 코드

#### Example Request
```javascript
const inviteCode = 'A1B2C3D4';
const response = await fetch(`http://localhost:8081/api/rooms/invite/${inviteCode}`);
const data = await response.json();
```

#### Response
```typescript
interface InviteRoomResponse {
  success: boolean;
  room: {
    id: string;
    name: string;
    creator: string;
    currentUsers: number;
    maxUsers: number;
    inviteCode: string;
    inviteLink: string;
    createdAt: string;
  };
}
```

#### Status Codes
- `200`: 성공
- `404`: 유효하지 않은 초대 링크

---

### 3. 방 목록 조회 (관리자용)
**GET** `/api/rooms`

#### Request
파라미터 없음

#### Example Request
```javascript
const response = await fetch('http://localhost:8081/api/rooms');
const data = await response.json();
```

#### Response
```typescript
interface RoomListResponse {
  success: boolean;
  rooms: {
    id: string;
    name: string;
    creator: string;
    currentUsers: number;
    maxUsers: number;
    inviteCode: string;
    inviteLink: string;
    createdAt: string;
  }[];
}
```

## 🔄 새로운 초대 링크 플로우

### 기존 플로우 (변경 전)
```
방 목록 조회 → 방 선택 → 입장
```

### 새로운 플로우 (변경 후)
```
방 생성 → 초대 링크 생성 → 링크 공유 → 링크로 입장
```

### 구현 예시

#### 1. 방 생성 및 초대 링크 받기
```typescript
const CreateRoomComponent = () => {
  const [roomData, setRoomData] = useState(null);
  
  const handleCreateRoom = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: "내 방",
          creatorName: userName,
          maxUsers: 2
        })
      });
      
      const data = await response.json();
      setRoomData(data.room);
      
      // 생성 후 바로 해당 방으로 이동
      router.push(`/rooms/${data.room.inviteCode}`);
      
    } catch (error) {
      console.error('방 생성 실패:', error);
    }
  };

  return (
    <div>
      <button onClick={handleCreateRoom}>
        방 만들기
      </button>
      
      {roomData && (
        <div>
          <h3>방이 생성되었습니다!</h3>
          <p>초대 링크: {roomData.inviteLink}</p>
          <button onClick={() => navigator.clipboard.writeText(roomData.inviteLink)}>
            링크 복사
          </button>
        </div>
      )}
    </div>
  );
};
```

#### 2. 초대 링크 페이지 구현
```typescript
// pages/rooms/[inviteCode].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const RoomPage = () => {
  const router = useRouter();
  const { inviteCode } = router.query;
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (inviteCode) {
      fetchRoomByInviteCode(inviteCode as string);
    }
  }, [inviteCode]);

  const fetchRoomByInviteCode = async (code: string) => {
    try {
      const response = await fetch(`http://localhost:8081/api/rooms/invite/${code}`);
      
      if (!response.ok) {
        throw new Error('유효하지 않은 초대 링크입니다.');
      }
      
      const data = await response.json();
      setRoomInfo(data.room);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    // Socket.IO로 방 입장
    socket.emit('joinRoom', {
      roomId: roomInfo.id,
      userName: user.name,
      userId: user.id
    });
  };

  if (loading) return <div>방 정보를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div>
      <h2>{roomInfo.name}</h2>
      <p>생성자: {roomInfo.creator}</p>
      <p>현재 인원: {roomInfo.currentUsers}/{roomInfo.maxUsers}</p>
      
      {roomInfo.currentUsers < roomInfo.maxUsers ? (
        <button onClick={handleJoinRoom}>
          방 입장하기
        </button>
      ) : (
        <p>방이 가득 찼습니다.</p>
      )}
    </div>
  );
};
```

#### 3. 전체 통신 플로우
```typescript
// 1. 방 생성 (REST API)
const createRoom = async () => {
  const response = await fetch('http://localhost:8081/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName: '내 방',
      creatorName: user.name
    })
  });
  const { room } = await response.json();
  return room;
};

// 2. 초대 링크 공유
const shareInviteLink = (inviteLink: string) => {
  if (navigator.share) {
    navigator.share({
      title: '방 초대',
      text: '함께 옷을 입어보세요!',
      url: inviteLink
    });
  } else {
    navigator.clipboard.writeText(inviteLink);
    alert('링크가 복사되었습니다!');
  }
};

// 3. 초대 링크로 방 정보 조회
const getRoomByInviteCode = async (inviteCode: string) => {
  const response = await fetch(`http://localhost:8081/api/rooms/invite/${inviteCode}`);
  const { room } = await response.json();
  return room;
};

// 4. Socket.IO로 방 입장
const joinRoom = (roomId: string) => {
  socket.emit('joinRoom', {
    roomId,
    userName: user.name,
    userId: user.id
  });
};
```

---

## 📡 Socket.IO Events

### Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8081', {
  withCredentials: true
});
```

### TypeScript 타입 정의
```typescript
interface ServerToClientEvents {
  joinRoomSuccess: (data: JoinRoomSuccessData) => void;
  joinRoomError: (error: { message: string }) => void;
  userJoined: (data: UserJoinedData) => void;
  userLeft: (data: UserLeftData) => void;
  update: (message: MessageData) => void;
  avatarUpdated: (data: AvatarUpdateData) => void;
  roomListUpdate: (rooms: Room[]) => void;
  messageError: (error: { message: string }) => void;
  avatarError: (error: { message: string }) => void;
}

interface ClientToServerEvents {
  joinRoom: (data: JoinRoomData) => void;
  message: (data: SendMessageData) => void;
  updateAvatar: (data: UpdateAvatarData) => void;
  leaveRoom: () => void;
}
```

---

## 📤 Client → Server Events

### 1. 방 입장
**Event**: `joinRoom`

#### Data
```typescript
interface JoinRoomData {
  roomId: string;    // 방 ID (필수)
  userName: string;  // 사용자 이름 (필수)
  userId: string;    // 사용자 ID (필수)
}
```

#### Example
```javascript
socket.emit('joinRoom', {
  roomId: 'room_1234567890_abc123',
  userName: '홍길동',
  userId: 'user_123'
});
```

---

### 2. 메시지 전송
**Event**: `message`

#### Data
```typescript
interface SendMessageData {
  message: string;   // 메시지 내용 (필수)
  type?: string;     // 메시지 타입 (선택)
}
```

#### Example
```javascript
socket.emit('message', {
  message: '안녕하세요!',
  type: 'text'
});
```

---

### 3. 아바타 업데이트
**Event**: `updateAvatar`

#### Data
```typescript
interface UpdateAvatarData {
  avatarUrl: string;     // 아바타 이미지 URL (필수)
  productInfo?: {        // 상품 정보 (선택)
    id: number;
    name: string;
    category?: string;
  };
}
```

#### Example
```javascript
socket.emit('updateAvatar', {
  avatarUrl: 'https://example.com/avatar.jpg',
  productInfo: {
    id: 123,
    name: '블루 티셔츠',
    category: '상의'
  }
});
```

---

### 4. 방 나가기
**Event**: `leaveRoom`

#### Data
없음

#### Example
```javascript
socket.emit('leaveRoom');
```

---

## 📥 Server → Client Events

### 1. 방 입장 성공
**Event**: `joinRoomSuccess`

#### Data
```typescript
interface JoinRoomSuccessData {
  room: Room;
  userInfo: {
    id: string;        // 소켓 ID
    userId: string;    // 사용자 ID
    name: string;      // 사용자 이름
    roomId: string;    // 방 ID
    side: 'left' | 'right';  // 할당된 사이드
  };
}
```

#### Example
```javascript
socket.on('joinRoomSuccess', (data) => {
  console.log('방 입장 성공:', data.room.name);
  console.log('내 사이드:', data.userInfo.side);
});
```

---

### 2. 방 입장 실패
**Event**: `joinRoomError`

#### Data
```typescript
interface JoinRoomErrorData {
  message: string;   // 오류 메시지
}
```

#### Example
```javascript
socket.on('joinRoomError', (error) => {
  alert(`방 입장 실패: ${error.message}`);
});
```

---

### 3. 새 사용자 입장
**Event**: `userJoined`

#### Data
```typescript
interface UserJoinedData {
  type: 'connect';
  name: 'SERVER';
  message: string;
  userInfo: UserInfo;
}
```

#### Example
```javascript
socket.on('userJoined', (data) => {
  console.log(data.message); // "홍길동님이 입장하였습니다."
});
```

---

### 4. 사용자 퇴장
**Event**: `userLeft`

#### Data
```typescript
interface UserLeftData {
  type: 'disconnect';
  name: 'SERVER';
  message: string;
  userInfo: UserInfo;
}
```

---

### 5. 메시지 수신
**Event**: `update`

#### Data
```typescript
interface MessageData {
  message: string;
  name: string;
  userId: string;
  socketId: string;
  side: 'left' | 'right';
  timestamp: string;    // ISO 8601 형식
  type?: string;
}
```

#### Example
```javascript
socket.on('update', (data) => {
  console.log(`${data.name}: ${data.message}`);
  console.log(`시간: ${new Date(data.timestamp).toLocaleTimeString()}`);
});
```

---

### 6. 아바타 업데이트
**Event**: `avatarUpdated`

#### Data
```typescript
interface AvatarUpdateData {
  side: 'left' | 'right';
  userId: string;
  avatarUrl: string;
  productInfo?: {
    id: number;
    name: string;
    category?: string;
  };
}
```

#### Example
```javascript
socket.on('avatarUpdated', (data) => {
  // data.side에 따라 왼쪽/오른쪽 아바타 업데이트
  updateAvatarImage(data.side, data.avatarUrl);
});
```

---

### 7. 방 목록 업데이트
**Event**: `roomListUpdate`

#### Data
```typescript
type RoomListUpdateData = Room[];
```

#### Example
```javascript
socket.on('roomListUpdate', (rooms) => {
  updateRoomList(rooms);
});
```

---

## 🔄 전체 플로우 예시

```typescript
// 1. Socket 연결
const socket = io('http://localhost:8081');

// 2. 방 생성 (REST API)
const createRoom = async () => {
  const response = await fetch('http://localhost:8081/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName: '내 방',
      creatorName: '홍길동'
    })
  });
  const { room } = await response.json();
  return room;
};

// 3. 방 입장 (Socket.IO)
const joinRoom = (room: Room, user: User) => {
  socket.emit('joinRoom', {
    roomId: room.id,
    userName: user.name,
    userId: user.id
  });
};

// 4. 이벤트 리스너 등록
socket.on('joinRoomSuccess', (data) => {
  console.log('방 입장 성공');
});

socket.on('update', (message) => {
  displayMessage(message);
});

socket.on('avatarUpdated', (data) => {
  updateAvatar(data.side, data.avatarUrl);
});

// 5. 메시지 전송
const sendMessage = (text: string) => {
  socket.emit('message', { message: text });
};

// 6. 아바타 업데이트 (Spring Boot 처리 후)
const updateAvatar = async (productId: number) => {
  // Spring Boot에서 AI 처리
  const response = await fetch('http://localhost:8080/api/try-on', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ productId })
  });
  const avatarData = await response.json();
  
  // Node.js로 결과 전파
  socket.emit('updateAvatar', avatarData);
};
```

---

## ⚠️ 주의사항

1. **방 최대 인원**: 각 방은 최대 2명까지만 입장 가능
2. **사이드 할당**: 첫 번째 입장자는 'left', 두 번째는 'right'
3. **방 자동 삭제**: 모든 사용자가 나가면 방이 자동으로 삭제됨
4. **메모리 기반**: 서버 재시작 시 모든 방 정보가 초기화됨
5. **JWT 검증**: Node.js에서는 JWT 검증하지 않음 (프론트에서 관리)

---

## 🐛 에러 처리

### REST API 에러
```javascript
try {
  const response = await fetch('/api/rooms', { ... });
  if (!response.ok) {
    const error = await response.json();
    console.error('API 에러:', error.message);
  }
} catch (error) {
  console.error('네트워크 에러:', error);
}
```

### Socket.IO 에러
```javascript
socket.on('joinRoomError', (error) => {
  console.error('방 입장 실패:', error.message);
});

socket.on('messageError', (error) => {
  console.error('메시지 전송 실패:', error.message);
});

socket.on('avatarError', (error) => {
  console.error('아바타 업데이트 실패:', error.message);
});
```
