const socket = io();

// Next.js에서 받아왔다고 가정한 임시 JWT. 실제로는 로그인 후 발급받아야 합니다.
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// 샘플 상품 데이터
const sampleProducts = [
    { id: 'top-001', name: '레글런 반팔티', img: 'https://via.placeholder.com/100x100.png?text=Top1' },
    { id: 'top-002', name: '스트라이프 카라티', img: 'https://via.placeholder.com/100x100.png?text=Top2' },
    { id: 'top-003', name: '체크 반팔 셔츠', img: 'https://via.placeholder.com/100x100.png?text=Top3' },
];

/* 1. 접속 되었을 때 실행 */
socket.on('connect', () => {
  console.log('서버에 접속되었습니다.');
  const guestName = 'guest_' + Math.floor(Math.random() * 1000);
  // 서버에 새로운 유저 접속을 알림 (이름은 임시 게스트)
  socket.emit('newUser', guestName);
});


/* 2. 서버로부터 채팅/시스템 메시지를 받은 경우 화면 업데이트 */
socket.on('update', (data) => {
  const chatContainer = document.getElementById('chat-container');
  const messageDiv = document.createElement('div');
  
  let className = '';
  let content = '';

  switch(data.type) {
    case 'message':
      // 내가 보낸 메시지는 send() 함수에서 이미 처리했으므로 다른 사람 메시지만 처리
      if (data.socketId !== socket.id) {
        className = 'other';
        content = `${data.name}: ${data.message}`;
      }
      break;
    case 'connect':
    case 'disconnect':
      className = 'system';
      content = data.message;
      break;
  }
  
  if (content) {
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight; // 스크롤을 맨 아래로
  }
});


/* 3. 서버로부터 아바타 변경 신호를 받은 경우 */
socket.on('updateAvatar', (data) => {
    // data: { side: 'left' | 'right', avatarUrl: '...', productInfo: {...} }
    const side = data.side; // 'left' 또는 'right'
    const avatarImg = document.getElementById(`${side}-avatar-img`);
    const productInfoDiv = document.getElementById(`${side}-product-info`);

    if(avatarImg) {
        // 이미지 주소에 타임스탬프를 추가하여 캐시 문제 방지
        avatarImg.src = `${data.avatarUrl}?t=${new Date().getTime()}`; 
    }
    if(productInfoDiv) {
        productInfoDiv.textContent = `착용한 상의: ${data.productInfo.name}`;
    }
});


/* 4. 메시지 전송 함수 */
function send() {
  const input = document.getElementById('message-input');
  const message = input.value;

  if (message.trim() === '') return;

  // 내 화면에 내가 보낸 메시지 표시
  const chatContainer = document.getElementById('chat-container');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message me';
  msgDiv.textContent = message;
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // 서버로 메시지 전송
  socket.emit('message', { type: 'message', message: message });
  input.value = '';
}
// Enter 키로도 메시지 전송
document.getElementById('message-input').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        send();
    }
});


/* 5. 상품 클릭 시 서버로 tryOn 이벤트 전송 */
function selectProduct(productId, productName) {
    console.log(`상품 선택: ${productId}, JWT: ${FAKE_JWT}`);
    // 서버로 상품 ID와 JWT를 전달
    socket.emit('tryOn', { productId, productName, jwt: FAKE_JWT });
}


/* 6. 페이지 로드 시 상품 목록 생성 */
window.onload = () => {
    const productListDiv = document.getElementById('top-products');
    sampleProducts.forEach(product => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'product-item';
        itemDiv.onclick = () => selectProduct(product.id, product.name);

        const itemImg = document.createElement('img');
        itemImg.src = product.img;
        itemImg.alt = product.name;

        const itemName = document.createElement('p');
        itemName.textContent = product.name;

        itemDiv.appendChild(itemImg);
        itemDiv.appendChild(itemName);
        productListDiv.appendChild(itemDiv);
    });
};