async function fetchImage(verse, stanza, verseNumber, stanzaNumber, poemId, admin_passphrase, stripe_session_id) {
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
            stripe_session_id: stripe_session_id
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
    cheatSheetContainer.innerHTML = '<h3>Here are your mnemonic images!<span class="loader"></span></h3>';
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
async function processStanza(stanza, stanzaNumber, poemId, cheatSheetContainer, stanzaImagesDiv, admin_passphrase, stripe_session_id) {
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

        const lineImageUrl = await fetchImage(line, stanza, i, stanzaNumber, poemId, admin_passphrase, stripe_session_id);

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
async function generateImages(admin_passphrase = null, stripe_session_id = null) {
    const poem = document.getElementById('poem').value;
    const processedStanzas = processPoem(poem);

    const cheatSheetContainer = createCheatSheetContainer();
    const stanzaImagesLabel = document.createElement('h4');
    stanzaImagesLabel.innerHTML = '<h3>One image per stanza, for your convenience ;) :</h3>';
    const stanzaImagesDiv = createStanzaImagesDiv();

    const poemId = await retrievePoemId(poem);

    const linkToPoem = document.createElement('a');
    linkToPoem.href = `browse.php?poem_id=${poemId}`;
    linkToPoem.innerText = 'Link to your poem';
    cheatSheetContainer.appendChild(linkToPoem);

    for (let i = 0; i < processedStanzas.length; i++) {
        const stanza = processedStanzas[i];
        await processStanza(stanza, i, poemId, cheatSheetContainer, stanzaImagesDiv, admin_passphrase, stripe_session_id);
    }

    cheatSheetContainer.appendChild(stanzaImagesLabel);
    cheatSheetContainer.appendChild(stanzaImagesDiv);
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

function showStripePopup() {
    const stripe = Stripe('your-publishable-key-here');
    const elements = stripe.elements();
    const card = elements.create('card');

    const popupContainer = document.getElementById('stripe-popup');
    popupContainer.classList.remove('hidden');

    const popupBackground = document.getElementById('popup-background');
    popupBackground.classList.remove('hidden');
    popupBackground.onclick = () => {
        popupContainer.classList.add('hidden');
        popupBackground.classList.add('hidden');
    };

    const form = document.getElementById('stripe-form');
    form.onsubmit = async (e) => {
        e.preventDefault();

        couponCode = document.getElementById('coupon').value;
        if (couponCode) {
            generateImages(couponCode, null);
            popupContainer.classList.add('hidden');
            popupBackground.classList.add('hidden');
            return;
        }

        const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: 'card',
            card: card,
        });

        if (error) {
            alert(error.message);
        } else {
            alert('Payment processed successfully!');
            popupContainer.classList.add('hidden');
            popupBackground.classList.add('hidden');
            generateImages(null, paymentMethod.id);
        }
    };

    card.mount('#card-element');
}