const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 
let activeRequestsList = []; 

window.onload = function() {
    const adminName = localStorage.getItem("userName");
    if (adminName) {
        document.getElementById("adminNameDisplay").value = "ผู้ดำเนินการ: " + adminName;
    } else {
        alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบผ่านหน้าแรกใหม่ครับ");
        window.location.href = "index.html";
        return;
    }
    loadPendingRequests();
};

async function loadPendingRequests() {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData" }) 
        });
        const result = await res.json();
        
        const selectElement = document.getElementById("requestSelect");
        selectElement.innerHTML = '<option value="">-- กรุณาเลือกรายการเบิกอุปกรณ์ --</option>';

        if (result.status === "success" && result.data.length > 0) {
            activeRequestsList = result.data.filter(item => item.status === "ขอเบิก" || item.status === "รอดำเนินการ");

            if(activeRequestsList.length === 0) {
                selectElement.innerHTML = '<option value="">❌ ไม่มีรายการขอเบิกค้างอยู่ในระบบ</option>';
                return;
            }

            activeRequestsList.forEach((req, idx) => {
                const opt = document.createElement("option");
                opt.value = idx; 
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

// ฟังก์ชันทำงานอัตโนมัติเมื่อเลือกคิวขอเบิก
function onSelectRequest() {
    const selectIdx = document.getElementById("requestSelect").value;
    const recipientGroup = document.getElementById("recipientGroup");
    const recipientInput = document.getElementById("recipientName");
    const countDisplay = document.getElementById("deviceCountDisplay");
    const tableBody = document.getElementById("checklistBody");

    // ถ้าไม่ได้เลือกคิว ให้เคลียร์และซ่อนช่องข้อมูล
    if (selectIdx === "") {
        recipientGroup.style.display = "none";
        recipientInput.value = "";
        countDisplay.value = "";
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">กรุณาเลือกรายการขอเบิกด้านบนเพื่อสร้างรายการเครื่อง</td></tr>';
        return;
    }

    // ดึงค่าไอเท็มที่เลือก
    const selectedData = activeRequestsList[selectIdx];
    const count = parseInt(selectedData.note) || 1; 
    
    // โชว์กล่องและหยอดข้อมูลอัตโนมัติ
    recipientGroup.style.display = "block";
    recipientInput.value = selectedData.name;  // โชว์ชื่อผู้เบิก
    countDisplay.value = count + " เครื่อง";   // โชว์จำนวนเครื่อง

    // สร้างตารางเช็คลิสต์และช่องกรอกรหัสเครื่องตามจำนวนเครื่องที่ดึงมาได้
    tableBody.innerHTML = "";
    for(let i = 1; i <= count; i++) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="text" class="input-ipad-id form-control" placeholder="รหัสเครื่อง ${i}" required style="width: 110px;"></td>
            <td><input type="checkbox" checked></td>
            <td><input type="checkbox" checked></td>
            <td><input type="checkbox" checked></td>
            <td><input type="checkbox" checked></td>
        `;
        tableBody.appendChild(tr);
    }
}

// ฟังก์ชันกดส่งข้อมูลบันทึก
async function submitStep1Form() {
    const selectIdx = document.getElementById("requestSelect").value;
    if (selectIdx === "") {
        alert("กรุณาเลือกรายการที่ต้องการจัดเตรียมก่อนครับ!");
        return;
    }

    const adminName = localStorage.getItem("userName");
    
    // ดึงข้อมูลผู้รับและจำนวนเครื่อง
    const recipientName = document.getElementById("recipientName").value.trim();
    const countText = document.getElementById("deviceCountDisplay").value; // ดึงคำว่า "X เครื่อง" มาใช้ได้เลย

    if (recipientName === "") {
        alert("กรุณาระบุชื่อ 'ผู้ที่จะมารับเครื่อง' ด้วยครับ!");
        return;
    }

    // ตรวจสอบช่องกรอกรหัสเครื่อง
    const idInputs = document.querySelectorAll('.input-ipad-id');
    let ipadIdsArray = [];
    let isAllFilled = true;

    idInputs.forEach(input => {
        if(input.value.trim() === "") isAllFilled = false;
        else ipadIdsArray.push(input.value.trim());
    });

    if (!isAllFilled) {
        alert("กรุณาระบุ 'รหัสเครื่อง' ให้ครบทุกรายการก่อนกดบันทึกครับ");
        return;
    }

    // ตรวจสอบเช็คลิสต์
    const allCheckboxes = document.querySelectorAll('#checklistBody input[type="checkbox"]');
    let allChecked = true;
    allCheckboxes.forEach(chk => { if(!chk.checked) allChecked = false; });

    if (!allChecked) {
        if (!confirm("พบเช็คลิสต์แอปบางรายการยังไม่ได้ติ๊ก ยืนยันที่จะบันทึกหรือไม่?")) return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "saveStep1", 
                adminName: adminName, 
                ipadIds: ipadIdsArray, 
                // บันทึกหมายเหตุลงชีต แบบรวมชื่อและจำนวนเครื่องให้เรียบร้อย
                note: `เตรียมให้: ${recipientName} (${countText}) | ตรวจสอบแอปเรียบร้อย` 
            })
        });

        alert("บันทึกข้อมูลจัดเตรียมเครื่อง Step 1 ลงชีตเรียบร้อยแล้วครับ!");
        window.location.href = "admin.html"; 
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลฟอร์ม: " + error);
    }
}
