<!doctype html>
<html lang="en">
<body>
    <p>Hello {{ $name }},</p>
    @if ($event === 'lockout')
        <p>Your WiWaste account was temporarily locked after 5 consecutive failed login attempts. Login is blocked for 15 minutes.</p>
        <p>You can try signing in again after {{ $lockedUntil }}.</p>
    @elseif ($event === 'failed_login')
        <p>An unsuccessful sign-in attempt was made for your WiWaste account.</p>
    @else
        <p>Your WiWaste account was successfully signed in.</p>
    @endif
    <p>Time: {{ $occurredAt }}</p>
    <p>IP address: {{ $ipAddress }}</p>
    <p>Device/browser: {{ $device }}</p>
    <p>If you did not initiate this activity, reset your password and contact your administrator.</p>
</body>
</html>
