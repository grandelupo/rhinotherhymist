<?php

/**
 * API endpoint to upload a poem to the database.
 * 
 * API expects the following POST data:
 * - verse: Text of one verse
 * - stanza: Text of the stanza
 * - poem_id: ID of the poem received from upload_poem.php
 * - verse_number: Number of the verse in the poem
 * - stanza_number: Number of the stanza in the poem
 * - stripe_session_id (optional): Stripe session ID for payment processing
 * - admin_passphrase (optional): Admin passphrase to bypass payment verification
 * 
 * API will return a JSON response with the following structure:
 * - success: Boolean indicating the success of the operation
 * - poem_id: ID of the uploaded poem
 * - image_path: Path to the generated image
 */

use Illuminate\Database\Capsule\Manager as Capsule;
use Stripe\Stripe;
use Stripe\Checkout\Session;

// Include necessary dependencies
require '../vendor/autoload.php';

// Load config.php
$config = require 'config.php';


// image limit per poem
$imageLimit = 35;
$adminImageLimit = 150;
$isAdmin = false;


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

    checkPayload($data);

    // Check for admin passphrase to bypass payment validation
    $adminPassphrase = $data['admin_passphrase'] ?? null;
    $validPassphrase = $config['ADMIN_PASSPHRASE']; // Set this in your environment variables

    if (!$adminPassphrase || strpos($adminPassphrase, $validPassphrase) !== 0) {
        // Validate Stripe payment if no valid passphrase is provided
        $pi = $data['payment_intent_id'] ?? null;
        if (!$stripeSessionId || !validateStripePayment($pi, $config)) {
            http_response_code(403);
            echo json_encode(['error' => 'Payment verification failed.']);
            exit;
        }
    } else {
        $isAdmin = true;
    }

    $verse = $data['verse'];
    $stanza = $data['stanza'];
    $verse_number = $data['verse_number'];
    $stanza_number = $data['stanza_number'];
    $poem_id = $data['poem_id'];

    // Check the number of images already generated for this poem
    $imageCount = Capsule::table('images')
        ->where('poem', $poem_id)
        ->count();


    if ($isAdmin) {
        $imageLimit = $adminImageLimit;
    }

    if ($imageCount >= $imageLimit) {
        http_response_code(400);
        echo json_encode(['error' => 'Maximum of 35 images per poem reached.']);
        exit;
    }

    // Generate image for the poem
    $generatedUrl = generateImageForVerseStanza($verse, $stanza, $config);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $generatedUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $image = curl_exec($ch);
    curl_close($ch);

    // Save the image to local storage
    $imagesDir = '../storage/images/';
    if (!file_exists($imagesDir)) {
        mkdir($imagesDir, 0777, true);
    }

    // Save file
    $image_filename = md5(basename($generatedUrl)) . '.png';
    $imagePath = $imagesDir . $image_filename;
    file_put_contents($imagePath, $image);

    // Save poem and image data to the database
    $poemId = Capsule::table('images')->insertGetId([
        'poem' => $poem_id,
        'image_filename' => basename($imagePath),
        'verse_number' => $verse_number,
        'stanza_number' => $stanza_number,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
    ]);

    echo json_encode(['success' => true, 'poem_id' => $poemId, 'image_path' => 'storage/images/' . $image_filename]);
    exit;
}

/**
 * Validates the payload data for required fields.
 *
 * This function checks if the provided data array contains the required keys
 * ('verse', 'stanza', 'poem_id', 'verse_number', 'stanza_number') and ensures
 * that their values are not empty. If any of these conditions are not met,
 * it sends a 400 HTTP response code along with a JSON-encoded error message
 * and terminates the script execution.
 *
 * @param array $data The payload data to validate.
 *
 * @return void This function does not return a value. It exits the script
 *              if validation fails.
 */
