require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS 설정 (REST API용)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// Socket.IO 설정 (WebSocket용 CORS)
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// JSON 파싱 미들웨어
app.use(express.json());

// 정적 파일 제공
app.use('/css', express.static('./static/css'));
app.use('/js', express.static('./static/js'));

app.get('/', (req, res) => {
  fs.readFile('./static/index.html', (err, data) => {
    if (err) {
      res.send('Error loading index.html');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.write(data);
      res.end();
    }
  });
});

// --- 방 관리 시스템 (메모리 기반) ---
const rooms = new Map();
const users = new Map();

// 초대 코드 생성 함수
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 방 생성 API (초대 링크 포함)
app.post('/api/rooms', (req, res) => {
  const { roomName, creatorName, maxUsers = 2 } = req.body;
  
  if (!roomName || !creatorName) {
    return res.status(400).json({ 
      success: false, 
      message: '방 이름과 생성자 이름이 필요합니다.' 
    });
  }

  // 고유한 방 ID와 초대 코드 생성
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const inviteCode = generateInviteCode();
  
  // 방 정보 생성
  const roomInfo = {
    id: roomId,
    name: roomName,
    creator: creatorName,
    maxUsers: maxUsers,
    currentUsers: 0,
    users: [],
    inviteCode: inviteCode,
    inviteLink: `http://localhost:3000/rooms/${inviteCode}`,
    createdAt: new Date().toISOString()
  };

  rooms.set(roomId, roomInfo);
  
  console.log(`새 방 생성: ${roomName} (ID: ${roomId}, 초대코드: ${inviteCode}) by ${creatorName}`);
  
  res.json({
    success: true,
    message: '방이 성공적으로 생성되었습니다.',
    room: roomInfo
  });
});

// 초대 코드로 방 조회 API (새로 추가)
app.get('/api/rooms/invite/:inviteCode', (req, res) => {
  const { inviteCode } = req.params;
  
  // 모든 방에서 초대 코드로 검색
  let targetRoom = null;
  for (const room of rooms.values()) {
    if (room.inviteCode === inviteCode) {
      targetRoom = room;
      break;
    }
  }
  
  if (!targetRoom) {
    return res.status(404).json({
      success: false,
      message: '유효하지 않은 초대 링크입니다.'
    });
  }
  
  res.json({
    success: true,
    room: {
      id: targetRoom.id,
      name: targetRoom.name,
      creator: targetRoom.creator,
      currentUsers: targetRoom.currentUsers,
      maxUsers: targetRoom.maxUsers,
      inviteCode: targetRoom.inviteCode,
      inviteLink: targetRoom.inviteLink,
      createdAt: targetRoom.createdAt
    }
  });
});

// 방 목록 조회 API (관리자용으로 유지)
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    creator: room.creator,
    currentUsers: room.currentUsers,
    maxUsers: room.maxUsers,
    inviteCode: room.inviteCode,
    inviteLink: room.inviteLink,
    createdAt: room.createdAt
  }));

  res.json({
    success: true,
    rooms: roomList
  });
});

// 특정 방 정보 조회 API (기존 유지)
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({
      success: false,
      message: '방을 찾을 수 없습니다.'
    });
  }

  res.json({
    success: true,
    room: room
  });
});

// --- Socket.IO 실시간 통신 ---
io.on('connection', (socket) => {
  console.log(`새로운 소켓 연결: ${socket.id}`);

  // 1. 방 입장 (JWT 검증은 프론트에서 처리)
  socket.on('joinRoom', (data) => {
    const { roomId, userName, userId } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('joinRoomError', { message: '존재하지 않는 방입니다.' });
      return;
    }

    if (room.currentUsers >= room.maxUsers) {
      socket.emit('joinRoomError', { message: '방이 가득 찼습니다.' });
      return;
    }

    // 소켓을 방에 추가
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;
    socket.userId = userId;

    // 유저 정보 저장
    const userInfo = {
      id: socket.id,
      userId: userId,
      name: userName,
      roomId: roomId,
      side: room.currentUsers === 0 ? 'left' : 'right'
    };

    users.set(socket.id, userInfo);
    room.users.push(userInfo);
    room.currentUsers++;

    console.log(`${userName} (${socket.id})님이 방 ${room.name}에 입장했습니다.`);

    // 방 입장 성공 알림
    socket.emit('joinRoomSuccess', {
      room: room,
      userInfo: userInfo
    });

    // 같은 방의 다른 유저들에게 새 유저 입장 알림
    socket.to(roomId).emit('userJoined', {
      type: 'connect',
      name: 'SERVER',
      message: `${userName}님이 입장하였습니다.`,
      userInfo: userInfo
    });

    // 방 목록 업데이트
    io.emit('roomListUpdate', Array.from(rooms.values()));
  });

  // 2. 메시지 전송
  socket.on('message', (data) => {
    const user = users.get(socket.id);
    if (!user || !user.roomId) {
      socket.emit('messageError', { message: '방에 입장하지 않았습니다.' });
      return;
    }

    const messageData = {
      ...data,
      name: user.name,
      userId: user.userId,
      socketId: socket.id,
      side: user.side,
      timestamp: new Date().toISOString()
    };

    console.log(`방 ${user.roomId}에서 메시지:`, messageData);
    
    // 같은 방의 모든 유저에게 메시지 전송
    io.to(user.roomId).emit('update', messageData);
  });
  
  // 3. 아바타 업데이트 (프론트에서 Spring Boot 처리 후 결과만 전달)
  socket.on('updateAvatar', (data) => {
    const user = users.get(socket.id);
    if (!user || !user.roomId) {
      socket.emit('avatarError', { message: '방에 입장하지 않았습니다.' });
      return;
    }

    const avatarData = {
      ...data,
      side: user.side,
      userId: user.userId
    };

    console.log(`방 ${user.roomId}에서 아바타 업데이트:`, avatarData);
    
    // 같은 방의 모든 유저에게 아바타 업데이트 전송
    io.to(user.roomId).emit('avatarUpdated', avatarData);
  });

  // 4. 방 나가기
  socket.on('leaveRoom', () => {
    handleUserLeave(socket);
  });

  // 5. 연결 종료
  socket.on('disconnect', () => {
    handleUserLeave(socket);
  });
});

// 유저 퇴장 처리
function handleUserLeave(socket) {
  const user = users.get(socket.id);
  
  if (user && user.roomId) {
    const room = rooms.get(user.roomId);
    
    if (room) {
      // 방에서 유저 제거
      room.users = room.users.filter(u => u.id !== socket.id);
      room.currentUsers--;
      
      console.log(`${user.name}님이 방 ${room.name}에서 나가셨습니다.`);
      
      // 같은 방의 다른 유저들에게 퇴장 알림
      socket.to(user.roomId).emit('userLeft', {
        type: 'disconnect',
        name: 'SERVER',
        message: `${user.name}님이 나가셨습니다.`,
        userInfo: user
      });

      // 방이 비어있으면 방 삭제
      if (room.currentUsers === 0) {
        rooms.delete(user.roomId);
        console.log(`빈 방 삭제: ${room.name} (ID: ${user.roomId})`);
      }

      // 방 목록 업데이트
      io.emit('roomListUpdate', Array.from(rooms.values()));
    }
    
    socket.leave(user.roomId);
  }
  
  users.delete(socket.id);
}

// 서버 실행
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`🚀 TryItOn 실시간 통신 서버 실행 중... http://localhost:${PORT}`);
  console.log(`📡 Socket.IO 연결 대기 중...`);
});
