
// Generate images if redirected from payment page
const urlParams = new URLSearchParams(window.location.search);
var payment_intent_id = urlParams.get('payment_intent_id');
var poemId = urlParams.get('poem_id');
var admin_passphrase = urlParams.get('admin_passphrase');

if (poemId) {
    generateImages(admin_passphrase, payment_intent_id, poemId);
}



let stripe;

document.addEventListener('DOMContentLoaded', async function() {

    await fetchPublishableKey().then(key => {
        stripe = Stripe(key);
    }).catch(err => {
        console.error('Error fetching publishable key:', err);
    });

    const items = [
        { id: 'Generated mnemonic images for a poem', amount: 1 },
    ];

    let elements;

    initialize();

    document
        .querySelector('#payment-form')
        .addEventListener('submit', handleSubmit);

});

async function fetchPublishableKey() {
    const response = await fetch('api/config.php');
    const data = await response.json();
    return data.STRIPE_PUBLISHABLE_KEY;
}

// Fetches a payment intent and captures the client secret
async function initialize() {
    const { clientSecret } = await fetch("api/create_payment.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: null,
    }).then((r) => r.json());
  
    elements = stripe.elements({ clientSecret });
  
    const paymentElementOptions = {
      layout: "accordion",
    };
  
    const paymentElement = elements.create("payment", paymentElementOptions);
    paymentElement.mount("#payment-element");
  }

async function handleSubmit(e) {
    e.preventDefault();

    couponCode = document.getElementById('coupon').value;
    if (couponCode) {
        poemId = await retrievePoemId(document.getElementById('poem').value);
        generateImages(couponCode, null, poemId);
        hideStripePopup();
        return;
    }

    if (!checkPoemLength()) {
        alert('Your poem is too long! Please consider shortening it to 30 verses or less.');
        hideStripePopup();
        return;
    }

    setLoading(true);

    poem = document.getElementById('poem').value;
    poemId = await retrievePoemId(poem);

    const { paymentIntent, error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
            return_url: `${window.location.href}&poem_id=${poemId}`,
            redirect: 'if_required',
        }
        });

    if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
            showMessage(error.message);
        } else {
            showMessage("An unexpected error occurred.");
        }
    }

    if (paymentIntent.status === "succeeded") {
        generateImages(0, paymentIntent.id, poemId);
        hideStripePopup();
    }
    
    
    setLoading(false);

}

// ------- UI helpers -------

function showMessage(messageText) {
    const messageContainer = document.querySelector("#payment-message");
  
    messageContainer.classList.remove("hidden");
    messageContainer.textContent = messageText;
  
    setTimeout(function () {
      messageContainer.classList.add("hidden");
      messageContainer.textContent = "";
    }, 4000);
  }
  
  // Show a spinner on payment submission
  function setLoading(isLoading) {
    if (isLoading) {
      // Disable the button and show a spinner
      document.querySelector("#submit").disabled = true;
      document.querySelector("#spinner").classList.remove("hidden");
      document.querySelector("#button-text").classList.add("hidden");
    } else {
      document.querySelector("#submit").disabled = false;
      document.querySelector("#spinner").classList.add("hidden");
      document.querySelector("#button-text").classList.remove("hidden");
    }
  }

async function fetchImage(verse, stanza, verseNumber, stanzaNumber, poemId, admin_passphrase, payment_intent_id) {
    if (admin_passphrase) {
        const response = await fetch('api/request_image.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                verse: verse,
                stanza: stanza.join('\n'),
                verse_number: verseNumber,
                stanza_number: stanzaNumber,
                poem_id: poemId,
                admin_passphrase: admin_passphrase
            })
        });

        const data = await response.json();
        return data.image_path;
    }

    const response = await fetch('api/request_image.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            verse: verse,
            stanza: stanza.join('\n'),
            verse_number: verseNumber,
            stanza_number: stanzaNumber,
            poem_id: poemId,
            payment_intent_id: payment_intent_id
        })
    });

    const data = await response.json();
    return data.image_path;

}

/**
 * Processes a poem by splitting it into stanzas and lines, trimming whitespace from each.
 *
 * @param {string} poem - The poem text to process, where stanzas are separated by double newlines
 *                        and lines within stanzas are separated by single newlines.
 * @returns {string[][]} - A 2D array where each sub-array represents a stanza, and each element
 *                         within the sub-array is a trimmed line of the stanza.
 */
function processPoem(poem) {
    const stanzas = poem.trim().split('\n\n').map(stanza => stanza.trim().split('\n'));
    return stanzas.map(stanza => stanza.map(line => line.trim()));
}

