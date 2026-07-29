# Panduan Cloudflare Multiplayer — Schoolyard Buddies

## 1. Apa yang pakej ini buat

Satu Cloudflare Worker menghidangkan fail game dan menerima sambungan WebSocket pada `/ws`. Setiap nama bilik diarahkan kepada satu Durable Object. Durable Object itu menyelaras pemain dalam bilik yang sama.

Fungsi ujian yang sudah disambungkan:

- pemain masuk/keluar bilik;
- jumlah pemain dalam talian;
- posisi dan pusingan pemain;
- animasi idle, berjalan, berlari dan melompat;
- rupa Alisha/Adam dan pakaian semasa;
- chat bilik;
- World Boss dan Festival komuniti;
- reconnect automatik jika talian terputus.

Had ujian pakej ini ialah 32 pemain bagi satu bilik.

---

## 2. Keperluan

1. Akaun Cloudflare.
2. Node.js LTS dan npm.
3. Terminal PowerShell, Command Prompt atau Terminal Linux/Zorin.
4. Sambungan Internet.

Semak Node.js:

```bash
node --version
npm --version
```

---

## 3. Cara paling mudah di Windows

1. Extract folder ZIP.
2. Buka folder `schoolyard-buddies-cloudflare-multiplayer`.
3. Klik kanan kawasan kosong dan pilih **Open in Terminal**.
4. Jalankan:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\deploy-windows.ps1
```

5. Browser akan dibuka untuk log masuk Cloudflare. Pilih akaun anda dan benarkan Wrangler.
6. Tunggu sehingga terminal memaparkan URL seperti:

```text
https://schoolyard-buddies-multiplayer-test.<subdomain-anda>.workers.dev
```

7. Buka URL itu. Game dan server multiplayer berada pada domain yang sama.

---

## 4. Cara di Linux atau Zorin OS

Buka terminal dalam folder projek:

```bash
chmod +x scripts/*.sh
./scripts/deploy-linux.sh
```

Wrangler akan memberikan pautan log masuk. Selesaikan log masuk dan kembali ke terminal sehingga deployment selesai.

---

## 5. Cara manual

Di dalam folder projek:

```bash
npm install
npx wrangler login
npm run check
npm run deploy
```

Untuk melihat log secara langsung:

```bash
npm run tail
```

---

## 6. Ujian multiplayer dengan dua pemain

1. Buka URL `workers.dev` pada Chrome atau Edge.
2. Buka URL sama pada browser kedua, Incognito, telefon atau komputer lain.
3. Pilih nama pemain berbeza.
4. Tekan **Multiplayer**.
5. Pastikan alamat server terisi secara automatik. Ia sepatutnya menggunakan domain semasa dan endpoint `/ws`.
6. Masukkan room yang sama, contohnya:

```text
schoolyard-main
```

7. Tekan **Connect** pada kedua-dua peranti.
8. Tutup panel multiplayer dan masuk ke dunia.
9. Gerakkan satu pemain. Pemain kedua sepatutnya melihat watak, pakaian, arah dan animasinya.

Untuk membuat bilik lain, gunakan nama lain seperti:

```text
test-family
class-5-a
qa-room-01
```

Pemain hanya bertemu jika menggunakan nama bilik yang sama.

---

## 7. Ujian lokal sebelum deploy

Jalankan:

```bash
npm install
npm run dev
```

Wrangler biasanya memberikan URL lokal seperti `http://localhost:8787`. Buka alamat itu pada dua tab dan sambungkan kedua-duanya ke room yang sama.

Jangan buka `public/index.html` terus melalui `file://` untuk ujian penuh. Buka melalui URL Wrangler supaya endpoint WebSocket `/ws` tersedia.

---

## 8. Semakan server

Selepas deploy, buka:

```text
https://DOMAIN-ANDA.workers.dev/health
```

Jawapan yang betul:

```json
{
  "ok": true,
  "service": "schoolyard-buddies-multiplayer"
}
```

Endpoint WebSocket ialah:

```text
wss://DOMAIN-ANDA.workers.dev/ws
```

Game akan menambah parameter room secara automatik.

---

## 9. Struktur teknikal

- Static game: Cloudflare Workers Static Assets.
- Real-time transport: WebSocket.
- Room coordination: Durable Object `GameRoom`.
- One room name = one Durable Object instance.
- Idle WebSockets use the Hibernation API.
- Shared boss/festival state is stored in Durable Object storage.

---

## 10. Perkara yang belum sesuai untuk production

Versi ini adalah untuk testing. Sebelum pelancaran awam, tambah:

- akaun pemain dan authentication;
- parent/teacher consent;
- server-side moderation lebih lengkap;
- private room codes;
- rate limits mengikut IP/account;
- database profil berpusat;
- reporting and blocking tools;
- anti-cheat validation;
- privacy policy dan data retention rules;
- Cloudflare Access untuk build QA tertutup.

