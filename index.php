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

// Fetch all poems from the database
$poems = Capsule::table('poems')->get();

// Create a map of images grouped by poem ID
$imagesByPoem = Capsule::table('images')
    ->get()
    ->groupBy('poem');
?>
<html>
    <head>
        <title>Rhino The Rhymist – easy way to learn a poem</title>
        <link rel="stylesheet" type="text/css" href="style.css">
        <script src="https://js.stripe.com/v3/"></script>
        <script src="index.js"></script>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Rhino The Rhymist</h1>
                <h2>easy way to learn a poem</h2>
            </div>
            <div class="content">
                <h3>This app lets you create a cheat sheet of initial verse words for a poem.</h3>
                <div class="poemContainer">
                    <div>
                        <label for="poem">Enter your poem here:</label>
                        <textarea id="poem" rows="10" cols="50" oninput="updateCounter()"></textarea>
                    </div>
                    
                    <div>
                        <div class="counter"><span>Total number of words: </span><span id="totalWords">0</span><br></div>
                        <div class="counter"><span>Total number of verses: </span><span id="totalVerses">0</span></div>
                    </div>
                </div>
                <div>
                    <button onclick="generateCheatSheet()">Generate a cheat sheet</button>
                    <button onclick="showStripePopup()">Generate mnemonic images ($2)</button>
                </div>
            </div>
            <div class="content cheatSheetContainer">
            </div>
        </div>

        <div class="container">
            <div class="content browse">
                <h3>See what other poems folks memorize!</h3>
                <ul>
                    <?php foreach ($poems as $poem): ?>
                        <a href="browse.php?poem_id=<?php echo $poem->id; ?>">
                            <li>
                                <p>
                                    <?php 
                                        $lines = explode("\n", $poem->content); 
                                        echo $lines[0]; 
                                        if (isset($lines[1])) {
                                            echo '<br>' . $lines[1];
                                        }
                                    ?>
                                </p>
                                <?php foreach ($imagesByPoem[$poem->id]->take(3) as $image): ?>
                                    <img src="storage/images/<?php echo $image->image_filename; ?>">
                                <?php endforeach; ?>
                            </li>
                        </a>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>

        <div id="popup-background" class="hidden"></div>
        <div id="stripe-popup" class="hidden">
            <button onclick="hideStripePopup()">Close</button>
            <div>
                <h3>Payment</h3>
                <p>Pay $2 to generate mnemonic images for your poem. No refunds are available at this point.</p>
                <div>
                    <label for="coupon">Coupon code:</label>
                    <input id="coupon" type="text">
                </div>
            </div>
            <form id="payment-form">
                <div id="payment-element"></div>
                <button id="submit">
                    <div id="spinner" class="hidden"></div>
                    <span id="button-text">Pay $2 and generate images</span>
                </button>
                <div id="payment-message" class="hidden" ></div>
            </form>
        </div>
        
    </body>
</html>