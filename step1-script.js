// ดึงลิงก์ API เดิมของพี่มาใช้งานสืบต่อระบบ
const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 

let activeRequestsList = []; // เก็บตัวแปรจำอาร์เรย์รายการทั้งหมดที่ดึงมาจากชีต

// โหลดข้อมูลอัตโนมัติเมื่อเปิดหน้าฟอร์มขึ้นมาครั้งแรก
window.onload = function() {
    // 1. ดึงชื่อแอดมินคนปัจจุบันจากระบบเก็บความจำบราวเซอร์ที่ทำไว้รอบที่แล้วมาแสดงผลล็อกไว้เลย
    const adminName = localStorage.getItem("userName");
    if (adminName) {
        document.getElementById("adminNameDisplay").value = "ผู้ดำเนินการ: " + adminName;
    } else {
        alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบผ่านหน้าแรกใหม่ครับ");
        window.location.href = "index.html";
        return;
    }

    // 2. สั่งเชื่อมฐานข้อมูลดึงรายการคำขอทันทีไม่ต้องพิมพ์
    loadPendingRequests();
};

// ฟังก์ชันเชื่อมข้อมูลไปหาชีตเพื่อเอาคำขอเบิกที่ค้างอยู่มาใช้
async function loadPendingRequests() {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData" }) // ลิงก์ดึงข้อมูลจากตาราง Log/Request ตัวที่เราทำกันรอบก่อน
        });
        const result = await res.json();
        
        const selectElement = document.getElementById("requestSelect");
        selectElement.innerHTML = '<option value="">-- กรุณาเลือกรายการเบิกอุปกรณ์ --</option>';

        if (result.status === "success" && result.data.length > 0) {
            // กรองหาเฉพาะรายการที่สถานะเป็น "ขอเบิก" หรือ "รอดำเนินการ" (ลิ้งก์จากฝั่ง User ที่เคยกดไว้)
            activeRequestsList = result.data.filter(item => item.status === "ขอเบิก" || item.status === "รอดำเนินการ");

            if(activeRequestsList.length === 0) {
                selectElement.innerHTML = '<option value="">❌ ไม่มีรายการขอเบิกค้างอยู่ในระบบ</option>';
                return;
            }

            activeRequestsList.forEach((req, idx) => {
                const opt = document.createElement("option");
                opt.value = idx; // ผูกดัชนีเข้ากับตำแหน่งของอาร์เรย์
                opt.innerText = `คิวที่ ${idx + 1} | คุณ ${req.name} (${req.timestamp})`;
                selectElement.appendChild(opt);
            });
        } else {
            selectElement.innerHTML = '<option value="">❌ ไม่พบข้อมูลการเบิกจากระบบ</option>';
        }
    } catch (error) {
        console.error("Error linking request data:", error);
        document.getElementById("requestSelect").innerHTML = '<option value="">❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล</option>';
    }
}

// ทำงานอัตโนมัติเมื่อเลือกคิวขอเบิก (ไม่ต้องพิมข้อมูลใหม่)
function onSelectRequest() {
    const selectIdx = document.getElementById("requestSelect").value;
    const detailBox = document.getElementById("requestDetailBox");
    const tableBody = document.getElementById("checklistBody");

    if (selectIdx === "") {
        detailBox.style.display = "none";
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">กรุณาเลือกรายการขอเบิกด้านบนเพื่อสร้างรายการเครื่อง</td></tr>';
        return;
    }

    // ดึงค่าไอเท็มที่เลือกผ่านดัชนีที่เซ็ตไว้
    const selectedData = activeRequestsList[selectIdx];
    
    // 1. หยอดข้อมูลลงกล่องรายละเอียดผู้เบิกให้แบบ Real-time
    document.getElementById("detailUser").innerText = selectedData.name;
    // ตรวจสอบจำนวนเครื่อง ถ้าไม่มีการระบุชัดเจนใน Note ให้ตีเป็นค่าพื้นฐาน 1 เครื่อง หรือดึงตามตัวเลขจริง
    const count = parseInt(selectedData.note) || 1; 
    document.getElementById("detailCount").innerText = count;
    detailBox.style.display = "block";

    // 2. สร้างแถวตารางเช็คลิสต์แอปอัตโนมัติตามจำนวนเครื่องตามดีไซน์ของพี่
    tableBody.innerHTML = "";
    for(let i = 1; i <= count; i++) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>เครื่องที่ ${i}</strong></td>
            <td><input type="checkbox" class="chk-drive" checked></td>
            <td><input type="checkbox" class="chk-file" checked></td>
            <td><input type="checkbox" class="chk-img" checked></td>
            <td><input type="checkbox" class="chk-safari" checked></td>
        `;
        tableBody.appendChild(tr);
    }
}

// ฟังก์ชันกดส่งข้อมูลกลับไปบันทึก
async function submitStep1Form() {
    const selectIdx = document.getElementById("requestSelect").value;
    if (selectIdx === "") {
        alert("กรุณาเลือกรายการที่ต้องการจัดเตรียมก่อนครับ!");
        return;
    }

    const selectedRequest = activeRequestsList[selectIdx];
    const adminName = localStorage.getItem("userName");

    // ตรวจสอบเช็คลิสต์ทุกเครื่องว่าติ๊กถูกครบหรือไม่
    const allCheckboxes = document.querySelectorAll('#checklistBody input[type="checkbox"]');
    let allChecked = true;
    allCheckboxes.forEach(chk => { if(!chk.checked) allChecked = false; });

    if (!allChecked) {
        if (!confirm("พบเช็คลิสต์บางรายการยังไม่ได้ถูกตรวจสอบ ยืนยันที่จะบันทึกหรือไม่?")) {
            return;
        }
    }

    try {
        // ส่งบันทึกคำสั่ง SaveLog เพื่ออัปเดตสถานะคิวนี้ว่าเตรียมเสร็จเรียบร้อยพร้อมใช้งาน
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "saveLog", 
                name: selectedRequest.name, // อ้างอิงชื่อผู้เบิกเดิมตามข้อมูลที่ดึงมา
                ipadId: "จัดเตรียมโดย: " + adminName, 
                status: "เตรียมเครื่อง", 
                note: "พร้อมใช้งาน (ตรวจสอบแอปเรียบร้อย)" 
            })
        });

        alert("ส่งรายงานข้อมูลจัดเตรียมเครื่อง Step 1 เรียบร้อยแล้วครับ!");
        window.location.href = "admin.html"; // วาร์ปกลับหน้าหลักแดชบอร์ด
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลฟอร์ม: " + error);
    }
}