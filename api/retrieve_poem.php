
<?php

use Illuminate\Database\Capsule\Manager as Capsule;


/**
 * API endpoint to retrieve a poem from the database.
 * 
 * API expects the following GET parameter:
 * - id: ID of the poem to retrieve
 * 
 * API will return a JSON response with the following structure:
 * - success: Boolean indicating the success of the operation
 * - poem: Object containing the poem details (id, content, created_at, updated_at)
 */


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
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['poem_id']) || empty($_GET['poem_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Poem ID is required.']);
        exit;
    }

    $poemId = intval($_GET['poem_id']);

    // Retrieve poem from the database
    $poem = Capsule::table('poems')->where('id', $poemId)->first();

    if (!$poem) {
        http_response_code(404);
        echo json_encode(['error' => 'Poem not found.']);
        exit;
    }

    // check if the poem has an associated image
    $imageCount = Capsule::table('images')->where('poem', $poemId)->count();

    //count how many verses are in the poem
    $verseCount = count(array_filter(explode("\n", $poem->content), function ($line) {
        return trim($line) !== '';
    }));

    echo json_encode(['success' => true, 'poem' => $poem->content, 'created_at' => $poem->created_at, 'updated_at' => $poem->updated_at, 'image_count' => $imageCount, 'total_verses' => $verseCount, 'poem_id' => $poemId]);
    exit;
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}