/**
 * Creates and initializes a cheat sheet container element.
 * This function selects the first element with the class `cheatSheetContainer`,
 * sets its inner HTML to a heading, removes the `hidden` class, and returns the element.
 *
 * @returns {HTMLElement} The initialized cheat sheet container element.
 */
function createCheatSheetContainer() {
    const cheatSheetContainer = document.getElementsByClassName('cheatSheetContainer')[0];
    cheatSheetContainer.innerHTML = '<h3><span>Here are your mnemonic images!</span><span class="loader"></span></h3>';
    cheatSheetContainer.classList.remove('hidden');
    return cheatSheetContainer;
}

/**
 * Creates a `div` element with the class `stanza` and a predefined inner HTML content.
 * The `div` serves as a container for displaying one image per stanza.
 *
 * @returns {HTMLDivElement} The created `div` element with the class `stanza` and inner HTML content.
 */
function createStanzaImagesDiv() {
    const stanzaImagesDiv = document.createElement('div');
    stanzaImagesDiv.classList.add('stanza');
    return stanzaImagesDiv;
}

/**
 * Processes a stanza by creating and appending HTML elements for its lines and images.
 *
 * @param {string[]} stanza - An array of strings representing the lines of the stanza.
 * @param {HTMLElement} cheatSheetContainer - The container element where the stanza will be appended.
 * @param {HTMLElement} stanzaImagesDiv - The container element where the first line's image of the stanza will be appended.
 * @returns {Promise<void>} A promise that resolves when all images for the stanza have been fetched and appended.
 */
async function processStanza(stanza, stanzaNumber, poemId, cheatSheetContainer, stanzaImagesDiv, admin_passphrase, payment_intent_id) {
    if (stanza.length === 0) return;

    const stanzaDiv = document.createElement('div');
    stanzaDiv.classList.add('stanza');
    cheatSheetContainer.appendChild(stanzaDiv);

    let firstLineImageAdded = false;

    for (i=0; i<stanza.length; i++) {
        const line = stanza[i];
        if (line.length === 0) continue;

        const lineDiv = document.createElement('div');
        lineDiv.classList.add('verse');
        stanzaDiv.appendChild(lineDiv);

        let firstWord = line.split(' ')[0];
        if (firstWord.length <= 3) {
            firstWord = line.split(' ').slice(0, 2).join(' ');
        }
        const caption = document.createElement('div');
        caption.classList.add('verse-caption');
        caption.innerText = firstWord;
        lineDiv.appendChild(caption);

        const lineImageUrl = await fetchImage(line, stanza, i, stanzaNumber, poemId, admin_passphrase, payment_intent_id);

        const lineImage = document.createElement('img');
        lineImage.src = lineImageUrl;
        lineImage.alt = 'Obrazek Wersu';
        lineImage.classList.add('verse-image');
        lineDiv.appendChild(lineImage);

        if (!firstLineImageAdded) {
            const stanzaImage = document.createElement('img');
            stanzaImage.src = lineImageUrl;
            stanzaImage.alt = 'Obrazek Pierwszego Wersu Strofy';
            stanzaImage.classList.add('stanza-image');
            stanzaImagesDiv.appendChild(stanzaImage);
            firstLineImageAdded = true;
        }
    }
}

/**
 * Asynchronously generates images based on the content of a poem provided in the input field.
 * Processes the poem into stanzas, creates a cheat sheet container, and appends stanza images.
 *
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when all stanza images are processed and appended.
 */
async function generateImages(admin_passphrase = null, payment_intent_id = null, poemId) {
    const poem = await retrievePoem(poemId);
    const processedStanzas = processPoem(poem.poem);

    const cheatSheetContainer = createCheatSheetContainer();
    const stanzaImagesLabel = document.createElement('h4');
    stanzaImagesLabel.innerHTML = '<h3>One image per stanza, for your convenience ;) :</h3>';
    const stanzaImagesDiv = createStanzaImagesDiv();

    const linkToPoem = document.createElement('a');
    linkToPoem.href = `browse.php?poem_id=${poemId}`;
    linkToPoem.innerText = 'Link to your poem';
    cheatSheetContainer.appendChild(linkToPoem);


    for (let i = 0; i < processedStanzas.length; i++) {
        const stanza = processedStanzas[i];
        try {
            await processStanza(stanza, i, poemId, cheatSheetContainer, stanzaImagesDiv, admin_passphrase, payment_intent_id);
        } catch (error) {
            console.error(`Error processing stanza ${i}:`, error);
        }
    }

    cheatSheetContainer.appendChild(stanzaImagesLabel);
    cheatSheetContainer.appendChild(stanzaImagesDiv);

    removeLoader();
}

