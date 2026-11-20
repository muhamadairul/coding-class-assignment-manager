<?php

namespace Database\Seeders;

use App\Models\Student;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $students = [
            ['name' => 'Alya Putri Ramadhani', 'nis' => '1026001', 'class' => '10'],
            ['name' => 'Bima Sakti Pratama', 'nis' => '1026002', 'class' => '10'],
            ['name' => 'Citra Dewi Lestari', 'nis' => '1026003', 'class' => '10'],
            ['name' => 'Dimas Arya Nugroho', 'nis' => '1125001', 'class' => '11'],
            ['name' => 'Eka Salsabila', 'nis' => '1125002', 'class' => '11'],
            ['name' => 'Fajar Maulana Hakim', 'nis' => '1125003', 'class' => '11'],
        ];

        foreach ($students as $student) {
            Student::updateOrCreate(
                ['nis' => $student['nis']],
                $student
            );
        }
    }
}
