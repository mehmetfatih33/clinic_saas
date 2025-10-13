# 💳 Ödeme Sistemi - Kullanım Kılavuzu

## ✅ Tamamlanan İşlemler

### 1️⃣ Prisma Schema Güncellemesi
- ✅ `Payment` modeli eklendi
- ✅ İlişkiler kuruldu (Patient, User, Clinic)
- ✅ Database migration yapıldı (`npx prisma db push`)

### 2️⃣ API Endpoint Oluşturuldu
**Dosya:** `src/app/api/payments/route.ts`

#### POST /api/payments
Yeni ödeme kaydeder ve otomatik olarak:
- Ödemeyi Payment tablosuna ekler
- Patient.totalPayments değerini günceller
- SpecialistProfile.totalRevenue değerini günceller
- Uzman payını otomatik hesaplar (defaultShare'e göre)

**Request Body:**
```json
{
  "patientId": "hasta_id",
  "amount": 1000
}
```

**Response:**
```json
{
  "message": "Ödeme başarıyla kaydedildi",
  "payment": {
    "amount": 1000,
    "specialistCut": 600,
    "clinicCut": 400,
    "share": "60%"
  }
}
```

#### GET /api/payments
Ödemeleri listeler:
- `GET /api/payments` - Tüm ödemeler
- `GET /api/payments?patientId=xxx` - Belirli hasta ödemeleri

### 3️⃣ UI Komponenti Eklendi
**Dosya:** `src/app/(dashboard)/patients/[id]/page.tsx`

Hasta detay sayfasına eklenen özellikler:
- 💳 Ödeme Al formu
- Otomatik uzman kontrolü
- Real-time güncelleme (React Query)
- Başarı bildirimleri (Toast)
- Input validasyonu

## 🧪 Test Adımları

### 1. Uygulamayı Başlat
```bash
cd clinic-saas
npm run dev
```

### 2. Sisteme Giriş Yap
- http://localhost:3000/login
- Admin veya Asistan hesabıyla giriş yapın

### 3. Hasta Oluştur (Eğer yoksa)
1. "Hastalar" menüsüne git
2. "Yeni Hasta" butonuna tıkla
3. Hasta bilgilerini doldur
4. **ÖNEMLİ:** Bir uzman seç
5. Kaydet

### 4. Ödeme Kaydı Yap
1. Hasta listesinden bir hasta seç (detay sayfasına git)
2. Sayfanın alt kısmında "💳 Ödeme Kaydı" kartını bul
3. Ödeme tutarını gir (örn: 500)
4. "💳 Ödeme Al" butonuna tıkla
5. Başarı mesajını kontrol et

### 5. Sonuçları Kontrol Et

#### A) Hasta İstatistikleri
- Hasta detay sayfasında "Toplam Ödeme" değerinin güncellendiğini gör

#### B) Uzman Dashboard
1. "Uzmanlar" menüsüne git
2. Ödeme aldığınız hastanın uzmanına tıkla
3. `totalRevenue` değerinin arttığını kontrol et

#### C) Database Kontrolü (Opsiyonel)
```bash
npx prisma studio
```
- Payment tablosunu aç
- Yeni kaydı gör
- specialistCut ve clinicCut değerlerini kontrol et

## 📊 Ödeme Akışı

```
Kullanıcı Ödeme Girer
        ↓
API: /api/payments POST
        ↓
1. Patient verisi getir
2. Uzman defaultShare oranını al
3. Ödemeyi böl:
   - specialistCut = amount × share / 100
   - clinicCut = amount - specialistCut
        ↓
Database Transaction:
   ├─ Payment kaydı oluştur
   ├─ Patient.totalPayments += amount
   └─ SpecialistProfile.totalRevenue += specialistCut
        ↓
Response gönder
        ↓
UI güncellenir (React Query)
```

## 🎯 Örnek Senaryo

### Senaryo: Dr. Ahmet'in Hastası için Ödeme

1. **Başlangıç:**
   - Hasta: Mehmet Yılmaz
   - Atanan Uzman: Dr. Ahmet (defaultShare: 60%)
   - Patient.totalPayments: ₺0
   - SpecialistProfile.totalRevenue: ₺0

2. **Ödeme:**
   - Tutar: ₺1,000

3. **Hesaplama:**
   - Uzman Payı: ₺1,000 × 60% = ₺600
   - Klinik Payı: ₺1,000 - ₺600 = ₺400

4. **Sonuç:**
   - Patient.totalPayments: ₺1,000
   - SpecialistProfile.totalRevenue: ₺600
   - Payment tablosuna kayıt eklendi

## 🔒 Güvenlik Özellikleri

- ✅ NextAuth oturum kontrolü
- ✅ Clinic bazlı veri izolasyonu
- ✅ Database transaction (atomik işlem)
- ✅ Input validasyonu
- ✅ Uzman atama kontrolü

## 🐛 Hata Senaryoları ve Çözümleri

### Hata: "Bu hasta henüz bir uzmana atanmamış"
**Çözüm:** Hasta detay sayfasında "Atanan Uzman" alanından uzman seç

### Hata: "Geçersiz miktar"
**Çözüm:** Pozitif bir sayı gir

### Hata: "Ödeme kaydedilirken hata oluştu"
**Çözüm:** 
1. Console logları kontrol et
2. Database bağlantısını doğrula
3. Prisma Client güncel mi kontrol et: `npx prisma generate`

## 🚀 Sonraki Adımlar

Bu ödeme sistemi şu özelliklere temel oluşturur:

1. **📊 Specialist Dashboard** - Gelir grafikleri
2. **💰 Mali Raporlar** - Detaylı finansal raporlama
3. **🧾 Fatura Sistemi** - Otomatik fatura oluşturma
4. **📈 Analitik** - Ödeme trendleri ve tahminler

## 💡 Önemli Notlar

1. **Uzman Payı Değişikliği:** Her uzmanın `defaultShare` değeri `SpecialistProfile` tablosunda tutulur
2. **Geçmiş Ödemeler:** Ödeme kaydedildikten sonra değiştirilemez
3. **Transaction Güvenliği:** Tüm işlemler atomic transaction içinde gerçekleşir
4. **Real-time Updates:** React Query sayesinde veriler otomatik güncellenir

---

✅ **Sistem hazır ve test edilebilir!**
