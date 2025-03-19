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
        <div id="popup-background" class="hidden"></div>
        <div id="stripe-popup" class="hidden">
            <button onclick="document.getElementById('stripe-popup').classList.add('hidden'); document.getElementById('popup-background').classList.add('hidden')">Close</button>
            <div>
                <h3>Payment</h3>
                <p>Pay $2 to generate mnemonic images for your poem. No refunds are available at this point.</p>
                <div>
                    <label for="coupon">Coupon code:</label>
                    <input id="coupon" type="text">
                </div>
            </div>
            <form id="stripe-form">
                <div id="card-element"></div>
                <button type="submit">Submit Payment</button>
            </form>
        </div>
    </body>
</html>