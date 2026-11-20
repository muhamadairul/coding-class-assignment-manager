<?php

namespace App\Providers;

use App\Modules\Files\Services\FileStorageService;
use App\Shared\Contracts\FileStorageInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(FileStorageInterface::class, FileStorageService::class);
    }

    public function boot(): void
    {
        //
    }
}
