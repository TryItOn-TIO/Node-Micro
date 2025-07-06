const express = require('express');
const http =require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const axios = require('axios'); // Spring 서버와 통신하기 위해 추가

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// --- 서버 설정 ---
app.use('/css', express.static('./static/css'));
app.use('/js', express.static('./static/js'));

app.get('/', (req, res) => {
  fs.readFile('./static/index.html', (err, data) => { // 루트 경로에 index.html을 제공
    if (err) {
      res.send('Error loading index.html');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.write(data);
      res.end();
    }
  });
});

// --- 실시간 로직 ---
const users = []; // 접속한 유저들을 관리

io.on('connection', (socket) => {

  // 1. 새로운 유저 접속 처리
  socket.on('newUser', (name) => {
    console.log(`${name} (${socket.id}) 님이 접속하였습니다.`);

    // 유저에게 'left' 또는 'right' 사이드 할당
    const side = users.length === 0 ? 'left' : 'right';
    const newUser = { id: socket.id, name, side };
    users.push(newUser);
    socket.side = side; // 소켓 객체에 side 정보 저장

    console.log(`${name}님에게 '${side}' 사이드가 할당되었습니다.`);

    // 모든 유저에게 접속 알림
    io.sockets.emit('update', {
      type: 'connect',
      name: 'SERVER',
      message: `${name}님이 접속하였습니다.`
    });
  });

  // 2. 메시지 중계
  socket.on('message', (data) => {
    // 보낸 사람 정보 추가
    const sender = users.find(user => user.id === socket.id);
    const responseData = {
        ...data,
        name: sender ? sender.name : 'Unknown',
        socketId: socket.id // 누가 보냈는지 식별하기 위해 socket.id 추가
    }
    console.log('Message received:', responseData);
    // 보낸 사람을 포함한 모든 사람에게 메시지 전송
    io.sockets.emit('update', responseData);
  });
  
  // 3. 의상 착용 요청(tryOn) 처리
  socket.on('tryOn', async (data) => {
    // data: { productId, productName, jwt }
    console.log(`'${socket.side}' 사이드에서 tryOn 요청:`, data);
    
    try {
      // --- 여기가 Spring Boot API와 통신하는 부분 ---
      // 실제 Spring Boot 서버의 주소로 변경해야 합니다.
      const springApiUrl = 'http://localhost:8081/api/try-on'; // 예시 주소
      
      console.log(`Spring 서버(${springApiUrl})로 요청 전송...`);

      // const response = await axios.post(springApiUrl, {
      //   jwt: data.jwt,
      //   productId: data.productId
      // });
      
      // --- 실제 API 호출 대신 사용할 Mock(가짜) 응답 ---
      // Spring 서버가 준비되지 않았을 경우, 아래의 가짜 데이터로 테스트합니다.
      const mockResponse = {
        status: 200,
        data: {
          // 실제라면 Spring이 생성해서 줄 아바타 이미지 주소
          avatarUrl: `https://via.placeholder.com/300x500.png?text=${data.productName.replace(' ', '+')}`,
          productInfo: {
              id: data.productId,
              name: data.productName
          }
        }
      };
      console.log('Spring 서버로부터 받은 (가상) 응답:', mockResponse.data);
      const response = mockResponse;
      // --- Mock 응답 끝 ---

      if(response.status === 200) {
        // 성공적으로 아바타 URL을 받으면 모든 클라이언트에게 전송
        const updateData = {
          side: socket.side, // 어느 쪽 아바타를 업데이트할지
          avatarUrl: response.data.avatarUrl,
          productInfo: response.data.productInfo
        };
        io.sockets.emit('updateAvatar', updateData);
      }

    } catch (error) {
      console.error('Spring 서버 통신 오류:', error.message);
      // 에러가 발생했음을 요청한 클라이언트에게만 알릴 수 있습니다.
      // socket.emit('tryOnError', { message: '아바타 생성에 실패했습니다.' });
    }
  });

  // 4. 접속 종료 처리
  socket.on('disconnect', () => {
    const userIndex = users.findIndex(user => user.id === socket.id);
    if(userIndex !== -1) {
        const user = users[userIndex];
        users.splice(userIndex, 1); // 유저 목록에서 제거
        console.log(`${user.name}님이 나가셨습니다.`);
        
        // 모든 유저에게 퇴장 알림
        io.sockets.emit('update', {
          type: 'disconnect',
          name: 'SERVER',
          message: `${user.name}님이 나가셨습니다.`
        });
    }
  });
});


// --- 서버 실행 ---
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`서버 실행 중... http://localhost:${PORT}`);
});