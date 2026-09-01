# ตั้งค่าซิงก์คลังวัตถุดิบไป Google Sheets

ระบบนี้ใช้ Google Apps Script ดึงข้อมูลคลังทุกสาขาจาก timetoeat ตามช่วงเวลาที่ตั้งใน Script Properties (ค่าแนะนำ 2 นาที) และสร้างแท็บแยกตามรหัสสาขาภายใน Google Sheet ไฟล์เดียว โดยไม่ต้อง Deploy Apps Script เป็น Web App

## สิ่งที่ต้องเตรียม

- API ของ timetoeat ต้องเปิดผ่าน HTTPS และ Google เข้าถึงได้ `localhost` ใช้กับการซิงก์จริงไม่ได้
- Token แบบสุ่มที่มีความยาวอย่างน้อย 32 ตัวอักษร และ Google Sheet เปล่าหนึ่งไฟล์

## 1. ตั้งค่า API

สร้าง token แบบสุ่ม ตัวอย่างสำหรับ PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(16)).ToLower()
```

เพิ่ม token ลงใน `.env` ของ API เป็นข้อความตรง ๆ ไม่ต้องใช้ JSON และไม่ต้องแยกตามสาขา:

```dotenv
GOOGLE_SHEETS_SYNC_CREDENTIALS="0123456789abcdef0123456789abcdef"
```

จากนั้น restart API และตรวจว่าปลายทางต่อไปนี้เข้าถึงได้ผ่าน HTTPS:

```text
GET https://ชื่อโดเมน/api/v1/integrations/google-sheets/inventory
X-Integration-Token: <TOKEN>
```

ห้ามใส่ token นี้ในตัวแปร `NEXT_PUBLIC_*` หรือโค้ดฝั่งเบราว์เซอร์

## 2. สร้างและผูก Apps Script

1. สร้าง Google Sheet เปล่า ตั้งชื่อเช่น `timetoeat-inventory-HQ`
2. ใน Sheet เลือก `Extensions → Apps Script`
3. คัดลอกเนื้อหาจาก `integrations/google-apps-script/inventory-sync/Code.gs` ไปแทนโค้ดเดิม
4. เปิด `Project Settings → Show "appsscript.json" manifest file in editor`
5. คัดลอก `integrations/google-apps-script/inventory-sync/appsscript.json` ไปแทน manifest เดิม
6. ใน `Project Settings → Script Properties` เพิ่มค่าต่อไปนี้:

| Property | ตัวอย่าง | หมายเหตุ |
| --- | --- | --- |
| `API_BASE_URL` | `https://api.example.com/api/v1` | ต้องเป็น HTTPS และลงท้ายที่ `/api/v1` |
| `INTEGRATION_TOKEN` | token ที่สร้างไว้ | ใช้ค่าเดียวกับ `GOOGLE_SHEETS_SYNC_CREDENTIALS` |
| `SYNC_INTERVAL_MINUTES` | `2` | ระยะเวลาระหว่างการซิงก์อัตโนมัติ หน่วยเป็นนาที |

ไม่ต้องสร้าง `SPREADSHEET_ID` เอง ฟังก์ชัน setup หรือการซิงก์ครั้งแรกจากสคริปต์ที่ผูกกับ Sheet จะบันทึก ID ของ Sheet ปัจจุบันให้

## 3. เปิดใช้งาน

1. เลือกฟังก์ชัน `setupInventorySync` ใน Apps Script แล้วกด `Run`
2. อนุญาตสิทธิ์เข้าถึง Google Sheets, external request และ trigger
3. กลับไปที่ Google Sheet แล้ว refresh หน้า
4. ตรวจแท็บรูปแบบ `คลัง-WSK`, `คลัง-KHA` และเมนู `timetoeat → ซิงก์คลังตอนนี้`
5. เปิดหน้า `Triggers` ใน Apps Script และตรวจว่ามี `scheduledInventorySync` แบบ time-driven จำนวนหนึ่งรายการ

การรัน `setupInventorySync` ซ้ำจะลบ trigger เดิมและสร้างใหม่หนึ่งรายการ จึงใช้แก้การตั้งค่าได้โดยไม่เกิดงานซ้ำ Google Apps Script ไม่มี trigger แบบทุก 2 นาทีโดยตรง สคริปต์จึงตรวจทุก 1 นาทีและเรียก API เมื่อครบ `SYNC_INTERVAL_MINUTES` ส่วนเมนู `ซิงก์คลังตอนนี้` จะทำงานทันทีโดยไม่รอรอบอัตโนมัติ

## รูปแบบข้อมูลในชีต

- แต่ละสาขาอยู่ในแท็บ `คลัง-<รหัสสาขา>` ภายใน Spreadsheet เดียว
- แถว 1: ชื่อรายงาน
- แถว 2: ชื่อสาขา
- แถว 3: เวลาซิงก์ล่าสุดตามเวลา `Asia/Bangkok`
- แถว 5: `วัตถุดิบ`, `คงเหลือ`, `ราคาล่าสุด`
- คงเหลือและราคาเป็นค่าตัวเลข พร้อมหน่วยและรูปแบบเงินบาท
- ข้อมูลครอบคลุมวัตถุดิบที่เปิดใช้งานทั้งหมด รวมรายการที่คงเหลือเป็นศูนย์

หาก API ตอบกลับไม่สำเร็จหรือข้อมูลไม่ถูกต้อง สคริปต์จะหยุดก่อนแก้ชีต ทำให้ข้อมูลจากการซิงก์สำเร็จครั้งล่าสุดยังอยู่

## แก้ปัญหาเบื้องต้น

- `HTTP 401`: ตรวจ token ทั้งฝั่ง API และ Script Properties ว่าตรงกัน
- `API_BASE_URL ต้องเป็น HTTPS`: เปลี่ยนจาก localhost เป็น URL ของ API ที่ Deploy แล้ว
- `API ส่งข้อมูลที่ไม่ใช่ JSON`: `API_BASE_URL` ชี้ไปหน้าเว็บหรือ proxy ที่ตอบ HTML ให้เปลี่ยนเป็นโดเมน Express API โดยตรง และทดสอบว่า endpoint inventory ตอบ `application/json`
- `API redirect (HTTP 301/302)`: ใช้ URL ปลายทางจาก `Location` เป็น `API_BASE_URL` โดยตรง หากปลายทางเป็นหน้า login ต้องปิด access protection สำหรับ API integration route
- ไม่พบเมนู `timetoeat`: refresh Google Sheet หลังรัน setup และอนุญาตสิทธิ์แล้ว
- ซิงก์อัตโนมัติไม่ทำงาน: ตรวจหน้า `Executions` และ `Triggers` ใน Apps Script
- `SYNC_INTERVAL_MINUTES` ไม่ถูกต้อง: ใช้จำนวนเต็มตั้งแต่ `1` ขึ้นไป เช่น `2`

เมื่อต้องเปลี่ยน token ให้แก้ทั้ง `.env` และ `INTEGRATION_TOKEN` แล้ว restart API โดยไม่ต้องแก้ฐานข้อมูล
