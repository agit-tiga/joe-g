<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

/* ── Configuration ── */
$recipientEmail = 'agit.ba@gmail.com';
$recipientName  = 'Joe Guaraglia';
$subjectPrefix  = '[Website Anfrage]';
$maxFileSize    = 10 * 1024 * 1024; // 10 MB
$allowedTypes   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/* ── Read & sanitize fields ── */
$name  = trim($_POST['name']  ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$idea  = trim($_POST['idea']  ?? '');

/* ── Validation ── */
$errors = [];

if ($name === '') {
    $errors[] = 'Name is required.';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'A valid email address is required.';
}
if (strlen($name) > 200 || strlen($email) > 200 || strlen($phone) > 50 || strlen($idea) > 5000) {
    $errors[] = 'One or more fields exceed the maximum length.';
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['error' => implode(' ', $errors)]);
    exit;
}

/* ── Build email ── */
$boundary = '----=_Part_' . md5(uniqid(microtime(), true));

$headers  = "From: Joe Guaraglia Website <noreply@joegtattoo.com>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

$subject = "{$subjectPrefix} {$name}";

/* ── HTML body ── */
$safeName  = htmlspecialchars($name,  ENT_QUOTES, 'UTF-8');
$safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safePhone = htmlspecialchars($phone ?: '—', ENT_QUOTES, 'UTF-8');
$safeIdea  = htmlspecialchars($idea  ?: '—', ENT_QUOTES, 'UTF-8');

$html = <<<HTML
<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px; color: #2c3e50;">
  <h2 style="margin-bottom: 5px;">New Tattoo Request</h2>

  <table role="presentation" style="border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px 15px 8px 0; font-weight: bold;">Name:</td>
      <td style="padding: 8px 0;">{$safeName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 15px 8px 0; font-weight: bold;">Email:</td>
      <td style="padding: 8px 0;">{$safeEmail}</td>
    </tr>
    <tr>
      <td style="padding: 8px 15px 8px 0; font-weight: bold;">Phone:</td>
      <td style="padding: 8px 0;">{$safePhone}</td>
    </tr>
  </table>

  <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
    <strong>Tattoo Idea:</strong>
    <p style="margin-top: 8px; white-space: pre-wrap;">{$safeIdea}</p>
  </div>
</div>
HTML;

$body  = "--{$boundary}\r\n";
$body .= "Content-Type: text/html; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$body .= $html . "\r\n";

/* ── Attachments ── */
if (!empty($_FILES['files']['name'][0])) {
    $fileCount = count($_FILES['files']['name']);

    for ($i = 0; $i < $fileCount; $i++) {
        if ($_FILES['files']['error'][$i] !== UPLOAD_ERR_OK) continue;
        if ($_FILES['files']['size'][$i] > $maxFileSize) continue;

        $mimeType = mime_content_type($_FILES['files']['tmp_name'][$i]);
        if (!in_array($mimeType, $allowedTypes, true)) continue;

        $fileName    = basename($_FILES['files']['name'][$i]);
        $fileContent = file_get_contents($_FILES['files']['tmp_name'][$i]);
        $encoded     = chunk_split(base64_encode($fileContent));

        $body .= "\r\n--{$boundary}\r\n";
        $body .= "Content-Type: {$mimeType}; name=\"{$fileName}\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= "Content-Disposition: attachment; filename=\"{$fileName}\"\r\n\r\n";
        $body .= $encoded;
    }
}

$body .= "\r\n--{$boundary}--\r\n";

/* ── Send ── */
$sent = mail($recipientEmail, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email. Please try again later.']);
}
