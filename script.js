// ลิงก์ Google Apps Script ของพี่
const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 
// LIFF ID ของพี่
const LIFF_ID = "2010557323-PAyWhGxW"; 

// ฟังก์ชันเปิดระบบ LINE Login ตอนเข้าหน้าเว็บ
async function main() {
    await liff.init({ liffId: LIFF_ID });
    if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        const name = profile.displayName; // ดึงชื่อจาก LINE มาโดยตรง
        
        localStorage.setItem("userName", name);
        checkUserRole(name);
    }
}

// ฟังก์ชันทำงานเมื่อกดปุ่มล็อกอินสีเขียว
function loginWithLine() {
    if (!liff.isLoggedIn()) {
        liff.login(); // ถ้ายังไม่ล็อกอิน ให้เด้งไปหน้าล็อกอินของ LINE
    } else {
        main();
    }
}

// ฟังก์ชันเช็คสิทธิ์ว่าเป็น Admin หรือ User จาก Google Sheets
async function checkUserRole(name) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkRole", name: name })
        });
        const data = await res.json();
        
        // แยกทางไปหน้าไฟล์ html ตามสิทธิ์ที่ระบุใน Sheets
        if (data.role === "Admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "user.html";
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเช็คสิทธิ์ กรุณาตรวจสอบการตั้งค่า Deploy ใน Apps Script ว่าเลือกเป็น Anyone หรือยัง");
    }
}


// ฟังก์ชันส่งข้อมูลการบันทึกสถานะ iPad ไปยัง Google Sheets แท็บ Log (อัปเดตลบการเช็ครหัส iPad)
async function sendData(status, note) {
    const name = localStorage.getItem("userName");
    
    if(!name) {
        alert("ไม่พบชื่อผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        window.location.href = "index.html";
        return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            // ตรง ipadId ผมใส่เป็น "-" ไว้ เพื่อให้ชีตไม่พังเวลารับข้อมูล
            body: JSON.stringify({ action: "saveLog", name: name, ipadId: "-", status: status, note: note })
        });
        alert("บันทึก [" + status + "] สำเร็จ!");
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error);
    }
}

// ฟังก์ชันออกจากระบบ (แก้ไขแก้บั๊กค้างเรียบร้อยแล้ว)
async function logout() {
    try {
        // ต้องเรียกใช้เอนจิ้นของ LINE ก่อน เพื่อให้มันสั่ง Logout ได้ถูกตัว
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
            liff.logout(); // เตะสิทธิ์การจำระบบในไลน์ออก
        }
    } catch (error) {
        console.log("ออกระบบ LINE ไม่สำเร็จ: ", error);
    }
    
    // ลบชื่อออกจากหน่วยความจำของบราวเซอร์ แล้วเด้งกลับหน้า index.html
    localStorage.removeItem("userName");
    window.location.href = "index.html";
}

// ตัวดักตรวจเมื่อหน้าเว็บโหลดเสร็จสิ้น
window.onload = function() {
    // ถ้าอยู่หน้าแรก (ทางเข้า) ให้รันระบบเช็คล็อกอินอัตโนมัติ
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        main();
    } else {
        // ถ้าอยู่หน้าอื่น (user/admin) ให้ดึงชื่อ LINE จากหน่วยความจำมาโชว์บนหัวเว็บ
        const userName = localStorage.getItem("userName");
        if(document.getElementById("showName") && userName) {
            document.getElementById("showName").innerText = "ผู้ใช้งาน LINE: " + userName;
        }
    }
	
// ฟังก์ชันดึงข้อมูลมาแสดงในตาราง
async function fetchStatusData() {
    const tbody = document.getElementById("statusTableBody");
    if (!tbody) return; // ถ้าไม่ได้อยู่หน้า admin ให้ข้ามไป

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">กำลังโหลดข้อมูล... ⏳</td></tr>';

    try {
        // ส่งคำขอไปหา Google Apps Script ด้วย action: "getData"
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData" }) 
        });
        const data = await res.json();
        
        if (data.status === "success" && data.data.length > 0) {
            tbody.innerHTML = ""; // ล้างข้อความกำลังโหลด
            
            // วนลูปสร้างแถวตาราง (สมมติว่าดึงย้อนหลังมา 10 รายการล่าสุด)
            data.data.forEach((row, index) => {
                // เซ็ตสีป้ายสถานะตามข้อความ (ปรับเปลี่ยนได้ตามต้องการ)
                let statusColor = "#6c757d"; // สีเทา (ค่าเริ่มต้น)
                if (row.status === "เตรียมเครื่อง" || row.status === "พร้อมใช้งาน") statusColor = "#dc3545"; // สีแดง
                if (row.status === "รับเครื่องแล้ว" || row.status === "ตรวจคืน") statusColor = "#28a745"; // สีเขียว
                if (row.status === "เครื่องมีปัญหา" || row.status === "รอดำเนินการ") statusColor = "#ff9800"; // สีส้ม
                
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${row.timestamp}</td>
                    <td>${row.name}</td>
                    <td>${row.ipadId || "-"}</td>
                    <td><span class="badge-status" style="background-color: ${statusColor}">${row.status}</span></td>
                    <td>${row.note || "-"}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">ยังไม่มีข้อมูลการทำรายการ</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding: 20px;">ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่</td></tr>';
        console.error("Error fetching data:", error);
    }
}

// อัปเดตตัวดักตรวจเมื่อหน้าเว็บโหลดเสร็จ (แก้จากของเดิมที่มีอยู่แล้ว)
window.onload = function() {
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        main();
    } else {
        const userName = localStorage.getItem("userName");
        if(document.getElementById("showName") && userName) {
            document.getElementById("showName").innerText = "ผู้ใช้งาน LINE: " + userName;
        }
        
        // ถ้าอยู่หน้า admin ให้ดึงตารางเลย และตั้งเวลารีเฟรชทุกๆ 15 วินาที
        if (window.location.pathname.includes("admin.html")) {
            fetchStatusData();
            setInterval(fetchStatusData, 15000); 
        }
    }
};