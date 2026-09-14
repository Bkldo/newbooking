/**
 * app.js - Main Application Logic
 * สำหรับเชื่อมต่อกับ Google Apps Script (Backend)
 */

// ใส่ URL ของ Google Apps Script ที่ Deploy เป็น Web App
const API_URL = "https://script.google.com/macros/s/AKfycbyO1zUq3elc98RJLY6QLYgzctpDPRP-RVX3hGa7XlLxXKOxO0wPOjlYwB1zy8EyF4-tsQ/exec"; // ** ผู้ใช้ต้องเปลี่ยน URL นี้ **

const App = {
    user: null,

    init: function() {
        // ตั้งค่าภาษาไทยสำหรับปฏิทิน (gajax.js)
        if (window.Date) {
            Date.longMonthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            Date.shortMonthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            Date.longDayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
            Date.dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
            Date.yearOffset = 543;
        }

        // Override window.alert ด้วย SweetAlert2 (return promise เพื่อให้ await ได้)
        window.alert = function(msg) {
            if (window.Swal) {
                return Swal.fire({
                    text: msg,
                    icon: 'info',
                    confirmButtonColor: '#007bff'
                });
            } else {
                console.log("Alert:", msg); // Fallback
                return Promise.resolve();
            }
        };

        // ตั้งค่า Spinner (Global Fetch override)
        const originalFetch = window.fetch;
        window.fetch = async function() {
            App.showLoading();
            try {
                const response = await originalFetch.apply(this, arguments);
                return response;
            } finally {
                App.hideLoading();
            }
        };

        // ตรวจสอบสถานะล็อกอิน
        this.checkLogin();

        // ตรวจสอบว่าอยู่ในหน้า index.html หรือไม่ โดยดูจาก main-content
        if (document.getElementById('main-content')) {
            window.addEventListener('hashchange', () => this.route());
            this.route();
        }
    },

    showLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('active');
    },

    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
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
        const bookingMenu = document.getElementById('menu-booking');
        const reportMenu = document.getElementById('menu-report');
        const memberMenu = document.getElementById('menu-member');
        const settingsMenu = document.getElementById('menu-settings');
        
        if (this.user) {
            const isAdmin = this.user.status == 1;
            const canApprove = this.user.permission && this.user.permission.includes('can_approve_room');
            const hasPrivilege = isAdmin || canApprove;

            if (loginMenu) loginMenu.classList.add('hidden');
            if (logoutMenu) logoutMenu.classList.remove('hidden');
            if (bookingMenu) bookingMenu.classList.remove('hidden');
            if (reportMenu) reportMenu.classList.remove('hidden');
            
            // เปลี่ยนชื่อเมนูตามสิทธิ์
            if (reportMenu) {
                const reportLink = reportMenu.querySelector('a span');
                if (reportLink) {
                    reportLink.textContent = hasPrivilege ? 'รายงานการจอง' : 'รายการจองของฉัน';
                }
            }
            
            if (hasPrivilege) {
                if (memberMenu) memberMenu.classList.remove('hidden');
                if (settingsMenu) settingsMenu.classList.remove('hidden');
            } else {
                if (memberMenu) memberMenu.classList.add('hidden');
                if (settingsMenu) settingsMenu.classList.add('hidden');
            }
        } else {
            if (loginMenu) loginMenu.classList.remove('hidden');
            if (logoutMenu) logoutMenu.classList.add('hidden');
            if (bookingMenu) bookingMenu.classList.add('hidden');
            if (reportMenu) reportMenu.classList.add('hidden');
            if (memberMenu) memberMenu.classList.add('hidden');
            if (settingsMenu) settingsMenu.classList.add('hidden');
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

        // ปิด SweetAlert2 ที่ค้างอยู่ก่อนเปลี่ยนหน้า
        if (window.Swal && Swal.isVisible && Swal.isVisible()) {
            Swal.close();
        }

        // เปลี่ยน Hash บน URL (ถ้ายังไม่ตรง)
        if (window.location.hash !== '#' + page) {
            window.location.hash = page;
            return;
        }

        const basePage = page.split('?')[0];
        const template = document.getElementById('tpl-' + basePage);
        if (template) {
            contentDiv.innerHTML = template.innerHTML;
            
            // รันสคริปต์ของแต่ละหน้า
            if (basePage === 'home') {
                this.loadCalendar();
            } else if (basePage === 'booking-rooms') {
                this.loadRoomList();
            } else if (basePage === 'booking-form') {
                this.loadBookingForm();
            } else if (basePage === 'booking-report') {
                this.loadBookingReport();
            } else if (basePage === 'member') {
                this.loadMemberList();
            } else if (basePage === 'editprofile') {
                this.loadEditProfile();
            } else if (basePage === 'settings') {
                this.loadSettings();
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
            // เปลี่ยนจาก POST เป็น GET เพื่อป้องกันปัญหา CORS Redirect ของ Google Apps Script
            const params = new URLSearchParams();
            params.append('action', 'login');
            params.append('username', username);
            params.append('password', password);

            const response = await fetch(API_URL + '?' + params.toString(), {
                method: 'GET'
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
                    a.style.color = '#fff';
                    a.style.padding = '5px 15px';
                    a.style.marginRight = '10px';
                    a.style.borderRadius = '5px';
                    a.style.display = 'inline-block';
                    a.style.textDecoration = 'none';
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
                url: API_URL,
                params: "action=getCalendarData",
                onclick: function(d) {
                    // เมื่อคลิกเหตุการณ์ในปฏิทิน id จะเป็น "{id}_booking"
                    const id = this.id.replace('_booking', '');
                    App.showReservationDetail(id);
                }
            });
        }
    },

    loadRoomList: async function() {
        if (!this.user) {
            await alert('กรุณาเข้าสู่ระบบก่อนทำรายการ');
            window.location.href = 'login.html';
            return;
        }

        const container = document.getElementById('room-list-container');
        try {
            const response = await fetch(API_URL + '?action=getRooms');
            const rooms = await response.json();
            
            container.innerHTML = '';
            
            if (rooms.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px;">ไม่พบห้องประชุมที่เปิดใช้งาน</div>';
                return;
            }

            rooms.forEach(room => {
                if (room.published == 1) {
                    const roomCard = document.createElement('div');
                    roomCard.className = 'room-card'; // We might need to add CSS for this
                    roomCard.innerHTML = `
                        <div style="border: 1px solid #ccc; margin-bottom: 20px; padding: 15px; border-radius: 5px; background: #fff;">
                            <h3 style="margin-top: 0; color: ${room.color || '#333'}">${room.name}</h3>
                            <p><strong>ความจุ:</strong> ${room.seats || '-'} ที่นั่ง</p>
                            <p><strong>รายละเอียด:</strong> ${room.detail || '-'}</p>
                            <div style="margin-top: 15px;">
                                <a href="#booking-form?room_id=${room.id}" class="button green icon-add">จองห้อง</a>
                            </div>
                        </div>
                    `;
                    container.appendChild(roomCard);
                }
            });
        } catch (error) {
            console.error("Failed to load rooms", error);
            container.innerHTML = '<div style="color:red; text-align: center; padding: 20px;">เกิดข้อผิดพลาดในการโหลดข้อมูลห้องประชุม</div>';
        }
    },

    loadBookingForm: async function() {
        if (!this.user) {
            await alert('กรุณาเข้าสู่ระบบก่อนทำรายการ');
            window.location.href = 'login.html';
            return;
        }

        const roomSelect = document.getElementById('room_id');
        const contactNameInput = document.getElementById('contact_name');
        
        if (contactNameInput && this.user && this.user.name) {
            contactNameInput.value = this.user.name;
        }

        if (!roomSelect) return;

        try {
            // Get room_id from hash if any
            const hash = window.location.hash;
            let selectedRoomId = '';
            if (hash.includes('?room_id=')) {
                selectedRoomId = hash.split('?room_id=')[1];
            }

            const response = await fetch(API_URL + '?action=getRooms');
            const rooms = await response.json();
            
            roomSelect.innerHTML = '<option value="">เลือกห้องประชุม</option>';
            rooms.forEach(room => {
                if (room.published == 1) {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.text = room.name;
                    if (room.id == selectedRoomId) {
                        option.selected = true;
                    }
                    roomSelect.appendChild(option);
                }
            });

            // Load Categories
            const catResponse = await fetch(API_URL + '?action=getCategories');
            const categories = await catResponse.json();

            const deptSelect = document.getElementById('department');
            const purposeSelect = document.getElementById('purpose');
            const equipContainer = document.getElementById('equipment-list');
            
            if (deptSelect) deptSelect.innerHTML = '<option value="">เลือกแผนก</option>';
            if (purposeSelect) purposeSelect.innerHTML = '<option value="">เลือกวัตถุประสงค์</option>';
            if (equipContainer) equipContainer.innerHTML = '';

            categories.forEach(c => {
                if (c.type === 'department' && deptSelect) {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.text = c.topic;
                    deptSelect.appendChild(opt);
                } else if (c.type === 'purpose' && purposeSelect) {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.text = c.topic;
                    purposeSelect.appendChild(opt);
                } else if (c.type === 'equipment' && equipContainer) {
                    const lbl = document.createElement('label');
                    lbl.innerHTML = `<input type="checkbox" name="equipment" value="${c.id}"> ${c.topic}`;
                    equipContainer.appendChild(lbl);
                    equipContainer.appendChild(document.createElement('br'));
                }
            });
            
        } catch (error) {
            console.error("Failed to load data for booking form", error);
        }
    },

    // จัดรูปแบบวันที่/เวลาไทย เช่น "25 มิ.ย. 2569 เวลา 09:30 น."
    formatThaiDateTime: function(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear() + 543;
        const hours = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes().toString().padStart(2, '0');
        return `${day} ${month} ${year} เวลา ${hours}:${mins} น.`;
    },

    formatBookingDate: function(beginStr, endStr) {
        if (!beginStr || !endStr) return '-';
        const b = new Date(beginStr);
        const e = new Date(endStr);
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const bDay = b.getDate().toString().padStart(2, '0');
        const bMonth = months[b.getMonth()];
        const bYear = b.getFullYear() + 543;
        const bTime = `${b.getHours().toString().padStart(2, '0')}:${b.getMinutes().toString().padStart(2, '0')} น.`;
        
        const eDay = e.getDate().toString().padStart(2, '0');
        const eMonth = months[e.getMonth()];
        const eYear = e.getFullYear() + 543;
        const eTime = `${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')} น.`;
        
        if (b.toDateString() === e.toDateString()) {
            return `${bDay} ${bMonth} ${bYear} เวลา ${bTime} ถึง ${eTime}`;
        } else {
            return `${bDay} ${bMonth} ${bYear} เวลา ${bTime} ถึง ${eDay} ${eMonth} ${eYear} เวลา ${eTime}`;
        }
    },

    showReservationDetail: async function(id) {
        try {
            // โหลดข้อมูลที่เกี่ยวข้องทั้งหมด
            const [resResp, roomResp, userResp] = await Promise.all([
                fetch(API_URL + '?action=getReservations'),
                fetch(API_URL + '?action=getRooms'),
                fetch(API_URL + '?action=getUsers')
            ]);
            const reservations = await resResp.json();
            const rooms = await roomResp.json();
            const users = await userResp.json();
            
            const r = reservations.find(x => x.id == id);
            
            if (r) {
                const room = rooms.find(x => x.id == r.room_id) || {};
                const user = users.find(x => x.id == r.member_id) || {};
                const approver = users.find(x => x.username == r.approver || x.id == r.approver) || {};
                
                const roomBadge = room.name ? `<span style="background-color: ${room.color || '#ccc'}; color: #fff; padding: 2px 8px; border-radius: 4px;">${room.name}</span>` : '-';
                const statusBadge = r.status == 1 
                    ? '<span style="background-color: #689F38; color: #fff; padding: 2px 8px; border-radius: 4px;">อนุมัติ</span>' 
                    : '<span style="background-color: #ff9800; color: #fff; padding: 2px 8px; border-radius: 4px;">รออนุมัติ</span>';
                
                const formattedDate = this.formatBookingDate(r.begin, r.end);
                let formattedApproveDate = '-';
                if (r.approved_date && r.status == 1) {
                   const ad = new Date(r.approved_date);
                   const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                   formattedApproveDate = `${ad.getDate().toString().padStart(2, '0')} ${months[ad.getMonth()]} ${ad.getFullYear() + 543} เวลา ${ad.getHours().toString().padStart(2, '0')}:${ad.getMinutes().toString().padStart(2, '0')} น.`;
                }

                // สร้างเนื้อหา HTML สำหรับ Modal ให้เหมือนรูปที่ 3
                let html = `
                <div style="padding: 10px; min-width: 300px; max-height: 80vh; overflow-y: auto;">
                    <h3 class="icon-calendar" style="margin-top: 0; font-size: 1.2em;">รายละเอียดของ การจอง</h3>
                    <table class="border data-table" style="width: 100%; margin-top:10px; border-collapse: collapse;">
                        <tbody>
                            <tr><th style="width:30%; text-align:right; padding:8px; border:1px solid #eee; color:#666;">หัวข้อ</th><td style="padding:8px; border:1px solid #eee;">${r.topic || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">ชื่อห้อง</th><td style="padding:8px; border:1px solid #eee;">${roomBadge}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">อาคาร/สถานที่</th><td style="padding:8px; border:1px solid #eee;">${room.detail || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">จำนวนที่นั่ง</th><td style="padding:8px; border:1px solid #eee;">${room.seats ? room.seats + ' ที่นั่ง' : '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">จำนวนผู้เข้าร่วม</th><td style="padding:8px; border:1px solid #eee;">${r.attendees || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">ชื่อผู้จอง</th><td style="padding:8px; border:1px solid #eee;">${user.name || r.member_id || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">โทรศัพท์</th><td style="padding:8px; border:1px solid #eee; color: #007bff;">${user.phone || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">วันที่จอง</th><td style="padding:8px; border:1px solid #eee;">${formattedDate}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">ใช้สำหรับ</th><td style="padding:8px; border:1px solid #eee;">${r.reason || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">อุปกรณ์</th><td style="padding:8px; border:1px solid #eee;">${r.comment || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">สถานะ</th><td style="padding:8px; border:1px solid #eee;">${statusBadge}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">ผู้ดำเนินการ</th><td style="padding:8px; border:1px solid #eee;">${approver.name || r.approver || '-'}</td></tr>
                            <tr><th style="text-align:right; padding:8px; border:1px solid #eee; color:#666;">วันที่ดำเนินการ</th><td style="padding:8px; border:1px solid #eee;">${formattedApproveDate}</td></tr>
                        </tbody>
                    </table>
                </div>`;
                
                if (window.GModal) {
                    new GModal().show(html);
                } else {
                    alert(`หัวข้อ: ${r.topic}\nเวลา: ${formattedDate}`);
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
            await alert('Session expired. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        const form = event.target;
        
        // Handle multiple checkboxes for equipment
        const equipments = Array.from(form.querySelectorAll('input[name="equipment"]:checked'))
                               .map(cb => cb.value)
                               .join(',');

        const formData = new FormData(form);
        // Overwrite equipment with joined string
        formData.set('equipment', equipments);

        // Combine date and time for begin and end
        const beginDate = form.querySelector('input[name="begin_date"]').value;
        const beginTime = form.querySelector('input[name="begin_time"]').value;
        const endDate = form.querySelector('input[name="end_date"]').value;
        const endTime = form.querySelector('input[name="end_time"]').value;
        
        formData.set('begin', `${beginDate}T${beginTime}`);
        formData.set('end', `${endDate}T${endTime}`);

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
                await alert('บันทึกการจองสำเร็จ');
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
    },

    loadBookingReport: async function() {
        if (!this.user) {
            await alert('กรุณาเข้าสู่ระบบก่อน');
            window.location.href = 'login.html';
            return;
        }

        const container = document.getElementById('report-list-container');
        if (!container) return;

        try {
            // โหลดข้อมูลห้องและผู้ใช้เพื่อแสดงชื่อได้
            const [roomsResp, resResp, usersResp] = await Promise.all([
                fetch(API_URL + '?action=getRooms'),
                fetch(API_URL + '?action=getReservations'),
                fetch(API_URL + '?action=getUsers')
            ]);
            const rooms = await roomsResp.json();
            const reservations = await resResp.json();
            const users = await usersResp.json();

            const roomMap = {};
            rooms.forEach(r => roomMap[r.id] = r.name);

            const userMap = {};
            users.forEach(u => userMap[u.id] = u.name);

            container.innerHTML = '';
            
            // กรองข้อมูล: ถ้าไม่ใช่แอดมิน ให้เห็นเฉพาะของตัวเอง
            const isAdmin = this.user.status == 1;
            const filteredRes = reservations.filter(r => isAdmin || r.member_id == this.user.id);
            
            if (filteredRes.length === 0) {
                container.innerHTML = '<tr><td colspan="7" class="center">ไม่พบข้อมูลการจอง</td></tr>';
                return;
            }

            // เรียงลำดับจากล่าสุดไปเก่าสุด
            filteredRes.sort((a, b) => new Date(b.begin) - new Date(a.begin));

            filteredRes.forEach(r => {
                const tr = document.createElement('tr');
                
                let statusHtml = '';
                if (r.status == 1) {
                    statusHtml = '<span class="icon-valid color-green">อนุมัติแล้ว</span>';
                } else if (r.status == 2) {
                    statusHtml = '<span class="icon-invalid color-red">ไม่อนุมัติ</span>';
                } else {
                    statusHtml = '<span class="icon-waiting color-orange">รออนุมัติ</span>';
                }

                let actionHtml = '-';
                if (isAdmin) {
                    if (r.status == 0) {
                        actionHtml = `
                            <button type="button" class="button green icon-valid" onclick="App.updateReservationStatus('${r.id}', 1)" title="อนุมัติ"></button>
                            <button type="button" class="button red icon-invalid" onclick="App.updateReservationStatus('${r.id}', 2)" title="ไม่อนุมัติ"></button>
                        `;
                    } else if (r.status == 1) {
                         actionHtml = `
                            <button type="button" class="button red icon-invalid" onclick="App.updateReservationStatus('${r.id}', 2)" title="ยกเลิกการอนุมัติ"></button>
                        `;
                    } else {
                         actionHtml = `
                            <button type="button" class="button green icon-valid" onclick="App.updateReservationStatus('${r.id}', 1)" title="อนุมัติใหม่"></button>
                        `;
                    }
                }

                tr.innerHTML = `
                    <td>${r.topic}</td>
                    <td>${roomMap[r.room_id] || 'ไม่ทราบห้อง'}</td>
                    <td>${r.contact_name || userMap[r.member_id] || r.member_id}</td>
                    <td>${App.formatThaiDateTime(r.begin)}</td>
                    <td>${App.formatThaiDateTime(r.end)}</td>
                    <td>${statusHtml}</td>
                    <td class="center">${actionHtml}</td>
                `;
                container.appendChild(tr);
            });
            
        } catch (error) {
            console.error('Failed to load booking report:', error);
            container.innerHTML = '<tr><td colspan="7" class="center color-red">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    },

    updateReservationStatus: async function(id, status) {
        if (!confirm('ยืนยันการเปลี่ยนสถานะการจอง?')) return;
        
        try {
            const formData = new FormData();
            formData.append('action', 'updateReservationStatus');
            formData.append('id', id);
            formData.append('status', status);
            formData.append('approver', this.user.id);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                await alert('อัปเดตสถานะเรียบร้อย');
                this.loadBookingReport();
            } else {
                alert('เกิดข้อผิดพลาด: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('ไม่สามารถอัปเดตสถานะได้');
        }
    },

    loadMemberList: async function() {
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }

        const container = document.getElementById('member-list-container');
        if (!container) return;

        try {
            const response = await fetch(API_URL + '?action=getUsers');
            const users = await response.json();

            container.innerHTML = '';
            
            const isAdmin = this.user.status == 1;
            // ถ้าไม่ใช่แอดมิน ให้เห็นแค่ตัวเอง
            const filteredUsers = isAdmin ? users : users.filter(u => u.id == this.user.id);
            
            if (filteredUsers.length === 0) {
                container.innerHTML = '<tr><td colspan="5" class="center">ไม่พบข้อมูลสมาชิก</td></tr>';
                return;
            }

            filteredUsers.forEach(u => {
                const tr = document.createElement('tr');
                const statusText = u.status == 1 ? '<span class="icon-star0 color-red">ผู้ดูแลระบบ</span>' : 'สมาชิกทั่วไป';
                
                tr.innerHTML = `
                    <td>${u.name || '-'}</td>
                    <td>${u.username}</td>
                    <td>${u.phone || '-'}</td>
                    <td>${statusText}</td>
                    <td class="center">
                        <a href="#editprofile?id=${u.id}" class="button green icon-edit" title="แก้ไข"></a>
                    </td>
                `;
                container.appendChild(tr);
            });
            
        } catch (error) {
            console.error('Failed to load member list:', error);
            container.innerHTML = '<tr><td colspan="5" class="center color-red">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    },

    loadEditProfile: async function() {
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }

        const hash = window.location.hash;
        let editId = this.user.id;
        
        if (hash.includes('?id=')) {
            editId = hash.split('?id=')[1];
        }

        // อนุญาตให้แอดมินแก้ของใครก็ได้, แต่ user ทั่วไปแก้ได้เฉพาะของตัวเอง
        if (this.user.status != 1 && editId != this.user.id) {
            await alert('คุณไม่มีสิทธิ์แก้ไขข้อมูลของผู้อื่น');
            window.location.hash = '#member';
            return;
        }

        try {
            const response = await fetch(API_URL + '?action=getUsers');
            const users = await response.json();
            const editUser = users.find(u => u.id == editId);
            
            if (editUser) {
                document.getElementById('edit_id').value = editUser.id;
                document.getElementById('edit_name').value = editUser.name || '';
                document.getElementById('edit_phone').value = editUser.phone || '';
                
                const statusGroup = document.getElementById('status-group');
                const statusSelect = document.getElementById('edit_status');
                
                if (this.user.status == 1) {
                    statusGroup.style.display = 'block';
                    statusSelect.value = editUser.status;
                } else {
                    // ปิดไม่ให้ผู้ใช้ทั่วไปเปลี่ยนสิทธิ์ตัวเองได้
                    statusGroup.style.display = 'none';
                    statusSelect.value = editUser.status;
                }
            } else {
                alert('ไม่พบข้อมูลสมาชิก');
                window.location.hash = '#member';
            }
        } catch (error) {
            console.error('Failed to load edit profile:', error);
            alert('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        }
    },

    submitProfileEdit: async function(event) {
        event.preventDefault();
        
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        formData.append('action', 'updateUser');
        
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
                await alert('อัปเดตข้อมูลสำเร็จ');
                // ถ้าอัปเดตข้อมูลตัวเอง ให้เปลี่ยนชื่อบนหน้าเว็บด้วย
                if (formData.get('id') == this.user.id) {
                    this.user.name = formData.get('name');
                }
                this.navigate('member');
            } else {
                alert('เกิดข้อผิดพลาด: ' + result.message);
                btn.disabled = false;
                btn.innerText = 'บันทึก';
            }
        } catch (error) {
            console.error('Edit profile error:', error);
            alert('ไม่สามารถบันทึกข้อมูลได้');
            btn.disabled = false;
            btn.innerText = 'บันทึก';
        }
    },

    loadSettings: async function() {
        if (!this.user || this.user.status != 1) {
            await alert('เฉพาะผู้ดูแลระบบเท่านั้น');
            window.location.href = '#home';
            return;
        }

        const container = document.getElementById('category-list-container');
        if (!container) return;

        try {
            // Load Categories
            const catResponse = await fetch(API_URL + '?action=getCategories');
            const categories = await catResponse.json();
            
            // Load Rooms
            const roomResponse = await fetch(API_URL + '?action=getRooms');
            const rooms = await roomResponse.json();

            container.innerHTML = '';
            
            // Render Rooms
            rooms.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>ห้องประชุม</td>
                    <td>${r.id}</td>
                    <td>${r.name}</td>
                    <td><span class="term" style="background-color:${r.color}; color:white; padding:2px 5px; border-radius:3px;">${r.color}</span></td>
                `;
                container.appendChild(tr);
            });

            // Render Categories
            const typeLabels = {
                'department': 'แผนก',
                'purpose': 'วัตถุประสงค์',
                'equipment': 'อุปกรณ์'
            };

            categories.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${typeLabels[c.type] || c.type}</td>
                    <td>${c.id}</td>
                    <td>${c.topic}</td>
                    <td>${c.color ? `<span class="term" style="background-color:${c.color}; color:white; padding:2px 5px; border-radius:3px;">${c.color}</span>` : '-'}</td>
                `;
                container.appendChild(tr);
            });
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            container.innerHTML = '<tr><td colspan="4" class="center color-red">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    }
};
