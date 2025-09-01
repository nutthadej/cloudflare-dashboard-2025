# Cloudflare Auto-Update Dashboard

เว็บแดชบอร์ดสำหรับติดตาม Cloudflare zones พร้อมระบบ auto-update แบบ real-time

## ✨ Features

- 🔗 เชื่อมต่อกับ Cloudflare zone ใดก็ได้
- 📊 แสดงข้อมูล zone (SSL status, Dev mode, Plan)
- 🌐 แสดง DNS records ทั้งหมด
- 🔄 Auto-update ทุก 30 วินาที (เปิด/ปิดได้)
- 💾 บันทึกการตั้งค่าใน browser
- 📱 Responsive design รองรับทุก device
- 🎨 UI สวยงามแบบ glassmorphism

## 🚀 การใช้งาน

1. **เปิดไฟล์ `index.html` ใน browser**
2. **ใส่ Cloudflare API Token** 
   - ไปที่ [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - สร้าง token ใหม่ด้วย permission "Zone:Read"
   - ใส่ token และกด Save
3. **ใส่ domain หรือ Zone ID** เช่น `example.com` หรือ Zone ID
4. **กดปุ่ม Connect** 
5. **เปิด auto-update** หากต้องการให้อัปเดตอัตโนมัติ

## 🔑 Cloudflare API Token

สำหรับใช้งานเว็บนี้ คุณต้องมี Cloudflare API Token:

1. ไปที่ [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. คลิก "Create Token"
3. ใช้ template "Custom token"
4. ตั้งค่า Permissions:
   - **Zone** : **Zone** : **Read**
   - **Zone** : **Zone Settings** : **Read** 
   - **Zone** : **DNS** : **Read**
5. Zone Resources: **Include All zones** (หรือเฉพาะ zones ที่ต้องการ)
6. Copy token และใส่ในเว็บ

## 📁 โครงสร้างไฟล์

```
├── index.html          # หน้าหลักของเว็บ
├── styles.css          # CSS สำหรับ styling  
├── script.js           # JavaScript logic
├── README.md           # เอกสารนี้
└── .github/
    └── copilot-instructions.md
```

## 🔧 การพัฒนาต่อ

### เพิ่ม Features ใหม่:
- Analytics dashboard
- Page Rules management  
- Firewall Rules monitoring
- Performance insights
- Worker scripts status

### Deploy Options:
- GitHub Pages (static hosting)
- Netlify/Vercel (auto-deploy)
- GitHub Actions (CI/CD)

## 🌐 การ Deploy

### GitHub Pages:
1. Push โค้ดไปยัง GitHub repository
2. ไปที่ Settings > Pages
3. เลือก source เป็น main branch
4. เว็บจะทำงานที่ `https://username.github.io/repository-name`

### Local Development:
เปิดไฟล์ `index.html` ใน browser หรือใช้ local server:

```bash
# Python
python -m http.server 3000

# Node.js
npx serve .

# PHP
php -S localhost:3000
```

## 🔑 Cloudflare API

เว็บนี้ใช้ Cloudflare API v4:
- **Zone info:** `GET /zones/{zone_id}`
- **DNS Records:** `GET /zones/{zone_id}/dns_records`
- **Analytics:** `GET /zones/{zone_id}/analytics/dashboard`
- **Rate limit:** ตามแผนที่ใช้ (Free: 1,200 requests/5 minutes)

## 🔒 ความปลอดภัย

- API Token จัดเก็บใน localStorage ของ browser
- ไม่มีการส่ง token ไปยัง server ภายนอก
- ใช้ HTTPS สำหรับการเรียก API เท่านั้น
- แนะนำให้สร้าง token ที่มี permission จำกัดเฉพาะที่จำเป็น

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+  
- ✅ Safari 14+
- ✅ Edge 90+

## 🎯 พร้อมใช้งาน!

เว็บนี้พร้อมใช้งานแล้ว เพียงเตรียม Cloudflare API Token และเปิด `index.html` ในบราวเซอร์!