function checkPayload($data) {
    if (!isset($data['verse']) || empty($data['verse'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Verse text is required.']);
        exit;
    }

    if (!isset($data['stanza']) || empty($data['stanza'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Stanza text is required.']);
        exit;
    }

    if (!isset($data['poem_id']) || !is_numeric($data['poem_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'poem_id is required. Use API to receive poem_id.']);
        exit;
    }

    if (!isset($data['verse_number']) || !is_numeric($data['verse_number'])) {
        http_response_code(400);
        echo json_encode(['error' => 'verse_number is required and must be a valid number.']);
        exit;
    }

    if (!isset($data['stanza_number']) || !is_numeric($data['stanza_number'])) {
        http_response_code(400);
        echo json_encode(['error' => 'stanza_number is required.']);
        exit;
    }
}

/**
 * Validates the Stripe payment session ID to ensure the payment is completed.
 *
 * @param string $pi The Stripe payment intent ID to validate.
 * 
 * @return bool True if the payment is verified, false otherwise.
 */
function validateStripePayment($pi, $config) {
    $stripeApiKey = $config['STRIPE_API_KEY'];
    if (!$stripeApiKey) {
        throw new Exception('Stripe API key is not set.');
    }

    $stripe = new StripeClient($stripeApiKey);

    try {
        $paymentIntent = $stripe->paymentIntents->retrieve(
            $pi,
            []
        );
        return $paymentIntent->status === 'succeeded';
    } catch (Exception $e) {
        error_log('Stripe payment validation failed: ' . $e->getMessage());
        return false;
    }
}

/**
 * Generates an image URL for a specific verse and stanza of a poem using the DALL-E 3 model.
 *
 * This function sends a request to the OpenAI DALL-E API to generate an image based on a
 * prompt created from the provided verse and stanza. The generated image URL is returned
 * if the request is successful.
 *
 * @param string $verse The specific verse of the poem for which the image is generated.
 * @param string $stanza The stanza of the poem to provide additional context for the verse.
 * 
 * @return string The URL of the generated image.
 * 
 * @throws Exception If the OpenAI API key is not set, the API request fails, or the response is invalid.
 */
function generateImageForVerseStanza($verse, $stanza, $config)
{
    $apiUrl = 'https://api.openai.com/v1/images/generations';
    $apiKey = $config['OPENAI_API_KEY'];

    if (!$apiKey) {
        throw new Exception('OpenAI API key is not set.');
    }

    $prompt = createVerseImagePrompt($verse, $stanza, $config);

    $postData = [
        'prompt' => $prompt,
        'n' => 1,
        'size' => '1024x1024',
        'model' => 'dall-e-3',
    ];

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception('Failed to generate image: ' . $response);
    }

    $responseData = json_decode($response, true);
    if (!isset($responseData['data'][0]['url'])) {
        throw new Exception('Invalid response from DALL-E API.');
    }

    return $responseData['data'][0]['url'];
}

/**
 * Generates a detailed and vivid image prompt for a given verse and stanza of a poem.
 *
 * This function interacts with the OpenAI ChatGPT API to create a prompt suitable
 * for generating realistic and visually striking images using the DALL-E 3 model.
 * The prompt is based on the provided verse and stanza, ensuring alignment with
 * the poetic context.
 *
 * @param string $verse The specific verse of the poem for which the image prompt is generated.
 * @param string $stanza The stanza of the poem to provide additional context for the verse.
 * 
 * @return string The generated image prompt from the ChatGPT API.
 * 
 * @throws Exception If the OpenAI API key is not set, the API request fails, or the response is invalid.
 */
function createVerseImagePrompt($verse, $stanza, $config) {
    $chatGptApiUrl = 'https://api.openai.com/v1/chat/completions';
    $apiKey = $config['OPENAI_API_KEY'];

    if (!$apiKey) {
        throw new Exception('OpenAI API key is not set.');
    }

    $messages = [
        [
            'role' => 'system',
            'content' => 'You are a helpful assistant that generates prompts for creating images based on poetry. You only need to provide the prompt for dall-e-3 model. Do not include any additional text or instructions in your response.',
        ],
        [
            'role' => 'user',
            'content' => "Create a detailed and vivid image prompt for the following verse of a poem: \"$verse\". Ensure the prompt aligns with the stanza:\n\"$stanza\"\n\n The image should be realistic, visually striking, and directly related to the verse. Avoid including any text in the image.",
        ],
    ];

    $postData = [
        'model' => 'gpt-4',
        'messages' => $messages,
        'temperature' => 0.7,
    ];

    $ch = curl_init($chatGptApiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception('Failed to get prompt from ChatGPT: ' . $response);
    }

    $responseData = json_decode($response, true);
    if (!isset($responseData['choices'][0]['message']['content'])) {
        throw new Exception('Invalid response from ChatGPT API.');
    }

    return $responseData['choices'][0]['message']['content'];
}