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