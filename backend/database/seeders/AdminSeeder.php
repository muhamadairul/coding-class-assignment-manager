<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_DEFAULT_EMAIL', 'admin@codingclass.local');
        $name = env('ADMIN_DEFAULT_NAME', 'Guru Coding');
        $password = env('ADMIN_DEFAULT_PASSWORD', 'AdminCoding123!');

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
            ]
        );
    }
}
