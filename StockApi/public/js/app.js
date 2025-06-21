document.addEventListener('DOMContentLoaded', () => {
  M.Tabs.init(document.querySelector('.tabs'));

  const fetchStocks = async () => {
    try {
      const response = await fetch('/api/stocks');
      const { success, data, lastUpdated } = await response.json();
      if (!success) throw new Error(data.error);

      renderTable('seedTable', data.seeds);
      renderTable('gearTable', data.gear);
      renderTable('eggTable', data.egg);
      renderTable('honeyTable', data.honey);
      renderTable('cosmeticsTable', data.cosmetics);
      document.getElementById('lastUpdated').textContent = `Last Updated: ${new Date(lastUpdated).toLocaleString()}`;
    } catch (error) {
      M.toast({ html: `Error: ${error.message}`, classes: 'red' });
    }
  };

  const renderTable = (tableId, items) => {
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${item.availability}</td>
      `;
      tbody.appendChild(tr);
    });
  };

  const addFilter = (inputId, tableId) => {
    const input = document.getElementById(inputId);
    input.addEventListener('input', () => {
      const filter = input.value.toLowerCase();
      const rows = document.querySelectorAll(`#${tableId} tr`);
      rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        row.style.display = name.includes(filter) ? '' : 'none';
      });
    });
  };

  addFilter('seedFilter', 'seedTable');
  addFilter('gearFilter', 'gearTable');
  addFilter('eggFilter', 'eggTable');
  addFilter('honeyFilter', 'honeyTable');
  addFilter('cosmeticsFilter', 'cosmeticsTable');

  fetchStocks();
  setInterval(fetchStocks, 300000); // Refresh every 5 minutes
});
