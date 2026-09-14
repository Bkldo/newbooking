/**
 * app.js - Main Application Logic
 * สำหรับเชื่อมต่อกับ Google Apps Script (Backend)
 */

// ใส่ URL ของ Google Apps Script ที่ Deploy เป็น Web App
const API_URL = "https://script.google.com/macros/s/AKfycbyO1zUq3elc98RJLY6QLYgzctpDPRP-RVX3hGa7XlLxXKOxO0wPOjlYwB1zy8EyF4-tsQ/exec"; // ** ผู้ใช้ต้องเปลี่ยน URL นี้ **

const App = {
    user: null,

    init: function() {
        // ตรวจสอบสถานะล็อกอิน
        this.checkLogin();

        // จัดการหน้าถ้าเป็น index.html
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            window.addEventListener('hashchange', () => this.route());
            this.route();
        }
    },

    checkLogin: function() {
        const userData = localStorage.getItem('user');
        if (userData) {
            this.user = JSON.parse(userData);
            this.updateMenu();
        }
    },

    updateMenu: function() {
        const loginMenu = document.getElementById('menu-login');
        const logoutMenu = document.getElementById('menu-logout');
        
        if (this.user) {
            if (loginMenu) loginMenu.classList.add('hidden');
            if (logoutMenu) logoutMenu.classList.remove('hidden');
        } else {
            if (loginMenu) loginMenu.classList.remove('hidden');
            if (logoutMenu) logoutMenu.classList.add('hidden');
        }
    },

    route: function() {
        const hash = window.location.hash || '#home';
        const page = hash.substring(1);
        this.navigate(page);
    },

    navigate: function(page) {
        const contentDiv = document.getElementById('main-content');
        if (!contentDiv) return;

        // เปลี่ยน Hash บน URL (ถ้ายังไม่ตรง)
        if (window.location.hash !== '#' + page) {
            window.location.hash = page;
            return;
        }

        const template = document.getElementById('tpl-' + page);
        if (template) {
            contentDiv.innerHTML = template.innerHTML;
            
            // รันสคริปต์ที่เกี่ยวข้องกับหน้านั้นๆ
            if (page === 'home') {
                this.loadCalendar();
            } else if (page === 'booking') {
                this.loadRooms();
            }
        } else {
            contentDiv.innerHTML = '<h2>ไม่พบหน้าที่ต้องการ</h2>';
        }
    },

    login: async function(event) {
        event.preventDefault();
        
        const username = event.target.username.value;
        const password = event.target.password.value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            // ใช้ POST request ส่ง username, password ไปตรวจสอบ
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = 'index.html';
            } else {
                errorDiv.innerText = result.message || 'รหัสผ่านไม่ถูกต้อง';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.innerText = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (' + error.message + ')\nตรวจสอบ API_URL ใน app.js';
            errorDiv.classList.remove('hidden');
        }
    },

    logout: function() {
        localStorage.removeItem('user');
        this.user = null;
        this.updateMenu();
        window.location.href = 'login.html';
    },

    loadCalendar: async function() {
        // อัปเดตสถิติ Dashboard
        try {
            const statsResp = await fetch(API_URL + '?action=getDashboardStats');
            const stats = await statsResp.json();
            document.getElementById('dash-today').textContent = stats.today || 0;
            document.getElementById('dash-rooms').textContent = stats.rooms || 0;
        } catch (e) {
            console.error("Failed to load dashboard stats", e);
        }

        // โหลดลิงก์ห้องเรียน
        try {
            const roomsResp = await fetch(API_URL + '?action=getRooms');
            const rooms = await roomsResp.json();
            
            const roomLinks = document.getElementById('room_links');
            if (roomLinks) {
                roomLinks.innerHTML = '';
                rooms.forEach(room => {
                    const a = document.createElement('a');
                    a.id = 'room_' + room.id;
                    a.style.backgroundColor = room.color;
                    a.textContent = room.name;
                    a.onclick = function() {
                        // เมื่อคลิกชื่อห้อง สามารถกรองหรือดูรายละเอียดห้องได้
                        alert('แสดงรายละเอียดห้อง: ' + room.name);
                    };
                    roomLinks.appendChild(a);
                });
            }
        } catch(e) {
            console.error("Failed to load rooms", e);
        }

        // เรนเดอร์ปฏิทินของ Kotchasan
        if (window.Calendar && document.getElementById('booking-calendar')) {
            var y = new Date().getFullYear();
            new Calendar("booking-calendar", {
                minYear: y - 5,
                maxYear: y + 5,
                url: API_URL + "?action=getCalendarData",
                onclick: function(d) {
                    // เมื่อคลิกเหตุการณ์ในปฏิทิน id จะเป็น "{id}_booking"
                    const id = this.id.replace('_booking', '');
                    App.showReservationDetail(id);
                }
            });
        }
    },

    loadRooms: async function() {
        if (!this.user) {
            alert('กรุณาเข้าสู่ระบบก่อนทำรายการ');
            window.location.href = 'login.html';
            return;
        }

        const roomSelect = document.getElementById('room_id');
        try {
            const response = await fetch(API_URL + '?action=getRooms');
            const rooms = await response.json();
            
            rooms.forEach(room => {
                if (room.published == 1) {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.text = room.name;
                    roomSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Load rooms error:', error);
            alert('ไม่สามารถโหลดข้อมูลห้องประชุมได้');
        }
    },

    showReservationDetail: async function(id) {
        try {
            // ในระบบจริง ควรจะสร้าง API สำหรับ getReservation(id)
            // แต่เพื่อความรวดเร็ว ดึงทั้งหมดมาหาอันที่ต้องการ
            const response = await fetch(API_URL + '?action=getReservations');
            const reservations = await response.json();
            const r = reservations.find(x => x.id == id);
            
            if (r) {
                // สร้างเนื้อหา HTML สำหรับ Modal ให้เหมือนรูปที่ 3
                let html = `
                <div style="padding: 10px; min-width: 300px;">
                    <h3 class="icon-file">รายละเอียดของการจอง</h3>
                    <table class="border data-table" style="width: 100%; margin-top:10px;">
                        <tbody>
                            <tr><th style="width:30%; text-align:right; padding:5px;">หัวข้อ</th><td style="padding:5px;">${r.topic}</td></tr>
                            <tr><th style="text-align:right; padding:5px;">วันที่จอง</th><td style="padding:5px;">${r.begin} ถึง ${r.end}</td></tr>
                            <tr><th style="text-align:right; padding:5px;">ผู้เข้าร่วม</th><td style="padding:5px;">${r.attendees || '-'} คน</td></tr>
                            <tr><th style="text-align:right; padding:5px;">ผู้จอง</th><td style="padding:5px;">${r.member_id}</td></tr>
                            <tr><th style="text-align:right; padding:5px;">สถานะ</th><td style="padding:5px;">${r.status == 1 ? '<span class="icon-valid color-green">อนุมัติแล้ว</span>' : 'รออนุมัติ'}</td></tr>
                        </tbody>
                    </table>
                </div>`;
                
                if (window.GModal) {
                    new GModal().show(html);
                } else {
                    alert(`หัวข้อ: ${r.topic}\nเวลา: ${r.begin} - ${r.end}`);
                }
            } else {
                alert('ไม่พบข้อมูลการจอง');
            }
        } catch (e) {
            console.error(e);
            alert('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    submitBooking: async function(event) {
        event.preventDefault();
        
        if (!this.user) {
            alert('Session expired. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        formData.append('action', 'saveReservation');
        formData.append('member_id', this.user.id);
        
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'กำลังบันทึก...';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                alert('บันทึกการจองสำเร็จ');
                this.navigate('home');
            } else {
                alert('เกิดข้อผิดพลาด: ' + result.message);
                btn.disabled = false;
                btn.innerText = 'บันทึก';
            }
        } catch (error) {
            console.error('Save booking error:', error);
            alert('ไม่สามารถบันทึกข้อมูลได้ (' + error.message + ')\nเนื่องจาก Google Apps Script อาจถูกบล็อกโดย CORS หรือตั้งค่าไม่ถูกต้อง โปรดตั้งค่าเป็น "Anyone" ตอน Deploy');
            btn.disabled = false;
            btn.innerText = 'บันทึก';
        }
    }
};
