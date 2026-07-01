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

function onSelectRequest() {
    const selectIdx = document.getElementById("requestSelect").value;
    const recipientGroup = document.getElementById("recipientGroup");
    const recipientInput = document.getElementById("recipientName");
    const countDisplay = document.getElementById("deviceCountDisplay");
    const tableBody = document.getElementById("checklistBody");

    if (selectIdx === "") {
        recipientGroup.style.display = "none";
        recipientInput.value = "";
        countDisplay.value = "";
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">กรุณาเลือกรายการขอเบิกด้านบนเพื่อสร้างรายการเครื่อง</td></tr>';
        return;
    }

    const selectedData = activeRequestsList[selectIdx];
    const count = parseInt(selectedData.note) || 1; 
    
    recipientGroup.style.display = "block";
    recipientInput.value = selectedData.name;  
    countDisplay.value = count + " เครื่อง";   

    // เพิ่มคลาส (Class) ให้ checkbox แต่ละตัว เพื่อให้โค้ดดึงข้อมูลแยกช่องได้
    tableBody.innerHTML = "";
    for(let i = 1; i <= count; i++) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="text" class="input-ipad-id form-control" placeholder="รหัสเครื่อง ${i}" required style="width: 110px;"></td>
            <td><input type="checkbox" class="chk-drive" checked></td>
            <td><input type="checkbox" class="chk-file" checked></td>
            <td><input type="checkbox" class="chk-img" checked></td>
            <td><input type="checkbox" class="chk-safari" checked></td>
        `;
        tableBody.appendChild(tr);
    }
}

async function submitStep1Form() {
    const selectIdx = document.getElementById("requestSelect").value;
    if (selectIdx === "") {
        alert("กรุณาเลือกรายการที่ต้องการจัดเตรียมก่อนครับ!");
        return;
    }

    const adminName = localStorage.getItem("userName");
    const recipientName = document.getElementById("recipientName").value.trim();
    const countText = document.getElementById("deviceCountDisplay").value;

    if (recipientName === "") {
        alert("กรุณาระบุชื่อ 'ผู้ที่จะมารับเครื่อง' ด้วยครับ!");
        return;
    }

    // เก็บรหัสเครื่อง และสถานะของแอปทั้ง 4 แบบรายเครื่อง
    const rows = document.querySelectorAll('#checklistBody tr');
    let ipadDataArray = [];
    let isAllFilled = true;
    let allChecked = true; // เอาไว้เช็คว่าติ๊กครบไหม จะได้เด้งเตือน

    rows.forEach(row => {
        const idInput = row.querySelector('.input-ipad-id');
        if(idInput) {
            const ipadId = idInput.value.trim();
            if(ipadId === "") isAllFilled = false;
            
            // ดึงสถานะติ๊กถูกของแต่ละแอป
            const isDriveChecked = row.querySelector('.chk-drive').checked;
            const isFileChecked = row.querySelector('.chk-file').checked;
            const isImgChecked = row.querySelector('.chk-img').checked;
            const isSafariChecked = row.querySelector('.chk-safari').checked;

            if(!isDriveChecked || !isFileChecked || !isImgChecked || !isSafariChecked) {
                allChecked = false;
            }

            // แพ็คข้อมูลรายเครื่องเตรียมส่งให้ชีต
            ipadDataArray.push({
                id: ipadId,
                drive: isDriveChecked ? "ผ่าน" : "ไม่ผ่าน",
                file: isFileChecked ? "ผ่าน" : "ไม่ผ่าน",
                img: isImgChecked ? "ผ่าน" : "ไม่ผ่าน",
                safari: isSafariChecked ? "ผ่าน" : "ไม่ผ่าน"
            });
        }
    });

    if (!isAllFilled) {
        alert("กรุณาระบุ 'รหัสเครื่อง' ให้ครบทุกรายการก่อนกดบันทึกครับ");
        return;
    }

    if (!allChecked) {
        if (!confirm("พบเช็คลิสต์แอปบางรายการยังไม่ได้ติ๊ก ยืนยันที่จะบันทึกหรือไม่?")) return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "saveStep1", 
                adminName: adminName, 
                ipadData: ipadDataArray, // ส่งเป็นข้อมูลก้อนใหญ่ที่แยกแอปแล้ว
                note: `เตรียมให้: ${recipientName} (${countText})` 
            })
        });

        alert("บันทึกข้อมูลจัดเตรียมเครื่อง Step 1 ลงชีตเรียบร้อยแล้วครับ!");
        window.location.href = "admin.html"; 
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลฟอร์ม: " + error);
    }
}