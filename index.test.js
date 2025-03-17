const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const { generateCheatSheet } = require('./index');

describe('generateCheatSheet', () => {
    let dom;
    let document;

    beforeEach(() => {
        dom = new JSDOM(`
            <textarea id="poem"></textarea>
            <div id="cheatSheet"></div>
            <div class="cheatSheetContainer hidden"></div>
        `);
        document = dom.window.document;
        global.document = document;
    });

    it('should generate a cheat sheet from the poem text', () => {
        const poemText = `This is a test poem.
        It has multiple lines.
        
        And multiple stanzas.`;
        document.getElementById('poem').value = poemText;

        generateCheatSheet();

        const cheatSheet = document.getElementById('cheatSheet').innerText;
        expect(cheatSheet).to.equal('This \u00A0is\n\nAnd \u00A0multiple');
    });

    it('should make the cheat sheet container visible', () => {
        generateCheatSheet();
        const cheatSheetContainer = document.getElementsByClassName('cheatSheetContainer')[0];
        expect(cheatSheetContainer.classList.contains('hidden')).to.be.false;
    });
});
