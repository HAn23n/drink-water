# Drink-Water PWA — Design Spec

วันที่: 2026-07-17
สถานะ: อนุมัติแล้ว (พร้อมเข้าขั้น implementation plan)

---

## 1. เป้าหมายและขอบเขต

แอปนับการดื่มน้ำรายวันแบบ Progressive Web App (PWA) ที่:
- คำนวณเป้าหมายน้ำต่อวันจากน้ำหนัก + ระดับกิจกรรม
- บันทึกและสะสมปริมาณน้ำที่ดื่มในแต่ละวัน
- มีการแจ้งเตือนให้ดื่มน้ำ (เปิด/ปิดได้ ตั้งช่วงเวลาได้)
- มีโปรไฟล์ส่วนตัวและระบบ login แยกแต่ละ user
- ใช้ของฟรีทั้งหมด และ deploy เป็นลิงก์ให้คนอื่นใช้งานได้จริง

**Non-goals (v1):** dark mode, achievements/badges, หลายภาษา, แยกชนิดเครื่องดื่ม, ปรับเป้าตามอากาศ, export/แชร์รายงาน, อัปโหลดรูปโปรไฟล์

---

## 2. Tech Stack (ฟรีทั้งหมด)

| ส่วน | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Frontend | React + Vite + TypeScript | |
| Styling | Tailwind CSS | ธีมขาว + ฟ้า |
| Auth + Database | Supabase (free tier) | Auth, Postgres, Row Level Security |
| PWA | vite-plugin-pwa | manifest + service worker |
| แจ้งเตือน A | Notification API + Service Worker | local notification |
| แจ้งเตือน B | Supabase Edge Functions + pg_cron + Web Push (VAPID) | push แม้ปิดแอป (ฟรี) |
| กราฟ | Recharts | |
| Deploy | Vercel (free) | frontend; Supabase โฮสต์หลังบ้าน |

**ความเป็นฟรี:** Vercel free tier + Supabase free tier ครอบคลุมการใช้งานส่วนตัว/กลุ่มเล็กได้ทั้งหมด ไม่มีค่าใช้จ่าย

---

## 3. หน้าจอ (5 หน้า)

### 3.1 Login / Sign-up
- อีเมล + รหัสผ่าน
- ปุ่ม "เข้าสู่ระบบด้วย Google" (Supabase OAuth)
- ลิงก์สลับ login/สมัคร, reset password

### 3.2 Onboarding (ครั้งแรกหลังสมัคร)
- กรอก: ชื่อที่แสดง, น้ำหนัก (kg), ส่วนสูง (cm), ระดับกิจกรรม
- แสดงเป้าหมายที่คำนวณได้ทันที + ให้แก้เองได้
- บันทึกแล้วเข้า Home

### 3.3 Home 🌊 (หน้าหลัก)
- **วงกลมคลื่นน้ำ (wave circle):** ระดับน้ำในวงกลมสูงตาม % ที่ดื่มวันนี้ มี animation คลื่นไหว
- แสดงตัวเลข: ดื่มแล้ว X ml / เป้าหมาย Y ml (Z%)
- ปุ่มเพิ่มเร็ว: +1 แก้ว (250ml), +1 ขวด (600ml), กำหนดเอง
- รายการ log ของวันนี้ + ปุ่ม undo/แก้ไข/ลบ แต่ละรายการ
- ฉลอง (animation/ยินดี) เมื่อดื่มครบเป้า

### 3.4 History
- กราฟรายวัน (7 วันล่าสุด) และรายสัปดาห์
- ค่าเฉลี่ย + จำนวนวันที่ดื่มครบเป้า
- **Streak:** ดื่มครบเป้าติดต่อกันกี่วัน

### 3.5 Profile / Settings
- แก้ข้อมูลร่างกาย (น้ำหนัก/ส่วนสูง/กิจกรรม) → คำนวณเป้าใหม่ หรือกำหนดเป้าเอง
- แก้ขนาดขวด/แก้วอ้างอิง
- เปิด/ปิดแจ้งเตือน + ตั้งช่วงเวลา (start–end) + ระยะห่าง (interval)
- ปุ่ม logout
- ปุ่ม "ติดตั้งลงจอ" (PWA install prompt) เมื่อ browser รองรับ

---

## 4. สูตรคำนวณเป้าหมาย

```
daily_goal_ml = round(weight_kg × 35 × activity_multiplier)
```

| ระดับกิจกรรม | activity_multiplier |
|---|---|
| เบา (sedentary) | 0.9 |
| ปกติ (normal) | 1.0 |
| ออกกำลังกาย (active) | 1.15 |
| หนักมาก (very active) | 1.3 |

- ส่วนสูงเก็บไว้เพื่อแสดง BMI เท่านั้น ไม่ใช้ในสูตรน้ำ
- ผู้ใช้กำหนด `daily_goal_ml` เองได้ (override ค่าที่คำนวณ)
- ค่า default: แก้ว = 250ml, ขวด = 600ml

---

## 5. โครงข้อมูล (Supabase Postgres + RLS)

### ตาราง `profiles`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid (PK, FK → auth.users) | |
| display_name | text | |
| weight_kg | numeric | |
| height_cm | numeric | สำหรับ BMI |
| activity_level | text | sedentary/normal/active/very_active |
| daily_goal_ml | integer | คำนวณหรือ override |
| glass_size_ml | integer | default 250 |
| bottle_size_ml | integer | default 600 |
| reminder_enabled | boolean | default false |
| reminder_interval_min | integer | เช่น 120 |
| reminder_start | time | เช่น 08:00 |
| reminder_end | time | เช่น 22:00 |
| timezone | text | IANA เช่น Asia/Bangkok |
| created_at | timestamptz | |

