<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\AssignmentCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class AssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $categories = AssignmentCategory::pluck('id', 'slug');
        $adminId = User::first()?->id;

        $assignments = [
            [
                'category_id' => $categories['html-css'] ?? null,
                'created_by' => $adminId,
                'title' => 'HTML & CSS: Membuat Halaman Profil Pribadi',
                'slug' => 'html-css-halaman-profil-pribadi',
                'description' => 'Buat halaman profil pribadi responsif menggunakan HTML5 semantik dan CSS Flexbox/Grid. Cantumkan foto, biodata singkat, minat belajar coding, dan daftar proyek impian.',
                'instructions' => "1. Gunakan struktur HTML5 semantik (header, main, section, footer).\n2. Styling menggunakan file CSS eksternal dengan layout Flexbox atau Grid.\n3. Pastikan tampilan rapi di layar desktop maupun mobile.\n4. Kumpulkan screenshot hasil tampilan (JPG/PNG) beserta file kode dalam bentuk ZIP.",
                'class_target' => '10',
                'start_date' => now()->subDays(5),
                'deadline' => now()->addDays(7),
                'status' => Assignment::STATUS_PUBLISHED,
            ],
            [
                'category_id' => $categories['javascript'] ?? null,
                'created_by' => $adminId,
                'title' => 'JavaScript Dasar: Kalkulator Nilai & Predikat',
                'slug' => 'javascript-dasar-kalkulator-nilai-predikat',
                'description' => 'Buat aplikasi web sederhana untuk menghitung rata-rata nilai tugas, UTS, dan UAS lalu menampilkan predikat (A, B, C, D) secara otomatis menggunakan JavaScript DOM.',
                'instructions' => "1. Sediakan input nilai Tugas, UTS, dan UAS (0-100).\n2. Validasi input agar tidak kosong atau di luar rentang 0-100.\n3. Tampilkan hasil rata-rata dan predikat tanpa reload halaman.\n4. Unggah screenshot hasil uji coba dan arsip ZIP proyek.",
                'class_target' => '10',
                'start_date' => now()->subDays(10),
                'deadline' => now()->subDays(2),
                'status' => Assignment::STATUS_PUBLISHED,
            ],
            [
                'category_id' => $categories['nextjs'] ?? null,
                'created_by' => $adminId,
                'title' => 'REST API & Fetch: Aplikasi Daftar Buku',
                'slug' => 'rest-api-fetch-aplikasi-daftar-buku',
                'description' => 'Bangun aplikasi frontend interaktif yang mengambil data buku dari public API menggunakan Fetch API / async-await, lengkap dengan fitur pencarian dan filter kategori.',
                'instructions' => "1. Gunakan async/await untuk mengambil data dari API.\n2. Tambahkan indikator loading dan penanganan error jika koneksi gagal.\n3. Implementasikan pencarian judul buku secara real-time.\n4. Kumpulkan dokumen penjelasan singkat (PDF) dan screenshot aplikasi.",
                'class_target' => '11',
                'start_date' => now()->subDays(4),
                'deadline' => now()->addDays(10),
                'status' => Assignment::STATUS_PUBLISHED,
            ],
            [
                'category_id' => $categories['database'] ?? null,
                'created_by' => $adminId,
                'title' => 'Algoritma & Flowchart: Sistem Antrean Kantin',
                'slug' => 'algoritma-flowchart-sistem-antrean-kantin',
                'description' => 'Rancang flowchart dan pseudocode untuk sistem antrean pemesanan makanan di kantin sekolah agar siswa tidak perlu menunggu terlalu lama saat jam istirahat.',
                'instructions' => "1. Buat flowchart menggunakan draw.io atau Figma.\n2. Tulis pseudocode yang jelas untuk alur pemesanan hingga pembayaran.\n3. Ekspor flowchart sebagai PNG/PDF dan kumpulkan bersama dokumen penjelasan.",
                'class_target' => 'all',
                'start_date' => now()->subDays(2),
                'deadline' => now()->addDays(5),
                'status' => Assignment::STATUS_PUBLISHED,
            ],
            [
                'category_id' => $categories['react'] ?? null,
                'created_by' => $adminId,
                'title' => 'Mini Project: Landing Page Ekstrakurikuler (Draft)',
                'slug' => 'mini-project-landing-page-ekstrakurikuler',
                'description' => 'Tugas proyek akhir semester membuat landing page lengkap untuk ekstrakurikuler coding sekolah.',
                'instructions' => 'Instruksi detail akan diumumkan minggu depan.',
                'class_target' => 'all',
                'start_date' => now()->addDays(7),
                'deadline' => now()->addDays(21),
                'status' => Assignment::STATUS_DRAFT,
            ],
        ];

        foreach ($assignments as $data) {
            Assignment::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }
    }
}
