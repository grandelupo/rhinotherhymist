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

    cheatSheetElement = document.getElementById('cheatSheet')
    cheatSheetElement.innerText = cheatSheet;

    cheatSheetContainer = document.getElementsByClassName('cheatSheetContainer')[0];
    // cheatSheetContainer.style.display = 'block';
    cheatSheetContainer.classList.remove('hidden');
    
}