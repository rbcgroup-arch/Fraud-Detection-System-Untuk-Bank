# Demo Script

## Urutan Presentasi 2-3 Menit

1. Buka dashboard utama.
2. Jelaskan summary cards: total transactions, suspicious transactions, high risk alerts, fraud rate.
3. Tunjukkan chart `Risk Distribution` dan `Transactions by Hour`.
4. Buka halaman `/alerts`.
5. Klik alert `high risk` milik Budi Santoso.
6. Tunjukkan `reason_summary`, `Detailed Reasons`, dan `User Behavior Baseline`.
7. Jelaskan kontras baseline user vs transaksi aneh:
   - rata-rata nominal user vs transaksi saat ini
   - jam transaksi normal vs transaksi dini hari
   - device baru / rekening tujuan baru
8. Lakukan action `Review` atau `Block`.
9. Buka halaman `/simulate`.
10. Kirim satu transaksi fraud baru.
11. Kembali ke dashboard atau `/alerts`.
12. Tunjukkan alert baru muncul di queue.
13. Jika selesai demo atau data berubah, tekan `Reset Demo` di dashboard.

## Checklist Sebelum Presentasi

- Dashboard terbuka normal dari satu URL.
- `/alerts` menampilkan 5 alert final.
- Modal detail alert menampilkan baseline user.
- Tombol `Reset Demo` bekerja.
- Simulasi transaksi masih bisa membuat alert baru.
- Setelah testing, jalankan reset lagi.

## File Cadangan

- `data/fraud-demo-final.db`
- `data/fraud-demo-clean.db`

Jangan gunakan file cadangan ini untuk testing lagi.
