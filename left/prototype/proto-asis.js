// Prototype behaviour for the as-is copy of the Vet.AF visit screen.
// Replaces Vet.AF's own JS only where needed to click through: tabs, "Добавить диагноз" dialog.
(function () {
  const TABS = ['inspections', 'recommendations', 'items', 'documents', 'analyzes', 'hospital'];
  function showTab(id) {
    document.querySelectorAll('header.header-sticky nav a[data-id]').forEach(a => {
      if (a.dataset.id === id) a.dataset.status = 'active'; else a.removeAttribute('data-status');
    });
    document.querySelectorAll('[data-id]').forEach(el => {
      if (el.tagName === 'A' || !TABS.includes(el.dataset.id)) return;
      if (el.dataset.id === id) el.dataset.status = 'active'; else el.removeAttribute('data-status');
    });
  }
  document.addEventListener('click', e => {
    const tab = e.target.closest('header.header-sticky nav a[data-id]');
    if (tab) { e.preventDefault(); showTab(tab.dataset.id); return; }
    if (e.target.closest('button[data-url="/animals/diagnoses/create"]')) {
      e.preventDefault(); document.getElementById('proto-diag-dialog').showModal(); return;
    }
    if (e.target.closest('#proto-diag-dialog [data-action="dialog-close"]')) {
      e.preventDefault(); document.getElementById('proto-diag-dialog').close(); return;
    }
    const a = e.target.closest('a'); if (a) e.preventDefault();          // no navigation in a prototype
    const b = e.target.closest('button,[type=submit]'); if (b) e.preventDefault();
  }, true);
  document.addEventListener('submit', e => e.preventDefault(), true);
})();
