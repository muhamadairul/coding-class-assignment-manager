<?php

namespace App\Modules\Students\Requests;

use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IdentifyStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'nis' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9\-_.]+$/'],
            'class' => ['required', 'string', Rule::in(Student::VALID_CLASSES)],
            'confirm_existing' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nis.regex' => 'NIS hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah.',
            'class.in' => 'Kelas harus 10 atau 11.',
        ];
    }
}
