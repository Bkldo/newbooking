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
        const listDiv = document.getElementById('reservation-list');
        const btnNew = document.getElementById('btn-new-booking');
        
        // ถ้าล็อกอินแล้วให้แสดงปุ่มจอง
        if (this.user) {
            btnNew.style.display = 'inline-block';
            btnNew.onclick = () => this.navigate('booking');
        } else {
            btnNew.style.display = 'none';
        }

        try {
            const response = await fetch(API_URL + '?action=getReservations');
            const reservations = await response.json();
            
            if (reservations.length === 0) {
                listDiv.innerHTML = '<p>ไม่มีข้อมูลการจอง</p>';
                return;
            }

            let html = '<table class="data-table"><thead><tr><th>หัวข้อ</th><th>เวลาเริ่ม</th><th>เวลาสิ้นสุด</th><th>ผู้จอง</th></tr></thead><tbody>';
            reservations.forEach(r => {
                html += `<tr>
                    <td>${r.topic}</td>
                    <td>${new Date(r.begin).toLocaleString('th-TH')}</td>
                    <td>${new Date(r.end).toLocaleString('th-TH')}</td>
                    <td>Member ID: ${r.member_id}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            
            listDiv.innerHTML = html;
            
        } catch (error) {
            console.error('Load calendar error:', error);
            listDiv.innerHTML = '<p style="color:red">ไม่สามารถโหลดข้อมูลการจองได้ ตรวจสอบ API_URL ใน app.js</p>';
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
