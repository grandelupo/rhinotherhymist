<?php

use Illuminate\Database\Capsule\Manager as Capsule;

// Include necessary dependencies
require '../vendor/autoload.php';

// Load config.php
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

// Create poems table if it doesn't exist
Capsule::schema()->create('poems', function ($table) {
    $table->increments('id');
    $table->text('content');
    $table->string('stripe_token')->nullable();
    $table->timestamps(); // Adds created_at and updated_at columns
});

// Create images table if it doesn't exist
Capsule::schema()->create('images', function ($table) {
    $table->increments('id');
    $table->unsignedInteger('poem'); // Foreign key to poems table
    $table->string('image_filename');
    $table->integer('verse_number');
    $table->integer('stanza_number');
    $table->timestamps(); // Adds created_at and updated_at columns

    $table->foreign('poem')->references('id')->on('poems')->onDelete('cascade');
});
