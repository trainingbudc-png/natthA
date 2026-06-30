// เปลี่ยนข้อความด้านล่างเป็น Web App URL ของพี่
const API_URL = "ใส่_WEB_APP_URL_ของพี่ตรงนี้";

async function login() {
    const name = document.getElementById("name").value;
    if(!name) {
        alert("win");
        return;
    }

    document.getElementById("btn-login").innerText = "กำลังตรวจสอบ...";
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkRole", name: name })
        });
        const data = await res.json();
        
        // จำชื่อไว้ในเครื่อง
        localStorage.setItem("userName", name);
        
        // แยกทางไปหน้า Admin หรือ User
        if (data.role === "Admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "user.html";
        }
    } catch (error) {
        alert("การเชื่อมต่อมีปัญหา กรุณาตรวจสอบ URL");
        document.getElementById("btn-login").innerText = "เข้าสู่ระบบ";
    }
}

async function sendData(status, note) {
    const name = localStorage.getItem("userName");
    const ipadId = document.getElementById("ipadId").value;
    
    if(!name) {
        alert("ไม่พบชื่อผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        window.location.href = "index.html";
        return;
    }
    if(!ipadId) {
        alert("กรุณาระบุรหัส iPad");
        return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "saveLog", name: name, ipadId: ipadId, status: status, note: note })
        });
        alert("บันทึก [" + status + "] ของเครื่อง " + ipadId + " สำเร็จ!");
        document.getElementById("ipadId").value = ""; // ล้างช่องกรอก
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error);
    }
}

function logout() {
    localStorage.removeItem("userName");
    window.location.href = "index.html";
}

// โชว์ชื่อคนล็อกอินตอนโหลดหน้า
window.onload = function() {
    const userName = localStorage.getItem("userName");
    if(document.getElementById("showName") && userName) {
        document.getElementById("showName").innerText = "ผู้ใช้งาน: " + userName;
    }
};