<?php

namespace Database\Seeders;

use App\Models\AssignmentCategory;
use Illuminate\Database\Seeder;

class AssignmentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'HTML & CSS', 'slug' => 'html-css', 'description' => 'Struktur halaman web semantik, layout Flexbox, Grid, dan desain responsif.'],
            ['name' => 'JavaScript', 'slug' => 'javascript', 'description' => 'Logika pemrograman, DOM manipulation, event handling, dan Fetch API.'],
            ['name' => 'PHP', 'slug' => 'php', 'description' => 'Pemrograman server-side dasar hingga OOP menggunakan PHP.'],
            ['name' => 'Laravel', 'slug' => 'laravel', 'description' => 'Framework backend PHP modern, routing, Eloquent ORM, dan REST API.'],
            ['name' => 'Database', 'slug' => 'database', 'description' => 'Desain relasional, ERD, SQL query, dan PostgreSQL.'],
            ['name' => 'React', 'slug' => 'react', 'description' => 'Pengembangan antarmuka berbasis komponen dan state management.'],
            ['name' => 'Next.js', 'slug' => 'nextjs', 'description' => 'Fullstack React framework dengan App Router dan TypeScript.'],
        ];

        foreach ($categories as $category) {
            AssignmentCategory::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