async function retrievePoem(poemId) {
    const response = await fetch(`api/retrieve_poem.php?poem_id=${poemId}`);
    const data = await response.json();

    if (data.error) {
        return null;
    }

    if (data.image_count >= data.total_verses) {
        return null;
    }

    document.getElementById('poem').value = data.poem;
    updateCounter();

    return data;
}

function removeLoader() {
    const loader = document.getElementsByClassName('loader')[0];
    loader.innerHTML = '';
    loader.classList.remove('loader');
}

async function retrievePoemId(poem) {
    response = await fetch('api/upload_poem.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content: poem
        })
    });

    const data = await response.json();
    return data.poem_id;
}

/**
 * Generates a cheat sheet from the text content of a textarea with the id 'poem'.
 * The cheat sheet is created by processing the poem into stanzas and lines,
 * then extracting the first word or first two words (if the first word is 3 characters or less)
 * from each line. The resulting cheat sheet is displayed in an element with the id 'cheatSheet'.
 * The container of the cheat sheet is then made visible by removing the 'hidden' class.
 *
 * Steps:
 * 1. Retrieve the poem text from the textarea with id 'poem'.
 * 2. Split the poem into stanzas and lines, trimming any extra whitespace.
 * 3. Filter out any empty stanzas and lines.
 * 4. For each line, extract the first word or the first two words if the first word is 3 characters or less.
 * 5. Join the processed lines and stanzas back together.
 * 6. Display the resulting cheat sheet in the element with id 'cheatSheet'.
 * 7. Make the cheat sheet container visible by removing the 'hidden' class.
 */
function generateCheatSheet() {

    const poem = document.getElementById('poem').value;
    stanzas = poem.trim().split('\n\n').map(stanza => stanza.trim().split('\n'));
    stanzas = stanzas.map(stanza => stanza.map(line => line.trim()));
    const cheatSheet = stanzas.filter((stanza) => {
        return stanza.length > 0;
    }).map((stanza) => {
        return stanza.filter((line) => {
            return line.length > 0;
        }).map((line) => {
            word = line.split(' ')[0];
            if (word.length <= 3) {
                return line.split(' ').slice(0, 2).join(' ');
            } else {
                return line.split(' ')[0];
            }
        }).join(' \u00A0');
    }).join('\n\n');

    var cheatSheetContainer = document.getElementsByClassName('cheatSheetContainer')[0];

    cheatSheetContainer.innerHTML = '<h3>Here\'s your poem\'s cheat sheet!</h3>';
    cheatSheetContainer.innerHTML += `<p id="cheatSheet">${cheatSheet}</p>`;

    // cheatSheetContainer.style.display = 'block';
    cheatSheetContainer.classList.remove('hidden');
    
}

/**
 * Updates the word and verse counters based on the content of a textarea with the ID 'poem'.
 * 
 * This function calculates the total number of words and verses in the poem text.
 * It then updates the inner text of the elements with IDs 'totalWords' and 'totalVerses'
 * to display the respective counts.
 * 
 * Words are determined by splitting the text on spaces and filtering out empty strings.
 * Verses are determined by splitting the text on newline characters and filtering out empty strings.
 */
function updateCounter() {
    const poem = document.getElementById('poem').value;

    const totalWords = poem.split(' ').filter(word => word.length > 0).length;
    wordsCounter = document.getElementById('totalWords');
    wordsCounter.innerText = totalWords;

    const totalVerses = poem.split('\n').filter(verse => verse.length > 0).length;
    versesCounter = document.getElementById('totalVerses');
    versesCounter.innerText = totalVerses;
}

function checkPoemLength() {
    const poem = document.getElementById('poem').value;
    const totalVerses = poem.split('\n').filter(verse => verse.length > 0).length;
    const totalStanzas = poem.split('\n\n').filter(stanza => stanza.length > 0).length;

    return (totalVerses <= 30);
}

function showStripePopup() {
    // first check if the poem has been entered
    const poem = document.getElementById('poem').value;
    if (poem.length === 0) {
        alert('Please enter a poem before proceeding to payment.');
        return;
    }


    const popupContainer = document.getElementById('stripe-popup');
    popupContainer.classList.remove('hidden');

    const popupBackground = document.getElementById('popup-background');
    popupBackground.classList.remove('hidden');
    popupBackground.onclick = () => {
        hideStripePopup();
    };
}

function hideStripePopup() {
    const popupContainer = document.getElementById('stripe-popup');
    popupContainer.classList.add('hidden');

    const popupBackground = document.getElementById('popup-background');
    popupBackground.classList.add('hidden');
}