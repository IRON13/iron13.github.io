const newsPanel = document.querySelector('.news-panel');
const newsToggle = newsPanel?.querySelector('.news-toggle');
if (newsToggle) {
    newsToggle.hidden = newsPanel.querySelectorAll('.news-list > li').length <= 5;
    newsToggle.addEventListener('click', () => {
        const expanded = newsPanel.classList.toggle('expanded');
        newsToggle.setAttribute('aria-expanded', String(expanded));
        const label = expanded ? 'Show fewer news items' : 'Show more news';
        newsToggle.setAttribute('aria-label', label);
        newsToggle.title = label;
        newsToggle.querySelector('.news-toggle-label').textContent = expanded ? 'Show less' : 'Earlier news';
    });
}
