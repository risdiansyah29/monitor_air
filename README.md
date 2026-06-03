# Sistem Monitoring Tangki Air Berbasis Arduino dan Web

Project ini merupakan sistem monitoring tangki air berbasis **Arduino Uno**, **sensor ultrasonik HC-SR04**, dan **web dashboard**. Sistem ini dibuat untuk memantau ketinggian air secara realtime, menampilkan status kondisi tangki, menyimpan riwayat data, serta memberikan peringatan otomatis menggunakan buzzer ketika air berada pada kondisi kritis.

## Fitur Utama

* Monitoring ketinggian air secara realtime
* Menampilkan persentase volume air
* Menampilkan status kondisi air: Kosong, Rendah, Sedang, dan Penuh
* Indikator LED berdasarkan kondisi air
* Alarm buzzer otomatis saat air rendah, kosong, atau penuh
* Tombol untuk mematikan alarm sementara
* Dashboard web responsif
* Grafik riwayat ketinggian air
* Tabel log data monitoring
* Export data riwayat ke format CSV
* Reset data monitoring
* Integrasi backend dengan database Supabase

## Teknologi yang Digunakan

### Hardware

* Arduino Uno
* Sensor Ultrasonik HC-SR04
* Buzzer
* LED merah, kuning, dan hijau
* Push button
* Resistor 220Ω
* Breadboard
* Kabel jumper
* Kabel USB Type-B

### Software

* HTML
* CSS
* JavaScript
* Node.js
* Express.js
* Socket.IO
* Supabase PostgreSQL
* Arduino IDE

## Struktur Project

```bash
TubesAndesisWeb/
│
├── backend/
│   ├── arduino.js
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
└── README.md
```

## Cara Kerja Sistem

1. Sensor HC-SR04 membaca jarak permukaan air di dalam tangki.
2. Arduino Uno menghitung persentase ketinggian air berdasarkan jarak sensor.
3. Sistem menentukan status air menjadi Kosong, Rendah, Sedang, atau Penuh.
4. LED dan buzzer aktif sesuai kondisi air.
5. Data dikirim dari Arduino ke backend melalui komunikasi serial USB.
6. Backend menerima data, menyimpan ke database Supabase, dan mengirim data realtime ke frontend.
7. Dashboard web menampilkan status air, persentase, grafik, dan riwayat monitoring.

## Kategori Status Air

| Kondisi Air |         Persentase | Output                        |
| ----------- | -----------------: | ----------------------------- |
| Kosong      |               ≤ 5% | LED merah ON, buzzer ON       |
| Rendah      |  > 5% sampai ≤ 25% | LED merah berkedip, buzzer ON |
| Sedang      | > 25% sampai ≤ 75% | LED kuning ON, buzzer OFF     |
| Penuh       |              > 75% | LED hijau ON, buzzer ON       |

## Instalasi Backend

Masuk ke folder backend:

```bash
cd backend
```

Install dependency:

```bash
npm install
```

Jalankan server:

```bash
node server.js
```

atau jika menggunakan nodemon:

```bash
npm run dev
```

## Konfigurasi Environment

Buat file `.env` di dalam folder `backend`, lalu isi konfigurasi sesuai kebutuhan:

```env
PORT=5000
SERIAL_PORT=COM3
BAUD_RATE=9600
DATABASE_URL=postgresql://postgres:dataBase04%23asep@db.apxqvjuquaxhgpplkqwb.supabase.co:5432/postgres
```

Catatan:
Sesuaikan `SERIAL_PORT` dengan port Arduino yang terbaca di perangkat masing-masing.

## Menjalankan Frontend

Buka file berikut di browser:

```bash
frontend/index.html
```

atau akses melalui server lokal jika frontend sudah dihubungkan dengan backend.

## Format Data Arduino

Data dari Arduino dikirim ke backend dengan format:

```text
distance,water_percentage,status,buzzer_status
```

Contoh:

```text
15.5,75.0,PENUH,ON
```

## API Backend

| Method | Endpoint          | Fungsi                                    |
| ------ | ----------------- | ----------------------------------------- |
| GET    | `/api/history`    | Mengambil riwayat data monitoring         |
| GET    | `/api/export-csv` | Mengunduh riwayat data dalam format CSV   |
| DELETE | `/api/reset`      | Menghapus seluruh data riwayat monitoring |

## Tujuan Project

Project ini dibuat sebagai tugas besar mata kuliah **Analisis Desain dan Sistem**. Tujuan utama sistem adalah membantu pengguna dalam memantau kondisi tangki air secara otomatis, mengurangi risiko kehabisan air, mencegah air meluap, serta mendukung penerapan konsep smart home sederhana.

## Tim Pengembang

Kelompok 4
Program Studi S1 Teknik Komputer
Telkom University

Anggota:

* Risdiansyah
* Saraya Abharina
* Samuel Moreno Butar Butar

## Status Project

Project ini masih dalam tahap pengembangan dan pengujian. Beberapa fitur dapat dikembangkan lebih lanjut, seperti notifikasi mobile, autentikasi pengguna, dan integrasi IoT berbasis WiFi.
