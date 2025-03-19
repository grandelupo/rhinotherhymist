<?php

/**
 * API endpoint to upload a poem to the database.
 * 
 * API expects the following POST data:
 * - content: Content of the poem
 * - stripe_session_id (optional): Stripe session ID for payment processing
 * 
 * API will return a JSON response with the following structure:
 * - success: Boolean indicating the success of the operation
 * - poem_id: ID of the uploaded poem
 */

use Illuminate\Database\Capsule\Manager as Capsule;

// Include necessary dependencies
require '../vendor/autoload.php';

// Load environment variables
$config = require 'config.php';

// Initialize database connection
$capsule = new Capsule;
$capsule->addConnection([
    'driver'    => 'mysql',
    'host'      => $config['DB_HOST'],
    'database'  => $config['DB_NAME'],
    'username'  => $config['DB_USER'],
    'password'  => $config['DB_PASSWORD'],
    'charset'   => 'utf8',
    'collation' => 'utf8_unicode_ci',
    'prefix'    => '',
]);
$capsule->setAsGlobal();
$capsule->bootEloquent();

// Handle API request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['content']) || empty($data['content'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Poem content is required.']);
        exit;
    }

    $content = $data['content'];
    $stripe_session_id = $data['stripe_session_id'] ?? null;

    // Save poem to the database
    $poemId = Capsule::table('poems')->insertGetId([
        'content' => $content,
        'stripe_token' => $stripe_session_id,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
    ]);

    echo json_encode(['success' => true, 'poem_id' => $poemId]);
    exit;
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}