### ตาราง `water_logs`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → auth.users) | |
| amount_ml | integer | |
| logged_at | timestamptz | เวลาจริงที่กด |
| log_date | date | วันที่ตาม timezone ผู้ใช้ (ใช้ group รายวัน) |
| client_id | text | สำหรับ dedupe ตอน offline sync |

### ตาราง `push_subscriptions` (สำหรับแจ้งเตือน B)
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → auth.users) | |
| endpoint | text | |
| p256dh | text | |
| auth | text | |
| created_at | timestamptz | |

**Row Level Security:** ทุกตารางเปิด RLS — user อ่าน/เขียนได้เฉพาะ row ที่ `user_id = auth.uid()` เท่านั้น ปลอดภัยแม้ API เปิดสาธารณะ

---

## 6. การจัดการวันที่ / timezone

- `log_date` คำนวณจาก `logged_at` แปลงเป็น timezone ของผู้ใช้ (จาก `profiles.timezone`)
- "วันนี้" บนหน้า Home = ช่วง 00:00–24:00 ตาม timezone ผู้ใช้
- รีเซ็ตยอดสะสมอัตโนมัติเมื่อข้ามเที่ยงคืน (คำนวณฝั่ง client จาก log_date, ไม่ต้องมี job รีเซ็ต)

---

## 7. Offline-first + Sync

- การกดเพิ่ม log ต้องทำงานได้แม้ออฟไลน์
- เก็บ log ที่ยังไม่ sync ไว้ใน local queue (IndexedDB) พร้อม `client_id` (uuid ฝั่ง client)
- เมื่อออนไลน์: ส่ง log ที่ค้างขึ้น Supabase, ใช้ `client_id` กัน insert ซ้ำ (upsert)
- UI แสดงยอดจาก merge ของ (server data + local queue)

---

## 8. การแจ้งเตือน

### แบบ A — Local (ฐาน, ทำก่อน)
- ขอ permission ผ่าน Notification API (ผู้ใช้กดเปิดเอง)
- Service worker ตั้ง notification ตามช่วงเวลา + interval ขณะแอปเปิด/ติดตั้งค้าง
- เปิด/ปิดได้จากหน้า Settings

### แบบ B — Web Push (layer ทับ, ฟรี)
- สร้าง VAPID keys, เก็บ subscription ใน `push_subscriptions`
- `pg_cron` เรียก Edge Function ตามรอบ → ตรวจ user ที่ถึงเวลาเตือน (ตาม reminder settings + timezone) แล้วส่ง Web Push
- ทำงานแม้ปิดแอป (บนเบราว์เซอร์/OS ที่รองรับ; iOS ต้องติดตั้งลงจอ iOS 16.4+)

### Fallback
- ถ้า permission ถูกปฏิเสธ หรือ push ไม่รองรับ → ใช้ in-app reminder ขณะเปิดแอป และแจ้ง user ว่าเปิดสิทธิ์ยังไง

---

## 9. ธีม (Design)

- โทนสี: ขาว + ฟ้า (พื้นขาว, accent ฟ้าน้ำ, ไล่เฉดฟ้าสำหรับคลื่นน้ำ)
- Component เด่น: วงกลมคลื่นน้ำบนหน้า Home (SVG/CSS wave animation)
- เน้น mobile-first (ใช้บนมือถือเป็นหลัก) แต่ responsive ขึ้น desktop ได้

---

## 10. โครงสร้าง unit (แยกความรับผิดชอบ)

- `lib/supabase` — client + auth helpers
- `lib/water` — สูตรคำนวณเป้าหมาย, การรวมยอดรายวัน (pure functions, เทสง่าย)
- `lib/offlineQueue` — IndexedDB queue + sync logic
- `lib/notifications` — permission, local schedule, push subscribe
- `features/auth` — หน้า login/signup
- `features/onboarding` — หน้ากรอกข้อมูลครั้งแรก
- `features/home` — wave circle + quick add + today logs
- `features/history` — กราฟ + streak
- `features/profile` — settings
- `components/WaveCircle` — วงกลมคลื่นน้ำ (รับ % เป็น prop)

---

## 11. เกณฑ์ว่า "เสร็จ" (Success Criteria)

- สมัคร/login ด้วยอีเมล และ Google ได้
- กรอกข้อมูลร่างกาย → ได้เป้าหมายน้ำอัตโนมัติ
- เพิ่ม/undo/แก้/ลบ log ได้ และยอดสะสมถูกต้อง
- ยอดรีเซ็ตเมื่อข้ามวัน ตาม timezone ผู้ใช้
- เพิ่ม log ตอนออฟไลน์ได้ แล้ว sync ขึ้น server เมื่อออนไลน์ (ไม่ซ้ำ)
- เปิดแจ้งเตือนแล้วได้รับ notification ตามเวลา (A; และ B เมื่อปิดแอปบนอุปกรณ์ที่รองรับ)
- ติดตั้งเป็น PWA ลงจอได้
- deploy ขึ้น Vercel แล้วเปิดจากลิงก์บนมือถือคนอื่นได้
