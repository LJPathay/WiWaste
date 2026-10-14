<!doctype html>
<html lang="en">
<body>
    <p>Hello {{ $name }},</p>
    <p>Your WiWaste password reset code is <strong>{{ $code }}</strong>.</p>
    <p>This code expires in {{ $expiresInMinutes }} minutes and can only be used once. Do not share it with anyone.</p>
    <p>If you did not request a password reset, you can ignore this email.</p>
</body>
</html>
