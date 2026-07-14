// [CẤU HÌNH] Thay username Messenger thật của fanpage vào đây, ví dụ: "phamducstudio"
const MESSENGER_USERNAME = "phamducstudio";
// [CẤU HÌNH] Thay số điện thoại Zalo thật vào đây (dùng làm phương án dự phòng), định dạng quốc tế không dấu +, ví dụ: "84987654321"
const ZALO_PHONE = "84000000000";

function sendBooking(){
const name = document.getElementById('name').value.trim();
const phone = document.getElementById('phone').value.trim();
const date = document.getElementById('weddingDate').value;
const pkg = document.getElementById('package').value;
const note = document.getElementById('note').value.trim();

if(!name || !phone){
alert('Vui lòng nhập Họ tên và Số điện thoại trước khi gửi.');
return;
}

const message =
`Chào Phạm Đức Studio, em muốn đặt lịch chụp ảnh cưới ạ.
- Họ tên: ${name}
- SĐT: ${phone}
- Ngày cưới dự kiến: ${date || 'Chưa xác định'}
- Gói quan tâm: ${pkg}
- Ghi chú: ${note || 'Không có'}`;

// Copy nội dung vào clipboard để khách dán vào khung chat
if(navigator.clipboard){
navigator.clipboard.writeText(message).catch(()=>{});
}

// Mở Messenger (m.me) — nếu chưa cấu hình username thật, sẽ nhắc người dùng
const messengerUrl = `https://m.me/${MESSENGER_USERNAME}`;
window.open(messengerUrl, '_blank');

alert('Đã sao chép nội dung đặt lịch vào bộ nhớ tạm.\nCửa sổ Messenger vừa mở — bạn chỉ cần dán (Ctrl+V) nội dung vào khung chat và bấm gửi.');
}
