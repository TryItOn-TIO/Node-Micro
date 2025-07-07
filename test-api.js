// 초대 링크 기능 포함 API 테스트 스크립트
const axios = require('axios');

const BASE_URL = 'http://localhost:8081';

async function testAPI() {
  try {
    console.log('🚀 Node.js 실시간 통신 서버 API 테스트 시작...\n');

    // 1. 방 생성 테스트 (초대 링크 포함)
    console.log('1. 방 생성 테스트 (초대 링크 포함)');
    const createRoomResponse = await axios.post(`${BASE_URL}/api/rooms`, {
      roomName: '테스트 방',
      creatorName: '테스트 유저',
      maxUsers: 2
    });
    console.log('✅ 방 생성 성공:', createRoomResponse.data);
    
    const room = createRoomResponse.data.room;
    const inviteCode = room.inviteCode;
    console.log(`📎 초대 링크: ${room.inviteLink}`);
    console.log(`🔑 초대 코드: ${inviteCode}`);

    // 2. 초대 코드로 방 조회 테스트 (새로운 기능)
    console.log('\n2. 초대 코드로 방 조회 테스트');
    const inviteResponse = await axios.get(`${BASE_URL}/api/rooms/invite/${inviteCode}`);
    console.log('✅ 초대 코드 조회 성공:', inviteResponse.data);

    // 3. 방 목록 조회 테스트
    console.log('\n3. 방 목록 조회 테스트');
    const roomListResponse = await axios.get(`${BASE_URL}/api/rooms`);
    console.log('✅ 방 목록 조회 성공:', roomListResponse.data);

    // 4. 특정 방 정보 조회 테스트
    console.log('\n4. 특정 방 정보 조회 테스트');
    const roomInfoResponse = await axios.get(`${BASE_URL}/api/rooms/${room.id}`);
    console.log('✅ 방 정보 조회 성공:', roomInfoResponse.data);

    // 5. 잘못된 초대 코드 테스트
    console.log('\n5. 잘못된 초대 코드 테스트');
    try {
      await axios.get(`${BASE_URL}/api/rooms/invite/INVALID123`);
    } catch (error) {
      console.log('✅ 잘못된 초대 코드 처리 성공:', error.response.data);
    }

    console.log('\n🎉 모든 API 테스트 완료!');
    console.log('\n📋 새로운 플로우:');
    console.log('   1. 방 생성 → 초대 링크 받기');
    console.log('   2. 초대 링크 공유');
    console.log('   3. 링크 클릭 → 방 정보 조회');
    console.log('   4. 방 입장');
    
    console.log('\n📡 Socket.IO 테스트는 프론트엔드에서 진행하세요.');
    console.log('   - 방 입장: socket.emit("joinRoom", {roomId, userName, userId})');
    console.log('   - 메시지: socket.emit("message", {message: "안녕하세요"})');
    console.log('   - 아바타: socket.emit("updateAvatar", {avatarUrl: "..."})');

  } catch (error) {
    console.error('❌ API 테스트 실패:', error.response?.data || error.message);
  }
}

// 서버가 실행 중인지 확인 후 테스트 실행
setTimeout(testAPI, 1000);
