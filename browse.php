<?php


use Illuminate\Database\Capsule\Manager as Capsule;

// Include necessary dependencies
require 'vendor/autoload.php';

// Load environment variables
$config = require 'api/config.php';

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

// Get poem_id attribute
$poem_id = $_GET['poem_id'];

if (!isset($poem_id) || empty($poem_id)) {
    // Redirect to the home page
    header('Location: index.php');
}

// Fetch the poem from the database
$poem = Capsule::table('poems')->where('id', $poem_id)->first();

if (!$poem) {
    // Redirect to the home page
    header('Location: index.php');
}

$poemVerses = array_values(array_map(function($verse) {
    $words = explode(' ', $verse);
    if (strlen($words[0]) > 3) {
        return $words[0];
    } else {
        return implode(' ', array_slice($words, 0, 2));
    }
}, array_filter(explode("\n", $poem->content), function ($line) {
    return trim($line) !== '';
})));

// Fetch images from the database
$images = Capsule::table('images')->where('poem', $poem_id)->get();

// Order the images by verse number
$images = $images->sortBy('stanza_number');
$images = $images->sortBy('verse_number');

$imagesByStanzas = [];
foreach ($images as $image) {
    $imagesByStanzas[$image->stanza_number][] = $image;
}


$totalWords = str_word_count($poem->content);
$totalVerses = substr_count($poem->content, "\n") + 1;
$totalStanzas = count($imagesByStanzas);

?>

<!DOCTYPE html>
<html>
<head>
    <title>Rhino The Rhymist – Gallery</title>
    <link rel="stylesheet" type="text/css" href="style.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rhino The Rhymist</h1>
            <h2>Gallery of your mnemonic images</h2>
        </div>
        <div class="content">
            <h3>Here's your poem</h3>
            <div class="poemContainer">
                <div>
                    <p class="poem"><?php echo nl2br(htmlspecialchars($poem->content)); ?></p>
                </div>
                <div>
                    <div class="counter"><span>Total number of words: </span><span id="totalWords"><?php echo $totalWords ?></span></div>
                    <div class="counter"><span>Total number of verses: </span><span id="totalVerses"><?php echo $totalVerses ?></span></div>
                    <div class="counter"><span>Total number of stanzas: </span><span id="totalStanzas"><?php echo $totalStanzas ?></span></div>
                </div>
            </div>
        </div>
        <div class="content">
            <h3>Browse the mnemonic images generated for your poem:</h3>
            <div class="gallery">
                <?php if ($images->isEmpty()) { ?>
                    <p>No images found in the database.</p>
                <?php } else { 
                    $counter = 0 ?>
                    <?php foreach ($imagesByStanzas as $stanza) { ?>
                        <div class="stanza">
                            <?php foreach ($stanza as $image) { ?>
                                <div class="verse">
                                    <div class="verse-caption"><?php echo htmlspecialchars($poemVerses[$counter]); ?></div>
                                    <img class="verse-image" src="storage/images/<?php echo htmlspecialchars($image->image_filename); ?>" alt="Mnemonic Image">
                                </div>
                            <?php $counter++;
                                } ?>
                        </div>
                    <?php } ?>
                <?php } ?>
            </div>
        </div>
    </div>
</body>
</html>