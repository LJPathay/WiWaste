<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\WarmAnalyticsCache;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Regenerate ARIMA demand forecasts for all active products daily (Sprint 2).
Schedule::command('forecast:generate')->dailyAt('02:00');

// Keep the analytics aggregates warm on the queue rather than inside the request
// that happens to be first to open a dashboard after a quiet hour.
Schedule::job(new WarmAnalyticsCache)->hourly()->withoutOverlapping();
