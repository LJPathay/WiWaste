<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Regenerate ARIMA demand forecasts for all active products daily (Sprint 2).
Schedule::command('forecast:generate')->dailyAt('02:00');
