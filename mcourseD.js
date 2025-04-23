// Theme Toggle (This will be in both files)
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
});

//  No module popup or settings logic here

// Module Popups
const modulePreviews = document.querySelectorAll('.module-preview');
const modulePopups = document.querySelectorAll('.module-popup');
const backButtons = document.querySelectorAll('.back-button');

modulePreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        const moduleNumber = preview.dataset.module;
        const popup = document.getElementById(`module-${moduleNumber}`);
        if (popup) {
            popup.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
});

backButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        const popup = button.closest('.module-popup');
        if (popup) {
            popup.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
});

// Settings Modal
const settingsIcon = document.querySelector('.settings-icon');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.querySelector('.close-settings');
const textColorPicker = document.getElementById('text-color-picker');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValue = document.getElementById('font-size-value');

settingsIcon.addEventListener('click', () => {
    settingsModal.style.display = 'block';
});

closeSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == settingsModal) {
        settingsModal.style.display = 'none';
    }
});

textColorPicker.addEventListener('input', () => {
    document.body.style.color = textColorPicker.value;
});

fontSizeSlider.addEventListener('input', () => {
    const size = fontSizeSlider.value + 'px';
    document.body.style.fontSize = size;
    fontSizeValue.textContent = size;
});

// Note-Taking
const notesTextareas = document.querySelectorAll('.note-taking textarea');
const downloadButtons = document.querySelectorAll('.download-notes');

downloadButtons.forEach(button => {
    button.addEventListener('click', () => {
        const format = button.dataset.format;
        const moduleNumber = button.closest('.module-popup').id.split('-')[1];
        const textarea = document.getElementById(`module-notes-${moduleNumber}`);
        const notes = textarea.value;

        if (notes) {
            const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `module-${moduleNumber}-notes.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert('No notes to download.');
        }
    });
});
